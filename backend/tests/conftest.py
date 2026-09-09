"""
Shared pytest fixtures for the whole test suite. Sets up an isolated,
throwaway SQLite database (never touches any real dev/production DB) and
provides reusable fixtures for authenticated users and applications.
"""

import os
import tempfile
import uuid

import pytest

# --- Environment setup: MUST happen before importing app.main, since
# several modules read env vars at import time. ---
_tmp_db_path = os.path.join(tempfile.gettempdir(), f"zkredit_test_{uuid.uuid4().hex}.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db_path}"
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-not-for-production")

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sample_application_payload():
    return {
        "person_age": 28,
        "person_gender": "female",
        "person_education": "Bachelor",
        "person_income": 65000,
        "person_emp_exp": 5,
        "person_home_ownership": "RENT",
        "loan_amnt": 12000,
        "loan_intent": "MEDICAL",
        "loan_int_rate": 11.5,
        "loan_percent_income": 0.18,
        "cb_person_cred_hist_length": 6,
        "credit_score": 680,
        "previous_loan_defaults_on_file": "No",
    }


@pytest.fixture
def test_user(client):
    """Creates a fresh, uniquely-emailed user and returns its auth headers,
    email, and password — reused across most authenticated-endpoint tests."""
    email = f"test-{uuid.uuid4().hex}@example.com"
    password = "testpassword123"
    res = client.post("/auth/signup", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    data = res.json()
    return {
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "email": email,
        "password": password,
        "user": data["user"],
    }


@pytest.fixture
def submitted_application(client, test_user, sample_application_payload):
    """A real application, submitted by test_user, ready for tests that need
    an existing application to act on (proof generation, ownership checks, etc.)."""
    res = client.post("/applications", json=sample_application_payload, headers=test_user["headers"])
    assert res.status_code == 200, res.text
    return res.json()