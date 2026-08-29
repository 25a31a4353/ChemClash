"""
ChemClash — unified launcher
Run this single file to start both the FastAPI backend and the Next.js frontend.

    python start.py

Requirements:
  - Python 3.8+  (for the backend + this script)
  - Node.js / npm  (for the Next.js frontend)
  - Backend dependencies installed:  pip install -r backend/requirements.txt
  - Frontend dependencies installed:  cd chemclash && npm install

Press Ctrl+C to stop both servers.
"""

import subprocess
import sys
import threading
import os
import signal

# ── Colour helpers (ANSI, skipped on Windows if not supported) ────────────────
RESET  = "\033[0m"
CYAN   = "\033[36m"
YELLOW = "\033[33m"
RED    = "\033[31m"

def _supports_colour():
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

def tag(name: str, colour: str) -> str:
    if _supports_colour():
        return f"{colour}[{name}]{RESET} "
    return f"[{name}] "

# ── Stream a process's stdout/stderr to our stdout ───────────────────────────
def _pipe(stream, prefix: str):
    try:
        for line in iter(stream.readline, b""):
            sys.stdout.write(prefix + line.decode(errors="replace"))
            sys.stdout.flush()
    except ValueError:
        pass  # stream closed

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    root = os.path.dirname(os.path.abspath(__file__))
    backend_dir  = os.path.join(root, "backend")
    frontend_dir = os.path.join(root, "chemclash")

    # Detect npm / npx executable name (Windows uses npm.cmd)
    npm = "npm.cmd" if sys.platform == "win32" else "npm"

    # ── Spawn backend ─────────────────────────────────────────────────────────
    backend_cmd = [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    # ── Spawn frontend ────────────────────────────────────────────────────────
    frontend_cmd = [npm, "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=(sys.platform == "win32"),
    )

    print(tag("ChemClash", CYAN) + "Backend  → http://localhost:8000")
    print(tag("ChemClash", CYAN) + "Frontend → http://localhost:3000")
    print(tag("ChemClash", CYAN) + "Press Ctrl+C to stop both servers.\n")

    # ── Forward output in background threads ──────────────────────────────────
    be_tag = tag("backend ", YELLOW)
    fe_tag = tag("frontend", CYAN)

    threading.Thread(target=_pipe, args=(backend_proc.stdout,  be_tag), daemon=True).start()
    threading.Thread(target=_pipe, args=(frontend_proc.stdout, fe_tag), daemon=True).start()

    # ── Wait; on Ctrl+C kill both ─────────────────────────────────────────────
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


if __name__ == "__main__":
    main()
