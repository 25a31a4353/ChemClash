"""
ChemClash — Backend Tests
Uses FastAPI's TestClient to exercise /api/evaluate-mechanism without a real
LLM by monkey-patching llm_client.evaluate_move.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mock_llm(status: str, hint: str, explanation: str):
    """Return a callable that pretends to be evaluate_move."""
    def _inner(source: str, target: str):  # noqa: ARG001
        return {"status": status, "hint": hint, "explanation": explanation}
    return _inner


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestEvaluateMechanism:

    def test_tertiary_carbon_returns_fail(self):
        hint = "Watch out for steric hindrance!"
        explanation = (
            "SN2 reactions require a backside attack which is blocked at "
            "tertiary centres by three alkyl groups."
        )
        with patch(
            "routers.mechanism.evaluate_move",
            side_effect=_mock_llm("fail", hint, explanation),
        ):
            resp = client.post(
                "/api/evaluate-mechanism",
                json={"source": "nucleophile", "target": "tertiary_carbon"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "fail"
        assert "steric hindrance" in body["hint"].lower()
        assert body["source"] == "nucleophile"
        assert body["target"] == "tertiary_carbon"

    def test_primary_carbon_returns_pass(self):
        with patch(
            "routers.mechanism.evaluate_move",
            side_effect=_mock_llm(
                "pass",
                "Good — what orbital interaction drives this?",
                "SN2 proceeds cleanly at primary carbons.",
            ),
        ):
            resp = client.post(
                "/api/evaluate-mechanism",
                json={"source": "nucleophile", "target": "primary_carbon"},
            )

        assert resp.status_code == 200
        assert resp.json()["status"] == "pass"

    def test_secondary_carbon_returns_pass_with_warning(self):
        with patch(
            "routers.mechanism.evaluate_move",
            side_effect=_mock_llm(
                "pass",
                "Could elimination compete here?",
                "Secondary carbons can undergo both SN2 and E2.",
            ),
        ):
            resp = client.post(
                "/api/evaluate-mechanism",
                json={"source": "nucleophile", "target": "secondary_carbon"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pass"

    def test_input_is_normalised(self):
        """Whitespace and casing in the payload must be normalised before the LLM call."""
        with patch(
            "routers.mechanism.evaluate_move",
            side_effect=_mock_llm("fail", "Watch out for steric hindrance!", "..."),
        ) as mock_fn:
            client.post(
                "/api/evaluate-mechanism",
                json={"source": "  Nucleophile  ", "target": "  TERTIARY_Carbon  "},
            )

        mock_fn.assert_called_once_with(
            source="nucleophile", target="tertiary_carbon"
        )

    def test_missing_field_returns_422(self):
        resp = client.post(
            "/api/evaluate-mechanism",
            json={"source": "nucleophile"},  # 'target' missing
        )
        assert resp.status_code == 422

    def test_empty_source_returns_422(self):
        resp = client.post(
            "/api/evaluate-mechanism",
            json={"source": "", "target": "tertiary_carbon"},
        )
        assert resp.status_code == 422

    def test_llm_parse_error_returns_502(self):
        with patch(
            "routers.mechanism.evaluate_move",
            side_effect=ValueError("LLM returned non-JSON output"),
        ):
            resp = client.post(
                "/api/evaluate-mechanism",
                json={"source": "nucleophile", "target": "tertiary_carbon"},
            )

        assert resp.status_code == 502

    def test_llm_service_error_returns_503(self):
        with patch(
            "routers.mechanism.evaluate_move",
            side_effect=RuntimeError("Connection timeout"),
        ):
            resp = client.post(
                "/api/evaluate-mechanism",
                json={"source": "nucleophile", "target": "tertiary_carbon"},
            )

        assert resp.status_code == 503

    def test_health_check(self):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
