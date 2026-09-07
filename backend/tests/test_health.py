"""
Minimal smoke tests for CI. Deliberately don't touch anything requiring
the ML model, EZKL, or a real database — those are exercised manually /
in the sandboxed dev flow. This just confirms the app boots and its most
basic routes respond, which is what CI needs to catch (import errors,
broken router wiring, etc.) on every push/PR.
"""

import os

os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-not-for-production")
# No DATABASE_URL set -> falls back to the SQLite default, which is fine for CI.

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_applications_requires_auth():
    res = client.get("/applications")
    assert res.status_code == 401


def test_signup_and_login_roundtrip():
    payload = {"email": "ci-test@example.com", "password": "testpassword123"}
    signup_res = client.post("/auth/signup", json=payload)
    assert signup_res.status_code == 200
    assert "access_token" in signup_res.json()

    login_res = client.post("/auth/login", json=payload)
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()