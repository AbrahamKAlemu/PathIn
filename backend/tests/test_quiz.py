from __future__ import annotations

from flask.testing import FlaskClient

from pathin_api import create_app
from pathin_api.career_service import CareerService, SnapshotPitRepository
from pathin_api.map_store import InMemorySavedMapStore
from pathin_api.profile_store import InMemoryCurrentProfileStore


def _client(monkeypatch) -> FlaskClient:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    service = CareerService(
        SnapshotPitRepository(),
        InMemorySavedMapStore(),
        InMemoryCurrentProfileStore(),
    )
    app = create_app(service)
    app.config.update(TESTING=True)
    return app.test_client()


def _response(
    role_id: str = "software-engineer",
    role: str = "Software Engineer",
    industry: str = "Technology",
    rating: int = 8,
):
    return {
        "role_id": role_id,
        "role": role,
        "industry": industry,
        "rating": rating,
        "skip_count": 0,
        "transcript": (
            "Mentor: How would you solve it?\n"
            "You: I would scan once and store each number in a hash set. "
            "Before returning a pair I would test duplicates, empty input, "
            "and the complexity on a very large list."
        ),
        "followups": {
            "enjoyed": "I liked comparing the simple loop with the faster set."
        },
    }


def _profile():
    return {
        "name": "Winston Iskandar",
        "headline": "CS/Math student and software founder",
        "stage": "college",
        "education": ["Computer Science and Mathematics at Stanford"],
        "experience": ["Built software products at Similate"],
        "skills": ["Python", "JavaScript", "Product development"],
        "interests": ["Technology", "AI"],
        "goals": ["Build useful software"],
        "existing_activities": ["Software startup"],
    }


def test_quiz_catalog_exposes_scenarios(monkeypatch) -> None:
    client = _client(monkeypatch)

    roles = client.get("/api/v1/quiz/roles")
    assert roles.status_code == 200
    assert len(roles.get_json()["roles"]) == 10
    assert roles.get_json()["roles"][0]["shape"]

    scenario = client.get("/api/v1/quiz/scenarios/software-engineer")
    assert scenario.status_code == 200
    payload = scenario.get_json()["scenario"]
    assert payload["role"] == "Software Engineer"
    assert len(payload["follow_ups"]) == 5

    missing = client.get("/api/v1/quiz/scenarios/not-a-role")
    assert missing.status_code == 404
    assert missing.get_json()["error"]["code"] == "SCENARIO_NOT_FOUND"


def test_quiz_analysis_uses_profile_and_returns_labeled_examples(
    monkeypatch,
) -> None:
    client = _client(monkeypatch)

    response = client.post(
        "/api/v1/quiz/suggestions",
        json={
            "profile": None,
            "user_profile": _profile(),
            "new_responses": [_response()],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["analysis_mode"] == "rules"
    assert payload["direction"]["role"] == "Software Engineer"
    assert payload["direction"]["fit_score"] >= 70
    assert payload["direction"]["strengths"][0] == (
        "choosing an efficient lookup strategy and checking edge cases"
    )
    assert payload["direction"]["readiness"] == "gain-experience"
    assert payload["profile"]["best_fit"]["role_id"] == "software-engineer"
    assert payload["profile"]["roles_explored"][0]["sessions_seen"] == 1
    assert all(action["prototype"] for action in payload["actions"])
    assert all(action["verification"] for action in payload["actions"])
    assert payload["actions"][0]["type"] == "project"


def test_quiz_profile_accumulates_multiple_scenarios(monkeypatch) -> None:
    client = _client(monkeypatch)
    first = client.post(
        "/api/v1/quiz/suggestions",
        json={
            "profile": None,
            "user_profile": _profile(),
            "new_responses": [_response()],
        },
    ).get_json()
    second_response = _response(
        role_id="product-manager",
        role="Product Manager",
        rating=6,
    )
    second_response["transcript"] = (
        "Mentor: Which item comes first?\n"
        "You: I would prioritize the crash because severity and customer "
        "impact are already measurable. I would define a success metric and "
        "tell Sales what evidence could change that priority."
    )

    second = client.post(
        "/api/v1/quiz/suggestions",
        json={
            "profile": first["profile"],
            "user_profile": _profile(),
            "new_responses": [second_response],
        },
    )

    assert second.status_code == 200
    profile = second.get_json()["profile"]
    assert {role["role_id"] for role in profile["roles_explored"]} == {
        "software-engineer",
        "product-manager",
    }
    assert profile["best_fit"]["role_id"] == "software-engineer"


def test_quiz_rejects_missing_responses(monkeypatch) -> None:
    client = _client(monkeypatch)
    response = client.post(
        "/api/v1/quiz/suggestions",
        json={"profile": None, "user_profile": _profile(), "new_responses": []},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "INVALID_SCENARIO_RESPONSE"
