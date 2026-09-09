import uuid


def test_generate_proof_requires_auth(client, submitted_application):
    res = client.post(f"/applications/{submitted_application['id']}/generate-proof")
    assert res.status_code == 401


def test_generate_proof_on_others_application_404(client, submitted_application):
    other = client.post("/auth/signup", json={
        "email": f"other-{uuid.uuid4().hex}@example.com", "password": "testpassword123"
    })
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    res = client.post(f"/applications/{submitted_application['id']}/generate-proof", headers=other_headers)
    assert res.status_code == 404


def test_generate_proof_fails_gracefully_without_pk_key(client, test_user, submitted_application, monkeypatch):
    """Forces the pk.key path to a nonexistent file, rather than relying on
    it genuinely being absent — that varies between CI (never has it) and a
    developer's machine (may have generated it for real proof testing).
    This keeps the test deterministic everywhere, and avoids ever actually
    invoking ezkl.prove() in tests — a real proving call from a FastAPI
    background thread has been observed to panic the underlying Rust
    runtime (pyo3_runtime.PanicException), which is a separate, unrelated
    issue this test isn't meant to exercise."""
    from app import proof_pipeline
    monkeypatch.setattr(proof_pipeline, "PK_PATH", "/nonexistent/pk.key")

    res = client.post(
        f"/applications/{submitted_application['id']}/generate-proof",
        headers=test_user["headers"],
    )
    assert res.status_code == 500
    assert "pk.key" in res.json()["detail"]


def test_tamper_demo_requires_auth(client, submitted_application):
    res = client.post(f"/applications/{submitted_application['id']}/tamper-demo")
    assert res.status_code == 401


def test_tamper_demo_requires_proof_generated_first(client, test_user, submitted_application):
    res = client.post(
        f"/applications/{submitted_application['id']}/tamper-demo",
        headers=test_user["headers"],
    )
    assert res.status_code == 400