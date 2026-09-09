import uuid


def test_submit_application_requires_auth(client, sample_application_payload):
    res = client.post("/applications", json=sample_application_payload)
    assert res.status_code == 401


def test_submit_application_success(client, test_user, sample_application_payload):
    res = client.post("/applications", json=sample_application_payload, headers=test_user["headers"])
    assert res.status_code == 200
    body = res.json()
    assert body["decision"] in ("Approved", "Rejected")
    assert 0.0 <= body["prediction_score"] <= 1.0
    assert body["proof_status"] == "not_started"


def test_submit_application_missing_field_rejected(client, test_user, sample_application_payload):
    bad_payload = dict(sample_application_payload)
    del bad_payload["person_age"]
    res = client.post("/applications", json=bad_payload, headers=test_user["headers"])
    assert res.status_code == 422


def test_get_own_application(client, test_user, submitted_application):
    res = client.get(f"/applications/{submitted_application['id']}", headers=test_user["headers"])
    assert res.status_code == 200
    assert res.json()["id"] == submitted_application["id"]


def test_get_application_without_auth_rejected(client, submitted_application):
    res = client.get(f"/applications/{submitted_application['id']}")
    assert res.status_code == 401


def test_get_nonexistent_application_404(client, test_user):
    res = client.get("/applications/does-not-exist", headers=test_user["headers"])
    assert res.status_code == 404


def test_cannot_view_another_users_application(client, submitted_application):
    """Security-critical: user B must not be able to see user A's application,
    and the response should be 404 (not 403), so we don't leak which IDs exist."""
    other = client.post("/auth/signup", json={
        "email": f"other-{uuid.uuid4().hex}@example.com", "password": "testpassword123"
    })
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    res = client.get(f"/applications/{submitted_application['id']}", headers=other_headers)
    assert res.status_code == 404


def test_list_applications_scoped_to_user(client, test_user, submitted_application):
    res = client.get("/applications", headers=test_user["headers"])
    assert res.status_code == 200
    ids = [a["id"] for a in res.json()]
    assert submitted_application["id"] in ids


def test_list_applications_does_not_leak_other_users(client, sample_application_payload):
    user_a = client.post("/auth/signup", json={
        "email": f"a-{uuid.uuid4().hex}@example.com", "password": "testpassword123"
    })
    headers_a = {"Authorization": f"Bearer {user_a.json()['access_token']}"}
    client.post("/applications", json=sample_application_payload, headers=headers_a)

    user_b = client.post("/auth/signup", json={
        "email": f"b-{uuid.uuid4().hex}@example.com", "password": "testpassword123"
    })
    headers_b = {"Authorization": f"Bearer {user_b.json()['access_token']}"}
    res = client.get("/applications", headers=headers_b)
    assert res.status_code == 200
    assert res.json() == []