#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║                  ⚗️  ChemClash  ⚗️                          ║
║     AI-powered Gamified Organic Chemistry Platform           ║
║                                                              ║
║  USAGE:                                                      ║
║    python main.py              → start everything (default)  ║
║    python main.py --backend    → backend only                ║
║    python main.py --frontend   → frontend only               ║
║    python main.py --check      → dependency/env check only   ║
║    python main.py --help       → show this help              ║
╚══════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────

ROOT         = Path(__file__).resolve().parent
BACKEND_DIR  = ROOT / "backend"
FRONTEND_DIR = ROOT / "chemclash"
ENV_FILE     = BACKEND_DIR / ".env"
ENV_EXAMPLE  = BACKEND_DIR / ".env.example"

BACKEND_PORT  = int(os.getenv("BACKEND_PORT",  "8000"))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "3000"))

# ─────────────────────────────────────────────────────────────────────────────
# TERMINAL COLOURS  (gracefully disabled on non-TTY / Windows without VT)
# ─────────────────────────────────────────────────────────────────────────────

def _supports_colour() -> bool:
    if platform.system() == "Windows":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
            return True
        except Exception:
            return False
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


USE_COLOUR = _supports_colour()

RESET   = "\033[0m"  if USE_COLOUR else ""
BOLD    = "\033[1m"  if USE_COLOUR else ""
DIM     = "\033[2m"  if USE_COLOUR else ""
RED     = "\033[91m" if USE_COLOUR else ""
GREEN   = "\033[92m" if USE_COLOUR else ""
YELLOW  = "\033[93m" if USE_COLOUR else ""
BLUE    = "\033[94m" if USE_COLOUR else ""
MAGENTA = "\033[95m" if USE_COLOUR else ""
CYAN    = "\033[96m" if USE_COLOUR else ""
WHITE   = "\033[97m" if USE_COLOUR else ""


def c(text: str, colour: str) -> str:
    return f"{colour}{text}{RESET}"


def tag(label: str, colour: str = CYAN) -> str:
    return c(f"[{label}]", colour) + " "


# ─────────────────────────────────────────────────────────────────────────────
# BANNER
# ─────────────────────────────────────────────────────────────────────────────

def print_banner():
    banner = f"""
{MAGENTA}{BOLD}╔══════════════════════════════════════════════════════════╗
║              ⚗️   C H E M C L A S H   ⚗️                  ║
║        AI-Powered Gamified Organic Chemistry               ║
╚══════════════════════════════════════════════════════════╝{RESET}
"""
    print(banner)


# ─────────────────────────────────────────────────────────────────────────────
# STEP PRINTER HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def step(msg: str):
    print(f"  {c('>', CYAN)} {msg}")

def ok(msg: str):
    print(f"  {c('OK', GREEN)} {msg}")

def warn(msg: str):
    print(f"  {c('!!', YELLOW)} {msg}")

def fail(msg: str):
    print(f"  {c('XX', RED)} {msg}")

def info(msg: str):
    print(f"  {c('ii', BLUE)} {msg}")

