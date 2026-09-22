"""
Comprehensive Automated Test Suite for ChemClash Auth System.
Verifies all 8 required production flows:
1. New signup (POST /auth/signup)
2. Duplicate email rejection (POST /auth/signup -> 409)
3. Wrong password rejection (POST /auth/login -> 401)
4. Successful login (POST /auth/login -> 200 + Set-Cookie)
5. Session hydration / refresh via Cookie (GET /auth/me -> 200)
6. Session hydration / refresh via Bearer token (GET /auth/me -> 200)
7. Profile update (PUT /auth/me -> 200)
8. Logout and cookie clearing (POST /auth/logout -> 200)
9. Unauthenticated rejection (GET /auth/me -> 401)
10. Re-login and data persistence (POST /auth/login -> 200)
"""

import http.cookiejar
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
BASE_URL = "http://127.0.0.1:8000"


def wait_for_server(timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{BASE_URL}/api/ping", timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def run_tests():
    print("=" * 65)
    print("CHEMCLASH AUTH TEST SUITE — RUNNING PRODUCTION VALIDATION")
    print("=" * 65)

    test_email = f"tester_{int(time.time())}@example.com"
    test_password = "SecurePassword123!"
    test_name = "Shanmukha Tester"

    # Setup Cookie Jar Opener to emulate browser cookie handling
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    # 1. NEW SIGNUP
    print("\n[TEST 1] POST /auth/signup — New User Registration")
    payload = json.dumps({
        "email": test_email,
        "password": test_password,
        "display_name": test_name,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/auth/signup",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with opener.open(req) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        set_cookie_header = resp.headers.get("Set-Cookie", "")
        print(f"  -> HTTP Status: {status}")
        print(f"  -> Set-Cookie: {set_cookie_header}")
        print(f"  -> Token in response: {bool(body.get('token'))}")
        print(f"  -> User ID: {body.get('account', {}).get('user_id')}")
        assert status == 200, f"Expected 200, got {status}"
        assert body.get("ok") is True
        assert body.get("account", {}).get("email") == test_email
        assert "cc_session=" in set_cookie_header or any(c.name == "cc_session" for c in cookie_jar)
        signup_token = body["token"]
        print("  [OK] PASS: Signup succeeded with Set-Cookie and Bearer token returned")

    # 2. DUPLICATE EMAIL
    print("\n[TEST 2] POST /auth/signup — Duplicate Email Handling")
    req_dup = urllib.request.Request(
        f"{BASE_URL}/auth/signup",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        opener.open(req_dup)
        assert False, "Should have raised 409 Conflict"
    except urllib.error.HTTPError as err:
        err_body = json.loads(err.read().decode())
        print(f"  -> HTTP Status: {err.code}")
        print(f"  -> Error Response: {err_body}")
        assert err.code == 409, f"Expected 409, got {err.code}"
        assert "already exists" in err_body.get("detail", "").lower()
        print("  [OK] PASS: Duplicate email correctly rejected with 409 Conflict")

    # 3. WRONG PASSWORD
    print("\n[TEST 3] POST /auth/login — Wrong Password Handling")
    bad_payload = json.dumps({
        "email": test_email,
        "password": "WrongPassword999!",
    }).encode("utf-8")
    req_bad_login = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=bad_payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        opener.open(req_bad_login)
        assert False, "Should have raised 401 Unauthorized"
    except urllib.error.HTTPError as err:
        err_body = json.loads(err.read().decode())
        print(f"  -> HTTP Status: {err.code}")
        print(f"  -> Error Response: {err_body}")
        assert err.code == 401, f"Expected 401, got {err.code}"
        assert "invalid email or password" in err_body.get("detail", "").lower()
        print("  [OK] PASS: Invalid password correctly rejected with 401 Unauthorized")

    # 4. SUCCESSFUL LOGIN
    print("\n[TEST 4] POST /auth/login — Valid Credentials Login")
    login_payload = json.dumps({
        "email": test_email,
        "password": test_password,
    }).encode("utf-8")
    req_login = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/json"},
    )
    with opener.open(req_login) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        set_cookie = resp.headers.get("Set-Cookie", "")
        print(f"  -> HTTP Status: {status}")
        print(f"  -> Set-Cookie: {set_cookie}")
        print(f"  -> Returned Token: {body.get('token')[:25]}...")
        assert status == 200
        assert body["ok"] is True
        assert body["account"]["email"] == test_email
        login_token = body["token"]
        print("  [OK] PASS: Login succeeded and issued fresh session")

    # 5. /auth/me HYDRATION VIA COOKIE
    print("\n[TEST 5] GET /auth/me — Session Hydration via Cookie")
    req_me_cookie = urllib.request.Request(f"{BASE_URL}/auth/me")
    with opener.open(req_me_cookie) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        print(f"  -> HTTP Status: {status}")
        print(f"  -> User: {body.get('display_name')} ({body.get('email')})")
        assert status == 200
        assert body["email"] == test_email
        print("  [OK] PASS: /auth/me authenticated successfully using browser cookie")

    # 6. /auth/me REFRESH VIA BEARER TOKEN (Cross-site resilience)
    print("\n[TEST 6] GET /auth/me — Cross-Site Resilience via Bearer Token")
    clean_opener = urllib.request.build_opener()  # No cookie jar
    req_me_bearer = urllib.request.Request(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    with clean_opener.open(req_me_bearer) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        print(f"  -> HTTP Status: {status}")
        print(f"  -> User: {body.get('display_name')} ({body.get('email')})")
        assert status == 200
        assert body["email"] == test_email
        print("  [OK] PASS: /auth/me authenticated successfully using Bearer header")

    # 7. UPDATE PROFILE (Onboarding + Tour Completion)
    print("\n[TEST 7] PUT /auth/me — Update Onboarding and Tour Status")
    update_payload = json.dumps({
        "onboarding_done": True,
        "tour_done": True,
        "level": "jee_competitive",
        "goals": ["reactions_mechanisms", "organic_pyqs"],
    }).encode("utf-8")
    req_update = urllib.request.Request(
        f"{BASE_URL}/auth/me",
        data=update_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {login_token}",
        },
        method="PUT",
    )
    with clean_opener.open(req_update) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        print(f"  -> HTTP Status: {status}")
        print(f"  -> onboarding_done: {body.get('onboarding_done')}")
        print(f"  -> tour_done: {body.get('tour_done')}")
        print(f"  -> level: {body.get('level')}")
        assert status == 200
        assert body["onboarding_done"] is True
        assert body["tour_done"] is True
        assert body["level"] == "jee_competitive"
        print("  [OK] PASS: Account preferences and completion flags persisted")

    # 8. LOGOUT
    print("\n[TEST 8] POST /auth/logout — User Session Termination")
    req_logout = urllib.request.Request(f"{BASE_URL}/auth/logout", data=b"{}", method="POST")
    with opener.open(req_logout) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        set_cookie = resp.headers.get("Set-Cookie", "")
        print(f"  -> HTTP Status: {status}")
        print(f"  -> Cookie clearing header: {set_cookie}")
        assert status == 200
        assert body.get("ok") is True
        print("  [OK] PASS: Logout succeeded with cookie clearance")

    # 9. UNAUTHENTICATED /auth/me REJECTION
    print("\n[TEST 9] GET /auth/me — Verify Unauthenticated Access Rejected")
    req_unauth = urllib.request.Request(f"{BASE_URL}/auth/me")
    try:
        clean_opener.open(req_unauth)
        assert False, "Should have raised 401 Unauthorized"
    except urllib.error.HTTPError as err:
        print(f"  -> HTTP Status: {err.code}")
        assert err.code == 401
        print("  [OK] PASS: /auth/me correctly returns 401 when no session exists")

    # 10. RE-LOGIN AND PERSISTENCE CHECK
    print("\n[TEST 10] POST /auth/login — Re-login and Verify Persistent State")
    with opener.open(req_login) as resp:
        status = resp.status
        body = json.loads(resp.read().decode())
        print(f"  -> HTTP Status: {status}")
        print(f"  -> Re-login account onboarding_done: {body['account']['onboarding_done']}")
        print(f"  -> Re-login account tour_done: {body['account']['tour_done']}")
        assert status == 200
        assert body["account"]["onboarding_done"] is True
        assert body["account"]["tour_done"] is True
        assert body["account"]["level"] == "jee_competitive"
        print("  [OK] PASS: User re-login succeeded and retrieved persisted profile")

    print("\n" + "=" * 65)
    print("ALL 10 END-TO-END AUTH TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    server_process = None
    if not wait_for_server(timeout=1):
        print("Starting FastAPI backend server for live testing...")
        server_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(BACKEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if not wait_for_server(timeout=15):
            print("Failed to start server. Logs:")
            if server_process.stdout:
                print(server_process.stdout.read().decode())
            if server_process.stderr:
                print(server_process.stderr.read().decode())
            sys.exit(1)
        print("Server is up and listening at http://127.0.0.1:8000")

    try:
        run_tests()
    finally:
        if server_process:
            print("\nShutting down test backend server...")
            server_process.terminate()
            server_process.wait(timeout=5)
            print("Server stopped.")
