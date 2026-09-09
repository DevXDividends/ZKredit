def test_signup_success(client):
    import uuid
    email = f"test-{uuid.uuid4().hex}@example.com"
    res = client.post("/auth/signup", json={
        "email": email, "password": "testpassword123", "full_name": "Test User"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == email
    assert body["user"]["full_name"] == "Test User"
    assert body["user"]["auth_provider"] == "local"


def test_signup_duplicate_email_rejected(client):
    import uuid
    email = f"test-{uuid.uuid4().hex}@example.com"
    payload = {"email": email, "password": "testpassword123"}
    assert client.post("/auth/signup", json=payload).status_code == 200
    assert client.post("/auth/signup", json=payload).status_code == 409


def test_signup_password_too_short_rejected(client):
    import uuid
    email = f"test-{uuid.uuid4().hex}@example.com"
    res = client.post("/auth/signup", json={"email": email, "password": "short"})
    assert res.status_code == 422


def test_signup_invalid_email_rejected(client):
    res = client.post("/auth/signup", json={"email": "not-an-email", "password": "testpassword123"})
    assert res.status_code == 422


def test_login_success(client, test_user):
    res = client.post("/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password_rejected(client, test_user):
    res = client.post("/auth/login", json={"email": test_user["email"], "password": "wrongpassword"})
    assert res.status_code == 401


def test_login_nonexistent_user_rejected(client):
    res = client.post("/auth/login", json={"email": "doesnotexist@example.com", "password": "whatever123"})
    assert res.status_code == 401


def test_me_with_valid_token(client, test_user):
    res = client.get("/auth/me", headers=test_user["headers"])
    assert res.status_code == 200
    assert res.json()["email"] == test_user["email"]


def test_me_without_token_rejected(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_with_garbage_token_rejected(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401