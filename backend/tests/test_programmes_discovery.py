"""Tests for Programme Discovery — Phase D P2"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestProgrammesPublicAPI:
    """Tests for GET /api/coach/public/programmes"""

    def test_programmes_no_auth_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes")
        assert r.status_code == 200

    def test_programmes_response_structure(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes")
        data = r.json()
        assert "programmes" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    def test_programmes_at_least_one_result(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes")
        data = r.json()
        assert data["total"] >= 1
        assert len(data["programmes"]) >= 1

    def test_programme_card_fields(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes")
        prog = r.json()["programmes"][0]
        assert "slug" in prog
        assert "institution_name" in prog
        assert "coach_name" in prog
        assert "division" in prog

    def test_search_by_institution(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes?search=test")
        assert r.status_code == 200
        data = r.json()
        assert "programmes" in data

    def test_search_returns_matching_results(self):
        # "test" should match "Test University"
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes?search=test")
        data = r.json()
        # All returned should match 'test' in institution, coach, or conference
        for prog in data["programmes"]:
            found = (
                "test" in (prog.get("institution_name") or "").lower()
                or "test" in (prog.get("coach_name") or "").lower()
                or "test" in (prog.get("conference") or "").lower()
            )
            assert found, f"Programme {prog['institution_name']} doesn't match search 'test'"

    def test_search_no_match_returns_empty(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes?search=zzznomatch9999")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 0

    def test_division_filter_naia(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes?division=NAIA")
        assert r.status_code == 200
        data = r.json()
        for prog in data["programmes"]:
            assert prog["division"].upper() == "NAIA"

    def test_nil_filter(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes?nil_available=true")
        assert r.status_code == 200
        data = r.json()
        for prog in data["programmes"]:
            assert prog["nil_available"] is True

    def test_pagination_defaults(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes")
        data = r.json()
        assert data["page"] == 1
        assert data["pages"] >= 1

    def test_individual_slug_still_works(self):
        # First get a slug from listing
        r = requests.get(f"{BASE_URL}/api/coach/public/programmes")
        progs = r.json()["programmes"]
        assert len(progs) >= 1
        slug = progs[0]["slug"]
        r2 = requests.get(f"{BASE_URL}/api/coach/public/{slug}")
        assert r2.status_code == 200
        detail = r2.json()
        assert "institution_name" in detail
        assert "coach_name" in detail

    def test_slug_route_not_shadowed_by_programmes_route(self):
        """Ensures /public/programmes route doesn't shadow /public/{slug}"""
        r = requests.get(f"{BASE_URL}/api/coach/public/test-university")
        # Should be 200 if test-university exists, or 404 if not — but NOT 422 (param conflict)
        assert r.status_code in [200, 404]
