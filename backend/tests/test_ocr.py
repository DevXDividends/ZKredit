def test_ocr_generate_test_pdf_requires_auth(client):
    res = client.get("/ocr/generate-test-pdf")
    assert res.status_code == 401


def test_ocr_extract_requires_auth(client):
    res = client.post(
        "/ocr/extract-application",
        files={"file": ("test.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert res.status_code == 401


def test_generate_test_pdf_shape(client, test_user):
    res = client.get("/ocr/generate-test-pdf", headers=test_user["headers"])
    assert res.status_code == 200
    body = res.json()
    assert len(body["pdf_base64"]) > 100
    ground_truth = body["ground_truth"]
    for field in ["person_age", "person_gender", "person_education", "person_income", "loan_amnt", "credit_score"]:
        assert field in ground_truth


def test_extract_application_rejects_non_pdf(client, test_user):
    res = client.post(
        "/ocr/extract-application",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
        headers=test_user["headers"],
    )
    assert res.status_code == 400


def test_extract_application_mock_mode(client, test_user, monkeypatch):
    """Forces mock mode explicitly (rather than relying on GROQ_API_KEY being
    unset, which could vary between local/.env and CI) — confirms extraction
    returns the fixed demo values without needing a real Groq API call."""
    from app import ocr
    monkeypatch.setattr(ocr, "MOCK_MODE", True)

    fake_pdf = b"%PDF-1.4\n%%EOF"
    res = client.post(
        "/ocr/extract-application",
        files={"file": ("test.pdf", fake_pdf, "application/pdf")},
        headers=test_user["headers"],
    )
    assert res.status_code == 200
    body = res.json()
    assert body["mock"] is True
    assert body["person_income"] == 65000