def section(title: str):
    print(f"\n{BOLD}{c('-' * 58, DIM)}{RESET}")
    print(f"  {BOLD}{WHITE}{title}{RESET}")
    print(f"{BOLD}{c('-' * 58, DIM)}{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCY CHECKS
# ─────────────────────────────────────────────────────────────────────────────

def check_python_version() -> bool:
    major, minor = sys.version_info[:2]
    ver = f"{major}.{minor}"
    if major < 3 or (major == 3 and minor < 9):
        fail(f"Python {ver} detected -- ChemClash requires Python 3.9+")
        return False
    ok(f"Python {ver}")
    return True


def check_pip_packages() -> bool:
    required = ["fastapi", "uvicorn", "pydantic", "dotenv", "httpx"]
    missing = []
    for pkg in required:
        try:
            import importlib
            importlib.import_module(pkg)
        except ModuleNotFoundError:
            missing.append(pkg)

    if missing:
        fail(f"Missing Python packages: {', '.join(missing)}")
        info(f"Run:  pip install -r {BACKEND_DIR / 'requirements.txt'}")
        return False
    ok("Python packages (fastapi, uvicorn, pydantic, dotenv, httpx)")
    return True


def _npm_cmd() -> str:
    return "npm.cmd" if platform.system() == "Windows" else "npm"


def _node_cmd() -> str:
    return "node.exe" if platform.system() == "Windows" else "node"


def check_node() -> bool:
    node = shutil.which(_node_cmd())
    npm  = shutil.which(_npm_cmd())
    if not node or not npm:
        fail("Node.js / npm not found. Install from https://nodejs.org")
        return False
    try:
        ver = subprocess.check_output([node, "--version"], text=True).strip()
        ok(f"Node.js {ver}")
    except Exception:
        warn("Node.js found but version check failed")
    return True


def check_node_modules() -> bool:
    nm = FRONTEND_DIR / "node_modules"
    if not nm.exists():
        warn("node_modules not found -- installing npm dependencies ...")
        try:
            subprocess.check_call(
                [_npm_cmd(), "install"],
                cwd=str(FRONTEND_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            ok("npm install completed")
        except subprocess.CalledProcessError:
            fail("npm install failed. Check your internet connection.")
            return False
    else:
        ok("node_modules present")
    return True


def check_env_file() -> bool:
    if ENV_FILE.exists():
        ok(".env file found")
        _warn_placeholder_key()
        return True
    if ENV_EXAMPLE.exists():
        warn(".env not found -- copying from .env.example ...")
        import shutil as _shutil
        _shutil.copy(ENV_EXAMPLE, ENV_FILE)
        warn(f"Edit {ENV_FILE} and set OPENAI_API_KEY before using AI features.")
        return True
    fail(f"Neither .env nor .env.example found in {BACKEND_DIR}")
    return False


def _warn_placeholder_key():
    try:
        contents = ENV_FILE.read_text(encoding="utf-8")
        if "sk-..." in contents or "your-key-here" in contents:
            warn("OPENAI_API_KEY still has placeholder value -- AI features won't work.")
    except Exception:
        pass


def run_checks(need_frontend: bool = True) -> bool:
    section("Pre-flight Checks")
    results: list[bool] = [
        check_python_version(),
        check_pip_packages(),
        check_env_file(),
    ]
    if need_frontend:
        node_ok = check_node()
        results.append(node_ok)
        if node_ok:
            results.append(check_node_modules())

    passed = all(results)
    print()
    if passed:
        ok(f"{c('All checks passed!', GREEN + BOLD)}")
    else:
        fail(f"{c('Some checks failed. Fix the above issues and re-run.', RED)}")
    return passed


# ─────────────────────────────────────────────────────────────────────────────
# PROCESS LAUNCHERS
# ─────────────────────────────────────────────────────────────────────────────

def _pipe_output(stream, prefix: str, colour: str):
    """Forward subprocess output lines with a coloured prefix."""
    try:
        for raw in iter(stream.readline, b""):
            line = raw.decode(errors="replace").rstrip("\n")
            if line.strip():
                print(f"{c(prefix, colour)} {line}")
                sys.stdout.flush()
    except (ValueError, OSError):
        pass


def launch_backend(port: int) -> subprocess.Popen:
    """Start uvicorn (backend/main.py) as a subprocess with hot-reload."""
    cmd = [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", str(port),
        "--reload",
        "--reload-dir", str(BACKEND_DIR),
    ]
    proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    threading.Thread(
        target=_pipe_output,
        args=(proc.stdout, "[backend ]", YELLOW),
        daemon=True,
    ).start()
    return proc


def launch_frontend(port: int) -> subprocess.Popen:
    """Start the Next.js dev server (chemclash/)."""
    env = {**os.environ, "PORT": str(port)}
    proc = subprocess.Popen(
        [_npm_cmd(), "run", "dev"],
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
    )
    threading.Thread(
        target=_pipe_output,
        args=(proc.stdout, "[frontend]", CYAN),
        daemon=True,
    ).start()
    return proc


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH POLLING
# ─────────────────────────────────────────────────────────────────────────────

def _wait_for_backend(port: int, timeout: int = 40) -> bool:
    """Poll /health until the backend is responsive."""
    import urllib.request
    url = f"http://localhost:{port}/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1):
                return True
        except Exception:
            time.sleep(0.8)
    return False


def _health_monitor(port: int):
    """Background thread: warn if backend goes down after initial startup."""
    import urllib.request
    url = f"http://localhost:{port}/health"
    # Wait for first successful ping
    while True:
        try:
            with urllib.request.urlopen(url, timeout=2):
                break
        except Exception:
            time.sleep(2)

    consecutive_fails = 0
    while True:
        time.sleep(10)
        try:
            with urllib.request.urlopen(url, timeout=2):
                consecutive_fails = 0
        except Exception:
            consecutive_fails += 1
            if consecutive_fails >= 3:
                print(f"\n{tag('ChemClash', RED)}{c('Backend health check failing -- it may have crashed!', RED)}")
                consecutive_fails = 0


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP SUMMARY CARD
# ─────────────────────────────────────────────────────────────────────────────

def print_startup_card(backend: bool = True, frontend: bool = True):
    section("ChemClash is Running")
    if backend:
        print(f"  {c('Backend  API', GREEN + BOLD)}   ->  http://localhost:{BACKEND_PORT}")
        print(f"  {c('Swagger  UI ', BLUE)}   ->  http://localhost:{BACKEND_PORT}/docs")
        print(f"  {c('Health check', DIM)}   ->  http://localhost:{BACKEND_PORT}/health")
    if frontend:
        print(f"  {c('Frontend App', MAGENTA + BOLD)}   ->  http://localhost:{FRONTEND_PORT}")

    print()
    print(f"  {DIM}Press  Ctrl+C  to stop all servers.{RESET}")

    if backend:
        print()
        print(f"  {BOLD}Key API Routes:{RESET}")
        routes = [
            ("/api/adaptive/pyq/demo",  "Adaptive PYQ demo"),
            ("/api/curriculum/modules", "Curriculum modules"),
            ("/api/challenges",         "Mechanism challenges"),
            ("/api/users/profile",      "User profiles"),
        ]
        for path, desc in routes:
            print(f"    {c(path, CYAN)}  {DIM}{desc}{RESET}")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# GRACEFUL SHUTDOWN
# ─────────────────────────────────────────────────────────────────────────────

def _terminate_all(procs: list):
    for proc in procs:
        if proc is None:
            continue
        try:
            proc.terminate()
            proc.wait(timeout=6)
        except subprocess.TimeoutExpired:
            proc.kill()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# RUN MODES
# ─────────────────────────────────────────────────────────────────────────────

def mode_check():
    print_banner()
    passed = run_checks(need_frontend=True)
    sys.exit(0 if passed else 1)


def mode_backend_only():
    print_banner()
    if not run_checks(need_frontend=False):
        sys.exit(1)

    section("Starting Backend")
    step(f"Launching uvicorn on port {BACKEND_PORT} ...")
    proc = launch_backend(BACKEND_PORT)

    step("Waiting for backend health check ...")
    if _wait_for_backend(BACKEND_PORT):
        ok("Backend is up and healthy!")
    else:
        warn("Backend did not respond within timeout -- check logs above.")

    print_startup_card(backend=True, frontend=False)
    threading.Thread(target=_health_monitor, args=(BACKEND_PORT,), daemon=True).start()

    try:
        proc.wait()
    except KeyboardInterrupt:
        print(f"\n{tag('ChemClash', RED)}Shutting down ...")
        _terminate_all([proc])
        print(tag("ChemClash", RED) + "Backend stopped.")


def mode_frontend_only():
    print_banner()
    if not (check_node() and check_node_modules()):
        sys.exit(1)

    section("Starting Frontend")
    step(f"Launching Next.js on port {FRONTEND_PORT} ...")
    proc = launch_frontend(FRONTEND_PORT)
    print_startup_card(backend=False, frontend=True)

    try:
        proc.wait()
    except KeyboardInterrupt:
        print(f"\n{tag('ChemClash', RED)}Shutting down ...")
        _terminate_all([proc])
        print(tag("ChemClash", RED) + "Frontend stopped.")


def mode_full():
    print_banner()
    if not run_checks(need_frontend=True):
        sys.exit(1)

    section("Starting Services")

    step(f"Launching backend  (port {BACKEND_PORT}) ...")
    backend_proc = launch_backend(BACKEND_PORT)
    time.sleep(1)   # allow uvicorn to boot before frontend logs interleave

    step(f"Launching frontend (port {FRONTEND_PORT}) ...")
    frontend_proc = launch_frontend(FRONTEND_PORT)

    step("Waiting for backend health check ...")
    if _wait_for_backend(BACKEND_PORT, timeout=40):
        ok("Backend is ready!")
    else:
        warn("Backend health check timed out -- see logs above.")

    print_startup_card(backend=True, frontend=True)
    threading.Thread(target=_health_monitor, args=(BACKEND_PORT,), daemon=True).start()

    procs = [backend_proc, frontend_proc]
    try:
        # Block the main thread; check every second if either process died
        while all(p.poll() is None for p in procs):
            time.sleep(1)

        for name, proc in zip(["Backend", "Frontend"], procs):
            if proc.poll() is not None:
                fail(f"{name} exited unexpectedly with code {proc.returncode}.")

    except KeyboardInterrupt:
        print(f"\n{tag('ChemClash', RED)}Ctrl+C -- shutting down ...")
    finally:
        _terminate_all(procs)
        print(tag("ChemClash", RED) + "All servers stopped. Goodbye! ⚗️")


# ─────────────────────────────────────────────────────────────────────────────
# CLI ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python main.py",
        description="ChemClash -- unified launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                     start backend + frontend (default)
  python main.py --backend           backend (FastAPI/uvicorn) only
  python main.py --frontend          frontend (Next.js) only
  python main.py --check             run pre-flight checks and exit
  python main.py --backend-port 8080 --frontend-port 3001
        """,
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--backend",  action="store_true", help="Run backend only")
    group.add_argument("--frontend", action="store_true", help="Run frontend only")
    group.add_argument("--check",    action="store_true", help="Run pre-flight checks and exit")

    parser.add_argument(
        "--backend-port", type=int, default=BACKEND_PORT,
        metavar="PORT", help=f"Backend port (default: {BACKEND_PORT})",
    )
    parser.add_argument(
        "--frontend-port", type=int, default=FRONTEND_PORT,
        metavar="PORT", help=f"Frontend port (default: {FRONTEND_PORT})",
    )
    return parser.parse_args()


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def main():
    global BACKEND_PORT, FRONTEND_PORT

    args = parse_args()
    BACKEND_PORT  = args.backend_port
    FRONTEND_PORT = args.frontend_port

    if args.check:
        mode_check()
    elif args.backend:
        mode_backend_only()
    elif args.frontend:
        mode_frontend_only()
    else:
        mode_full()


if __name__ == "__main__":
    main()
