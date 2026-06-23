import pytest
from flask import Flask

from pathin_api import create_app
from pathin_api.career_service import CareerService, SnapshotPitRepository


@pytest.fixture
def app() -> Flask:
    app = create_app(CareerService(SnapshotPitRepository()))
    app.config.update(TESTING=True)
    return app


def test_index(app: Flask) -> None:
    response = app.test_client().get("/")

    assert response.status_code == 200
    assert response.get_json() == {
        "name": "PathIn API",
        "status": "ok",
    }


def test_health(app: Flask) -> None:
    response = app.test_client().get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {
        "service": "pathin-api",
        "status": "ok",
    }


def test_versioned_health_exposes_non_sensitive_versions(app: Flask) -> None:
    response = app.test_client().get("/api/v1/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "ok"
    assert payload["privacyThreshold"] == 20
    assert payload["versions"]["api"] == "v1"


def test_profile_normalization_uses_non_work_evidence(app: Flask) -> None:
    response = app.test_client().post(
        "/api/v1/profiles/normalize",
        json={
            "education": ["California public high school"],
            "projects": ["Robotics project"],
            "activities": ["Coding club"],
            "skills": ["Python", "Python", "Public speaking"],
            "interests": ["AI"],
            "consent": {"education": True, "skills": True},
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["projects"] == ["Robotics project"]
    assert payload["activities"] == ["Coding club"]
    assert payload["skills"] == ["Python", "Public speaking"]
    assert payload["inferredFields"]["educationStage"] == "high_school"


def test_explore_returns_three_destinations_and_grounded_paths(
    app: Flask,
) -> None:
    response = app.test_client().post(
        "/api/v1/maps/explore",
        json={
            "profile": {
                "education": ["Computer Science"],
                "projects": ["Campus scheduling app"],
                "skills": ["Python", "Communication"],
                "interests": ["AI", "Design"],
                "consent": {"education": True, "projects": True},
            }
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["mode"] == "explore"
    assert len(payload["destinationIds"]) == 3
    assert len(payload["paths"]) == 3
    assert payload["generation"]["dataVersion"] == "pit-snapshot-2026-06-23"
    assert payload["source"]["status"] == "snapshot"
    assert all(node["id"] for node in payload["nodes"])


def test_sparse_transition_counts_are_suppressed(app: Flask) -> None:
    response = app.test_client().post(
        "/api/v1/maps/build",
        json={
            "destinationId": "data-senior",
            "profile": {
                "education": ["Computer Science"],
                "skills": ["Python"],
                "interests": ["Data"],
            },
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    sparse_edges = [
        edge
        for edge in payload["edges"]
        if edge["privacyStatus"] == "suppressed"
    ]
    assert sparse_edges
    assert all(edge["cohortSizeBucket"] == "below_20" for edge in sparse_edges)
    assert all("observedCount" not in edge for edge in sparse_edges)
    assert all(
        edge["type"] == "recommended_transition" for edge in sparse_edges
    )


def test_build_returns_two_distinct_routes(app: Flask) -> None:
    response = app.test_client().post(
        "/api/v1/maps/build",
        json={
            "destinationId": "product-mid",
            "profile": {
                "skills": ["Software problem solving"],
                "interests": ["Product"],
            },
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["mode"] == "build"
    assert payload["destinationIds"] == ["product-mid"]
    assert [path["id"] for path in payload["paths"]] == [
        "product-project",
        "product-technical",
    ]


def test_saved_map_can_be_retrieved_updated_and_regenerated(
    app: Flask,
) -> None:
    client = app.test_client()
    created = client.post(
        "/api/v1/maps/build",
        json={
            "destinationId": "ux-mid",
            "profile": {
                "skills": ["Frontend development"],
                "interests": ["Design"],
            },
        },
    ).get_json()
    map_id = created["id"]

    retrieved = client.get(f"/api/v1/maps/{map_id}")
    assert retrieved.status_code == 200
    assert retrieved.get_json()["id"] == map_id

    updated = client.patch(
        f"/api/v1/maps/{map_id}",
        json={
            "name": "Design possibilities",
            "pinnedNodeIds": ["course-ux"],
            "dismissedNodeIds": ["software-entry"],
            "viewport": {"x": 180, "y": 80, "zoom": 0.9},
        },
    )
    assert updated.status_code == 200
    assert updated.get_json()["pinnedNodeIds"] == ["course-ux"]

    regenerated = client.post(
        f"/api/v1/maps/{map_id}/regenerate",
        json={},
    )
    assert regenerated.status_code == 201
    regenerated_payload = regenerated.get_json()
    assert regenerated_payload["previousMapId"] == map_id
    assert regenerated_payload["pinnedNodeIds"] == ["course-ux"]


def test_feedback_includes_map_generation_context(app: Flask) -> None:
    client = app.test_client()
    career_map = client.get("/api/v1/maps/demo").get_json()

    response = client.post(
        f"/api/v1/maps/{career_map['id']}/feedback",
        json={
            "target": {"type": "node", "id": "product-mid"},
            "category": "biased",
            "comment": "The fit explanation needs broader evidence.",
        },
    )

    assert response.status_code == 202
    payload = response.get_json()
    assert payload["accepted"] is True
    assert payload["feedbackId"].startswith("feedback_")


def test_role_details_label_synthetic_market_data(app: Flask) -> None:
    response = app.test_client().get("/api/v1/roles/data-scientist")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["canonicalTitle"] == "Data Scientist"
    assert payload["marketSnapshot"]["postingCount"] == 18
    assert "Synthetic PIT" in payload["source"]["scope"]


def test_errors_use_consistent_contract(app: Flask) -> None:
    response = app.test_client().post(
        "/api/v1/maps/build",
        json={"destinationId": "astronaut"},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload == {
        "error": {
            "code": "INVALID_DESTINATION",
            "message": "Choose a supported destination before building a path.",
            "retryable": False,
            "details": {
                "availableDestinationIds": [
                    "data-senior",
                    "product-mid",
                    "ux-mid",
                ]
            },
        }
    }
