"""
Tests for Gap 7 (Account Deletion endpoint) and Gap 8 (Board PDF Export)
Also includes regression tests for coach login and data-export.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASSWORD = "coach1234"


@pytest.fixture(scope="module")
def coach_token():
    res = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
        "email": COACH_EMAIL, "password": COACH_PASSWORD
    })
    assert res.status_code == 200, f"Coach login failed: {res.text}"
    token = res.json().get("token") or res.json().get("access_token")
    assert token, "No token in login response"
    return token


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}


# ── Regression: Coach Login ────────────────────────────────────────────────────

class TestRegressionCoachLogin:
    def test_coach_login_returns_200(self):
        res = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
            "email": COACH_EMAIL, "password": COACH_PASSWORD
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "token" in data or "access_token" in data, "Token missing from login response"


# ── Regression: Data Export (Gap 6) ───────────────────────────────────────────

class TestRegressionDataExport:
    def test_data_export_returns_200(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_data_export_has_content_disposition(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        cd = res.headers.get("content-disposition", "")
        assert "attachment" in cd.lower(), f"Missing attachment disposition: {cd}"


# ── Gap 7: DELETE /api/coach/auth/account ─────────────────────────────────────

class TestGap7DeleteAccountEndpoint:
    """Verify DELETE /auth/account is reachable. DO NOT actually delete the test account."""

    def test_delete_account_endpoint_exists_without_auth(self):
        """Without auth token, should return 401/403 (not 404 = endpoint exists)"""
        res = requests.delete(f"{BASE_URL}/api/coach/auth/account")
        assert res.status_code in (401, 403, 422), \
            f"Expected 401/403/422 without auth, got {res.status_code}: {res.text}"

    def test_delete_account_endpoint_reachable_with_invalid_token(self):
        """With a bad token, should return 401/403 (not 404/405/500 = endpoint exists and is wired)"""
        res = requests.delete(
            f"{BASE_URL}/api/coach/auth/account",
            headers={"Authorization": "Bearer invalid_token_xyz"}
        )
        assert res.status_code in (401, 403), \
            f"Expected 401/403, got {res.status_code}: {res.text}"


# ── Gap 8: POST /api/coach/board/export-pdf ───────────────────────────────────

class TestGap8BoardPDFExport:
    def test_export_pdf_returns_200(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/api/coach/board/export-pdf",
            headers=auth_headers,
            stream=True
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text[:500]}"

    def test_export_pdf_content_type(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/api/coach/board/export-pdf",
            headers=auth_headers
        )
        assert res.status_code == 200
        ct = res.headers.get("content-type", "")
        assert "application/pdf" in ct, f"Expected application/pdf, got: {ct}"

    def test_export_pdf_content_disposition(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/api/coach/board/export-pdf",
            headers=auth_headers
        )
        assert res.status_code == 200
        cd = res.headers.get("content-disposition", "")
        assert "attachment" in cd.lower(), f"Missing attachment disposition: {cd}"

    def test_export_pdf_valid_pdf_bytes(self, auth_headers):
        """Response body should start with %PDF (valid PDF magic bytes)"""
        res = requests.post(
            f"{BASE_URL}/api/coach/board/export-pdf",
            headers=auth_headers
        )
        assert res.status_code == 200
        assert res.content[:4] == b"%PDF", f"Response does not start with %PDF, got: {res.content[:10]}"

    def test_export_pdf_non_empty(self, auth_headers):
        """PDF should be at least 1KB"""
        res = requests.post(
            f"{BASE_URL}/api/coach/board/export-pdf",
            headers=auth_headers
        )
        assert res.status_code == 200
        size = len(res.content)
        assert size > 1024, f"PDF too small: {size} bytes (expected >1KB)"

    def test_export_pdf_unauthenticated_returns_401(self):
        res = requests.post(f"{BASE_URL}/api/coach/board/export-pdf")
        assert res.status_code in (401, 403, 422), \
            f"Expected 401/403/422, got {res.status_code}"
