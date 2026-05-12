import os
import sys
import json
from urllib import request, error


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:8000")
ADMIN_EMAIL = os.environ.get("LOCAL_ADMIN_EMAIL", "admin@cloleo.com")
ADMIN_PASSWORD = os.environ.get("LOCAL_ADMIN_PASSWORD", "cloclo@2026!")


def call(method: str, path: str, token: str | None = None, payload: dict | None = None):
    url = f"{BASE_URL}{path}"
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = request.Request(url, method=method, data=data, headers=headers)
    try:
        with request.urlopen(req, timeout=12) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            return resp.status, body
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        return e.code, body
    except Exception as e:
        return -1, f"{type(e).__name__}: {e}"


def main():
    print(f"Smoke test on {BASE_URL}")
    checks = []

    status, body = call("GET", "/health")
    checks.append(("GET /health", status))

    status, body = call("GET", "/api/health")
    checks.append(("GET /api/health", status))

    status, body = call(
        "POST",
        "/api/auth/login",
        payload={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    checks.append(("POST /api/auth/login", status))
    token = None
    if status == 200:
        try:
            token = json.loads(body).get("token")
        except Exception:
            token = None

    protected = [
        "/api/admin/dashboard",
        "/api/admin/vendors",
        "/api/admin/drivers",
        "/api/admin/products",
        "/api/admin/products/pending",
        "/api/admin/transactions",
        "/api/admin/revendeurs",
        "/api/admin/dropshipping/stats",
        "/api/admin/users",
        "/api/admin/settings/vendor",
        "/api/admin/settings/delivery",
        "/api/admin/settings/platform",
        "/api/subscriptions/plans",
        "/api/subscriptions/my-subscriptions",
    ]

    for path in protected:
        status, _ = call("GET", path, token=token)
        checks.append((f"GET {path}", status))

    profile_status, _ = call("PUT", "/api/users/profile", token=token, payload={"name": "Admin Test"})
    checks.append(("PUT /api/users/profile", profile_status))

    pass_status, _ = call(
        "PUT",
        "/api/users/password",
        token=token,
        payload={"current_password": "x", "new_password": "123456"},
    )
    checks.append(("PUT /api/users/password", pass_status))

    ok = 0
    warn = 0
    for name, status in checks:
        # 2xx/4xx means route exists and server responded; 5xx/-1 means backend/runtime issue.
        state = "OK" if (200 <= status < 500) else "WARN"
        if state == "OK":
            ok += 1
        else:
            warn += 1
        print(f"[{state}] {name} -> {status}")

    print("---")
    print(f"TOTAL={len(checks)} OK={ok} WARN={warn}")
    if warn > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
