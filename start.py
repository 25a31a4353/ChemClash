"""
ChemClash — unified entry point

LOCAL DEV  (both servers):
    python start.py

STREAMLIT CLOUD (backend API only):
    Streamlit Cloud runs this file with  `streamlit run start.py`.
    It detects it is running inside Streamlit and starts the FastAPI backend
    in a background thread. Node.js / npm are NOT required on the cloud host.

    The Streamlit UI then acts as a status dashboard showing the live API URL.
"""

import os
import sys
import threading

# ─────────────────────────────────────────────────────────────────────────────
# Detect whether we are being run by Streamlit (cloud or local streamlit run)
# ─────────────────────────────────────────────────────────────────────────────

def _running_in_streamlit() -> bool:
    """Return True when this script is executed by `streamlit run`."""
    try:
        from streamlit.runtime.scriptrunner import get_script_run_ctx
        return get_script_run_ctx() is not None
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI launcher  (used by both modes)
# ─────────────────────────────────────────────────────────────────────────────

def _start_backend_thread(port: int = 8000):
    """Import and run the FastAPI app inside the current process via uvicorn."""
    import sys, os
    # Make sure `backend/` is on the path so `import main` resolves correctly
    root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root, "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    import uvicorn
    from main import app  # backend/main.py

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


def _start_backend_subprocess(port: int = 8000):
    """Spawn uvicorn as a subprocess (used in local dev mode for --reload)."""
    import subprocess
    root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root, "backend")
    cmd = [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", str(port),
        "--reload",
    ]
    return subprocess.Popen(cmd, cwd=backend_dir)


# ─────────────────────────────────────────────────────────────────────────────
# STREAMLIT MODE  — runs on Streamlit Cloud / `streamlit run start.py`
# ─────────────────────────────────────────────────────────────────────────────

def streamlit_app():
    import streamlit as st

    st.set_page_config(
        page_title="ChemClash API",
        page_icon="⚗️",
        layout="centered",
    )

    # Start backend exactly once per process using st.session_state as a guard
    if "backend_started" not in st.session_state:
        t = threading.Thread(target=_start_backend_thread, args=(8000,), daemon=True)
        t.start()
        st.session_state["backend_started"] = True

    # ── Status UI ──────────────────────────────────────────────────────────────
    st.title("⚗️ ChemClash — Backend API")
    st.markdown("""
**ChemClash** is a gamified Organic Chemistry platform for JEE students.

This deployment hosts the **FastAPI backend** — the AI-powered adaptive PYQ
matchmaker, mechanism validator, curriculum tree, and user profile endpoints.

---
""")

    col1, col2 = st.columns(2)
    with col1:
        st.metric("Backend status", "🟢 Running")
        st.metric("Port", "8000")
    with col2:
        st.metric("API docs", "/docs")
        st.metric("Health", "/health")

    st.info(
        "The Next.js frontend (`chemclash/`) must be deployed separately on "
        "**Vercel** or run locally with `npm run dev`.  "
        "Set `NEXT_PUBLIC_API_URL` to this app's public URL.",
        icon="ℹ️",
    )

    st.markdown("### Quick API links")
    base = "http://localhost:8000"
    for path, desc in [
        ("/health",                          "Health check"),
        ("/docs",                            "Interactive Swagger UI"),
        ("/api/adaptive/pyq/demo",           "Demo adaptive PYQ"),
        ("/api/curriculum/modules",          "Curriculum modules"),
        ("/api/curriculum/summary",          "Curriculum summary"),
        ("/api/challenges",                  "Mechanism challenges"),
    ]:
        st.markdown(f"- [`{path}`]({base}{path}) — {desc}")


# ─────────────────────────────────────────────────────────────────────────────
# LOCAL DEV MODE  — runs both backend (subprocess) and frontend (npm)
# ─────────────────────────────────────────────────────────────────────────────

def local_dev():
    import subprocess

    RESET  = "\033[0m"
    CYAN   = "\033[36m"
    YELLOW = "\033[33m"
    RED    = "\033[31m"

    def tag(name, colour):
        if hasattr(sys.stdout, "isatty") and sys.stdout.isatty():
            return f"{colour}[{name}]{RESET} "
        return f"[{name}] "

    def _pipe(stream, prefix):
        try:
            for line in iter(stream.readline, b""):
                sys.stdout.write(prefix + line.decode(errors="replace"))
                sys.stdout.flush()
        except ValueError:
            pass

    root = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root, "chemclash")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"

    # Check npm exists before trying to spawn it
    import shutil
    if shutil.which(npm) is None:
        print(tag("ChemClash", RED) + f"npm not found ({npm}). Install Node.js or run backend only:")
        print(tag("ChemClash", RED) + "  cd backend && uvicorn main:app --reload")
        sys.exit(1)

    backend_proc  = _start_backend_subprocess(8000)
    frontend_proc = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    print(tag("ChemClash", CYAN) + "Backend  → http://localhost:8000  (API docs: /docs)")
    print(tag("ChemClash", CYAN) + "Frontend → http://localhost:3000")
    print(tag("ChemClash", CYAN) + "Press Ctrl+C to stop both.\n")

    import threading
    threading.Thread(target=_pipe, args=(backend_proc.stdout,  tag("backend ", YELLOW)), daemon=True).start()
    threading.Thread(target=_pipe, args=(frontend_proc.stdout, tag("frontend", CYAN)),   daemon=True).start()

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print(f"\n{tag('ChemClash', RED)}Shutting down…")
        for proc in (backend_proc, frontend_proc):
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
        print(tag("ChemClash", RED) + "Stopped.")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if _running_in_streamlit():
    streamlit_app()
elif __name__ == "__main__":
    local_dev()
