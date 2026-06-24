from __future__ import annotations

import io
from typing import Any

import pytest
from docx import Document
from flask import Flask
from flask.testing import FlaskClient
from reportlab.pdfgen.canvas import Canvas

from pathin_api import create_app
from pathin_api.career_service import CareerService, SnapshotPitRepository
from pathin_api.map_store import (
    InMemorySavedMapStore,
    SQLiteSavedMapStore,
)
from pathin_api.resume_parser import MAX_UPLOAD_BYTES


RESUME_TEXT = """Alex Example
San Francisco, CA

EDUCATION
BS Computer Science, State University, 2024

EXPERIENCE
Software Engineer Intern | Example Co | June 2023 - August 2023
Built Python REST APIs and React interfaces
Improved automated tests and documented releases

PROJECTS
Machine learning model for customer churn

SKILLS
Python, JavaScript, React, SQL, Git

CERTIFICATIONS
AWS Cloud Practitioner

ACHIEVEMENTS
Won campus hackathon

INTERESTS
AI, product design
"""


CONTRASTING_PROFILES: dict[str, dict[str, list[str]]] = {
    "software": {
        "education": ["BS Computer Science"],
        "roles": ["Junior Software Developer"],
        "responsibilities": [
            "Built React applications and REST APIs",
            "Debugged Python services and reviewed code",
        ],
        "projects": ["Deployed a Next.js scheduling app"],
        "skills": [
            "Python",
            "JavaScript",
            "React",
            "Git",
            "APIs",
            "Debugging",
        ],
        "interests": ["Technology", "Building products"],
        "goals": ["Build reliable software products"],
    },
    "data": {
        "education": ["BS Statistics and Mathematics"],
        "roles": ["Data Analyst"],
        "responsibilities": [
            "Analyzed data with SQL and built Tableau dashboards",
            "Presented experiment results to stakeholders",
        ],
        "projects": ["Python machine learning model for customer churn"],
        "skills": [
            "Python",
            "SQL",
            "Statistics",
            "Machine Learning",
            "Data Analysis",
            "Visualization",
        ],
        "interests": ["AI", "Research", "Data"],
        "goals": ["Build predictive models"],
    },
    "design": {
        "education": ["BA Psychology and Design"],
        "roles": ["Product Design Intern"],
        "responsibilities": [
            "Conducted user interviews and usability testing",
            "Created Figma prototypes and interaction flows",
        ],
        "projects": ["Mobile app UX case study"],
        "skills": [
            "User Research",
            "Prototyping",
            "Interaction Design",
            "Visual Communication",
        ],
        "interests": ["Design", "Users", "Psychology"],
        "goals": ["Design accessible digital experiences"],
    },
    "marketing": {
        "education": ["BA Communications"],
        "roles": ["Marketing Intern"],
        "responsibilities": [
            "Created social campaigns and SEO content",
            "Analyzed campaign performance and audience growth",
        ],
        "projects": ["Content calendar and email campaign"],
        "skills": [
            "Content Creation",
            "SEO",
            "Analytics",
            "Writing",
            "Communication",
        ],
        "interests": ["Marketing", "Content", "Audience growth"],
        "goals": ["Run measurable digital campaigns"],
    },
    "hr": {
        "education": ["BA Human Resources and Psychology"],
        "roles": ["Recruiting Coordinator"],
        "responsibilities": [
            "Coordinated interviews and employee onboarding",
            "Maintained confidential people records",
        ],
        "projects": ["Redesigned recruiting workflow"],
        "skills": [
            "Recruiting",
            "HR Operations",
            "Coordination",
            "Documentation",
            "Communication",
        ],
        "interests": ["People", "Organization", "Workplace"],
        "goals": ["Build equitable employee programs"],
    },
}


@pytest.fixture
def service() -> CareerService:
    return CareerService(
        SnapshotPitRepository(),
        InMemorySavedMapStore(),
    )


@pytest.fixture
def app(service: CareerService) -> Flask:
    app = create_app(service)
    app.config.update(TESTING=True)
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


def _txt_bytes() -> bytes:
    return RESUME_TEXT.encode("utf-8")


def _docx_bytes() -> bytes:
    document = Document()
    for line in RESUME_TEXT.splitlines():
        document.add_paragraph(line)
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()


def _pdf_bytes() -> bytes:
    output = io.BytesIO()
    canvas = Canvas(output)
    y = 800
    for line in RESUME_TEXT.splitlines():
        canvas.drawString(42, y, line)
        y -= 15
    canvas.save()
    return output.getvalue()


def _upload(
    client: FlaskClient,
    *,
    data: bytes,
    filename: str,
    mimetype: str,
    source: str = "resume",
):
    return client.post(
        "/api/v1/resumes/parse",
        data={
            "source": source,
            "file": (io.BytesIO(data), filename, mimetype),
        },
        content_type="multipart/form-data",
    )


def _explore(
    client: FlaskClient,
    profile: dict[str, Any],
    *,
    count: int = 4,
) -> dict[str, Any]:
    response = client.post(
        "/api/v1/maps/explore",
        json={"profile": profile, "resultCount": count},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def test_health_exposes_versions_and_privacy_threshold(
    client: FlaskClient,
) -> None:
    assert client.get("/").get_json() == {
        "name": "PathIn API",
        "status": "ok",
    }
    payload = client.get("/api/v1/health").get_json()
    assert payload["status"] == "ok"
    assert payload["privacyThreshold"] == 20
    assert payload["versions"]["api"] == "v1"
    assert payload["versions"]["resumeParser"]
    assert payload["versions"]["algorithm"]


@pytest.mark.parametrize(
    ("extension", "mimetype", "factory"),
    [
        ("txt", "text/plain", _txt_bytes),
        (
            "docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _docx_bytes,
        ),
        ("pdf", "application/pdf", _pdf_bytes),
    ],
)
def test_pdf_docx_and_txt_extract_profile_facts_with_provenance(
    client: FlaskClient,
    extension: str,
    mimetype: str,
    factory,
) -> None:
    response = _upload(
        client,
        data=factory(),
        filename=f"resume.{extension}",
        mimetype=mimetype,
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["file"]["format"] == extension
    assert payload["file"]["retention"].startswith("Processed in memory")
    assert payload["fields"]["education"]
    assert payload["fields"]["roles"]
    assert payload["fields"]["responsibilities"]
    assert payload["fields"]["dates"]
    assert payload["fields"]["projects"]
    assert payload["fields"]["skills"]
    assert payload["fields"]["certifications"]
    assert payload["fields"]["achievements"]
    assert payload["fields"]["interests"]
    assert payload["fields"]["locations"][0]["value"] == "San Francisco, CA"
    assert all(
        field["source"] == "resume"
        for category in ("education", "roles", "projects", "certifications")
        for field in payload["fields"][category]
    )
    inferred = [
        field
        for fields in payload["fields"].values()
        for field in fields
        if not field["explicit"]
    ]
    assert inferred
    assert all(field["source"] == "inferred" for field in inferred)
    assert all(field["originalSource"] == "resume" for field in inferred)
    assert "text" not in payload


def test_linkedin_export_preserves_linkedin_provenance(
    client: FlaskClient,
) -> None:
    response = _upload(
        client,
        data=_txt_bytes(),
        filename="linkedin-export.txt",
        mimetype="text/plain",
        source="linkedin",
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["fields"]["education"][0]["source"] == "linkedin"
    inferred = next(
        field
        for field in payload["fields"]["skills"]
        if not field["explicit"]
    )
    assert inferred["source"] == "inferred"
    assert inferred["originalSource"] == "linkedin"


@pytest.mark.parametrize(
    ("data", "filename", "mimetype", "code"),
    [
        (b"plain text", "resume.rtf", "text/rtf", "UNSUPPORTED_FILE_TYPE"),
        (b"not a pdf", "resume.pdf", "application/pdf", "FILE_SIGNATURE_MISMATCH"),
        (b"", "resume.txt", "text/plain", "EMPTY_FILE"),
        (b"\x00\x01binary", "resume.txt", "text/plain", "FILE_SIGNATURE_MISMATCH"),
        (b"short", "resume.txt", "text/plain", "NO_READABLE_TEXT"),
    ],
)
def test_invalid_resumes_return_useful_errors_without_fake_fields(
    client: FlaskClient,
    data: bytes,
    filename: str,
    mimetype: str,
    code: str,
) -> None:
    response = _upload(
        client,
        data=data,
        filename=filename,
        mimetype=mimetype,
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == code
    assert payload["error"]["message"]
    assert "fields" not in payload


def test_oversized_resume_is_rejected(client: FlaskClient) -> None:
    response = _upload(
        client,
        data=b"a" * (MAX_UPLOAD_BYTES + 1),
        filename="resume.txt",
        mimetype="text/plain",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "FILE_TOO_LARGE"


def test_profile_merge_prefers_corrections_deduplicates_and_flags_conflicts(
    client: FlaskClient,
) -> None:
    response = client.post(
        "/api/v1/profiles/normalize",
        json={
            "profile": {
                "fields": {
                    "roles": [
                        {
                            "value": "Software Developer",
                            "source": "resume",
                            "confidence": 0.9,
                            "explicit": True,
                            "enabled": True,
                        },
                        {
                            "value": "Software Engineer",
                            "source": "user_correction",
                            "confidence": 1,
                            "explicit": True,
                            "enabled": True,
                        },
                    ],
                    "skills": [
                        {
                            "value": "JS",
                            "source": "resume",
                            "confidence": 0.9,
                            "explicit": True,
                            "enabled": True,
                        },
                        {
                            "value": "JavaScript",
                            "source": "linkedin",
                            "confidence": 0.8,
                            "explicit": True,
                            "enabled": True,
                        },
                    ],
                }
            }
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["roles"] == ["Software Engineer"]
    assert payload["fieldEvidence"]["roles"][0]["source"] == "user_correction"
    assert payload["skills"] == ["JS"]
    assert payload["fieldEvidence"]["skills"][0]["source"] == "resume"
    assert set(
        payload["fieldEvidence"]["skills"][0]["corroboratedBy"]
    ) == {"resume", "linkedin"}
    assert payload["conflicts"][0]["category"] == "roles"


def test_resume_and_linkedin_evidence_unlock_user_selected_linkedin_north_star(
    client: FlaskClient,
) -> None:
    def field(value: str, source: str) -> dict[str, Any]:
        return {
            "value": value,
            "source": source,
            "confidence": 0.96,
            "explicit": True,
            "enabled": True,
        }

    payload = _explore(
        client,
        {
            "fields": {
                "education": [
                    field("BS Computer Science", "resume"),
                ],
                "roles": [
                    field("Software Engineer Intern", "resume"),
                    field("Software Developer", "linkedin"),
                ],
                "responsibilities": [
                    field(
                        "Built React applications and REST APIs",
                        "resume",
                    ),
                    field(
                        "Developed frontend product features",
                        "linkedin",
                    ),
                ],
                "projects": [
                    field(
                        "Deployed a Next.js scheduling app",
                        "resume",
                    ),
                ],
                "skills": [
                    field("JavaScript", "resume"),
                    field("React", "linkedin"),
                    field("Python", "resume"),
                    field("Git", "linkedin"),
                ],
            }
        },
    )

    assert set(payload["profileFingerprint"]["sourcesPresent"]) == {
        "resume",
        "linkedin",
    }
    dream = payload["dreamCareer"]
    assert dream["personalizedDreamTitle"] == (
        "Senior Software Engineer at LinkedIn"
    )
    assert dream["canonicalRole"] == "Software Engineer"
    assert dream["aspirationSource"] == "user_selected"
    assert dream["sourceBlend"] == "resume and LinkedIn evidence"
    assert dream["careerHorizon"] == "3 to 7 years"
    assert dream["criticalGaps"][:3] == [
        "System Design",
        "Technical Leadership",
        "Large-scale Distributed Systems",
    ]
    assert "not claiming company-specific hiring fit" in dream[
        "careerThesis"
    ]
    recommendation = next(
        item
        for item in payload["rankedDestinations"]
        if item["isDreamCareer"]
    )
    assert recommendation["title"] == dream["personalizedDreamTitle"]
    assert recommendation["aspirationSource"] == "user_selected"
    route_ids = payload["buildPathIdsByDestination"][
        dream["destinationId"]
    ]
    route_nodes = {
        node_id
        for path in payload["paths"]
        if path["id"] in route_ids
        for node_id in path["nodeIds"]
    }
    route_labels = {
        node["label"]
        for node in payload["nodes"]
        if node["id"] in route_nodes
    }
    assert "System Design" in route_labels
    assert any(
        "next.js scheduling app" in label.lower()
        for label in route_labels
    )


def test_disabled_fields_do_not_influence_recommendations(
    client: FlaskClient,
) -> None:
    disabled = _explore(
        client,
        {
            "education": ["BA Communications"],
            "skills": ["Machine Learning", "Python"],
            "interests": ["AI"],
            "enabledCategories": {
                "skills": False,
                "interests": False,
            },
        },
    )
    baseline = _explore(
        client,
        {"education": ["BA Communications"]},
    )

    assert disabled["destinationIds"] == baseline["destinationIds"]
    assert [
        item["overallScore"] for item in disabled["rankedDestinations"]
    ] == [
        item["overallScore"] for item in baseline["rankedDestinations"]
    ]
    assert "skills" not in disabled["enabledSignals"]
    assert "interests" not in disabled["enabledSignals"]
    assert "skills" not in disabled["exactSignalsUsed"]


def test_five_contrasting_resumes_receive_materially_different_rankings(
    client: FlaskClient,
) -> None:
    payloads = {
        name: _explore(client, profile)
        for name, profile in CONTRASTING_PROFILES.items()
    }
    top_roles = {
        name: payload["rankedDestinations"][0]["canonicalRole"]
        for name, payload in payloads.items()
    }

    assert top_roles == {
        "software": "Software Engineer",
        "data": "Data Scientist",
        "design": "UX Designer",
        "marketing": "Marketing Specialist",
        "hr": "HR Coordinator",
    }
    personalized_titles = {
        payload["rankedDestinations"][0]["personalizedTitle"]
        for payload in payloads.values()
    }
    dream_titles = {
        payload["dreamCareer"]["personalizedDreamTitle"]
        for payload in payloads.values()
    }
    assert len(personalized_titles) == len(payloads)
    assert len(dream_titles) == len(payloads)
    assert all(
        payload["profileFingerprint"]["problemThemes"]
        for payload in payloads.values()
    )


def test_interest_and_goal_changes_alter_results(client: FlaskClient) -> None:
    base = {
        "education": ["BA Communications"],
        "skills": ["Communication"],
        "responsibilities": [
            "Coordinated projects and wrote stakeholder updates"
        ],
    }
    marketing = _explore(
        client,
        {
            **base,
            "interests": ["Marketing", "Content"],
            "goals": ["Run audience campaigns"],
        },
    )
    people = _explore(
        client,
        {
            **base,
            "interests": ["People", "Recruiting"],
            "goals": ["Support employee programs"],
        },
    )

    assert (
        marketing["rankedDestinations"][0]["canonicalRole"]
        == "Marketing Specialist"
    )
    assert people["rankedDestinations"][0]["canonicalRole"] == "HR Coordinator"
    assert marketing["destinationIds"] != people["destinationIds"]


def test_explicit_role_exclusions_are_respected(client: FlaskClient) -> None:
    profile = {
        **CONTRASTING_PROFILES["software"],
        "constraints": {
            "excludedRoles": ["Software Engineer"],
            "excludedIndustries": [],
        },
    }
    payload = _explore(client, profile)

    assert all(
        item["canonicalRole"] != "Software Engineer"
        for item in payload["rankedDestinations"]
    )
    assert "dest-software-engineer" not in payload["destinationIds"]


def test_empty_profile_does_not_receive_fake_personalization(
    client: FlaskClient,
) -> None:
    response = client.post(
        "/api/v1/maps/explore",
        json={"profile": {}},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "INSUFFICIENT_PROFILE"
    assert "destinations" not in payload


def test_unsupported_seniority_jump_receives_distance_penalty(
    client: FlaskClient,
) -> None:
    common = {
        "skills": [
            "Programming",
            "Technical Strategy",
            "Communication",
        ],
        "responsibilities": ["Built software and planned technical work"],
    }
    junior = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {**common, "roles": ["Junior Software Engineer"]},
            "destinationId": "dest-engineering-manager",
        },
    ).get_json()["rankedDestinations"][0]
    senior = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {**common, "roles": ["Senior Software Engineer"]},
            "destinationId": "dest-engineering-manager",
        },
    ).get_json()["rankedDestinations"][0]

    assert junior["seniorityPenalty"] >= 40
    assert senior["seniorityPenalty"] == 0
    assert junior["transitionDifficulty"] == "high"
    assert "levels above" in junior["seniorityReason"]


def test_results_are_diverse_and_explainable(client: FlaskClient) -> None:
    payload = _explore(client, CONTRASTING_PROFILES["data"], count=5)
    recommendations = payload["rankedDestinations"]

    assert 2 <= len(recommendations) <= 5
    assert len({item["title"] for item in recommendations}) == len(
        recommendations
    )
    assert len({item["family"] for item in recommendations}) == len(
        recommendations
    )
    enabled_values = {
        field["value"]
        for fields in payload["exactSignalsUsed"].values()
        for field in fields
    }
    for item in recommendations:
        assert set(item["componentScores"]) == {
            "skillOverlap",
            "experienceAdjacency",
            "interestsAndGoals",
            "projectEvidence",
            "educationRelevance",
            "preferencesAndConstraints",
            "transitionEffort",
            "careerHistoryEvidence",
        }
        assert sum(
            component["weight"]
            for component in item["componentScores"].values()
        ) == 100
        assert item["confidence"] in {
            "strong",
            "moderate",
            "limited",
            "exploratory",
        }
        assert item["topMatchingSignals"]
        assert all(
            signal["value"] in enabled_values
            for signal in item["topMatchingSignals"]
        )
        assert item["topMatchingSignals"][0]["value"] in item["explanation"]
        assert item["canonicalRole"]
        assert item["personalizedTitle"]
        assert item["careerThesis"]
        assert item["careerHorizon"]
        assert item["personalizationEvidence"]
        assert item["gaps"] is not None
        assert item["uncertainty"]


def test_generated_routes_are_dynamic_and_address_identified_gaps(
    client: FlaskClient,
) -> None:
    payload = _explore(
        client,
        {
            "education": ["BS Computer Science"],
            "skills": ["Python", "Communication"],
            "projects": ["Small data dashboard"],
            "interests": ["AI", "Data"],
        },
    )
    node_by_id = {node["id"]: node for node in payload["nodes"]}
    recommendation_by_destination = {
        item["destinationId"]: item
        for item in payload["rankedDestinations"]
    }

    for destination_id in payload["destinationIds"]:
        route_ids = payload["buildPathIdsByDestination"][destination_id]
        assert len(route_ids) == 2
        routes = [
            path for path in payload["paths"] if path["id"] in route_ids
        ]
        assert len({route["strategy"] for route in routes}) == 2
        assert all(
            route["strategy"]
            not in {
                "Learning and project-first",
                "Skill and role-first",
            }
            for route in routes
        )
        recommendation = recommendation_by_destination[destination_id]
        supported_gaps = set(
            recommendation["gaps"] or recommendation["skills"]
        )
        for route in routes:
            assert route["nodeIds"][0] == "current"
            assert route["nodeIds"][-1] == destination_id
            for node_id in route["nodeIds"][1:-1]:
                details = node_by_id[node_id]["stepDetails"]
                assert details["why"]
                assert details["support"]
                assert details["skillsDeveloped"]
                assert details["gapAddressed"] in supported_gaps
                assert details["requirement"] in {
                    "optional",
                    "recommended",
                    "necessary",
                }
                assert details["effort"]
                assert details["completionEvidence"]
                assert details["supportingEvidence"]
                assert "Small data dashboard" in details["support"]
                assert "evidence project" not in node_by_id[node_id][
                    "label"
                ].lower()


def test_sparse_historical_transitions_remain_suppressed(
    client: FlaskClient,
) -> None:
    response = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {
                "roles": ["Software Engineer"],
                "skills": ["Programming", "Python", "Cloud"],
                "responsibilities": ["Built and maintained software"],
            },
            "destinationId": "dest-devops-engineer",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    recommendation = payload["rankedDestinations"][0]
    assert recommendation["historicalEvidence"]["status"] == "suppressed"
    assert (
        recommendation["historicalEvidence"]["cohortSizeBucket"]
        == "below_20"
    )
    sparse_edges = [
        edge
        for edge in payload["edges"]
        if edge["privacyStatus"] == "suppressed"
    ]
    assert sparse_edges
    assert all("observedCount" not in edge for edge in sparse_edges)
    assert all(edge["cohortSizeBucket"] == "below_20" for edge in sparse_edges)


def test_identical_inputs_and_versions_produce_identical_output(
    client: FlaskClient,
) -> None:
    first = _explore(client, CONTRASTING_PROFILES["design"])
    second = _explore(client, CONTRASTING_PROFILES["design"])

    assert first["id"] == second["id"]
    assert (
        first["generation"]["requestFingerprint"]
        == second["generation"]["requestFingerprint"]
    )
    assert first["destinationIds"] == second["destinationIds"]
    assert first["rankedDestinations"] == second["rankedDestinations"]
    assert first["nodes"] == second["nodes"]
    assert first["edges"] == second["edges"]
    assert first["paths"] == second["paths"]


def test_saved_map_can_be_reopened_and_feedback_regenerates_backend_ranking(
    client: FlaskClient,
) -> None:
    created = _explore(client, CONTRASTING_PROFILES["marketing"])
    map_id = created["id"]
    rejected_destination = created["destinationIds"][0]

    saved = client.patch(
        f"/api/v1/maps/{map_id}",
        json={
            "name": "Marketing alternatives",
            "pinnedNodeIds": ["current"],
            "dismissedNodeIds": [],
            "viewport": {"x": 120, "y": 80, "zoom": 0.9},
        },
    )
    assert saved.status_code == 200
    assert saved.get_json()["pinnedNodeIds"] == ["current"]
    reopened = client.get(f"/api/v1/maps/{map_id}")
    assert reopened.status_code == 200
    assert reopened.get_json()["name"] == "Marketing alternatives"

    regenerated = client.post(
        f"/api/v1/maps/{map_id}/regenerate",
        json={
            "profile": CONTRASTING_PROFILES["marketing"],
            "action": "not_for_me",
            "targetId": rejected_destination,
            "pinnedNodeIds": ["current"],
        },
    )
    assert regenerated.status_code == 201
    payload = regenerated.get_json()
    assert payload["previousMapId"] == map_id
    assert rejected_destination not in payload["destinationIds"]
    assert payload["pinnedNodeIds"] == ["current"]
    assert rejected_destination in payload["generationConstraints"][
        "feedback"
    ]["notForMeRoleIds"]


def test_explicitly_saved_map_survives_service_restart(tmp_path) -> None:
    database_path = tmp_path / "saved-maps.sqlite3"
    first_service = CareerService(
        SnapshotPitRepository(),
        SQLiteSavedMapStore(database_path),
    )
    first_client = create_app(first_service).test_client()
    created = _explore(first_client, CONTRASTING_PROFILES["data"])
    saved = first_client.patch(
        f"/api/v1/maps/{created['id']}",
        json={
            "name": "Persistent data paths",
            "pinnedNodeIds": ["current"],
            "dismissedNodeIds": [],
        },
    )
    assert saved.status_code == 200
    assert saved.get_json()["savedAt"]

    restarted_service = CareerService(
        SnapshotPitRepository(),
        SQLiteSavedMapStore(database_path),
    )
    reopened = create_app(restarted_service).test_client().get(
        f"/api/v1/maps/{created['id']}"
    )

    assert reopened.status_code == 200
    payload = reopened.get_json()
    assert payload["name"] == "Persistent data paths"
    assert payload["pinnedNodeIds"] == ["current"]


def test_profile_edits_and_alternative_route_change_backend_result(
    client: FlaskClient,
) -> None:
    created = _explore(client, CONTRASTING_PROFILES["marketing"])
    map_id = created["id"]
    target = created["destinationIds"][0]
    alternative_path = created["buildPathIdsByDestination"][target][1]

    alternative = client.post(
        f"/api/v1/maps/{map_id}/regenerate",
        json={
            "profile": CONTRASTING_PROFILES["marketing"],
            "action": "alternative_route",
            "targetId": target,
        },
    ).get_json()
    target_index = alternative["destinationIds"].index(target)
    assert alternative["explorePathIds"][target_index] == alternative_path

    edited = client.post(
        f"/api/v1/maps/{alternative['id']}/regenerate",
        json={"profile": CONTRASTING_PROFILES["hr"]},
    )
    assert edited.status_code == 201
    edited_payload = edited.get_json()
    assert (
        edited_payload["rankedDestinations"][0]["canonicalRole"]
        == "HR Coordinator"
    )
    assert edited_payload["id"] != created["id"]


def test_feedback_and_role_detail_endpoints_are_versioned_and_non_identifying(
    client: FlaskClient,
) -> None:
    career_map = _explore(client, CONTRASTING_PROFILES["software"])
    feedback = client.post(
        f"/api/v1/maps/{career_map['id']}/feedback",
        json={
            "target": {
                "type": "node",
                "id": career_map["destinationIds"][0],
                "label": career_map["rankedDestinations"][0]["title"],
            },
            "category": "biased",
            "comment": "Review the evidence weighting.",
        },
    )
    assert feedback.status_code == 202
    assert feedback.get_json()["feedbackId"].startswith("feedback_")

    role = client.get("/api/v1/roles/data-scientist")
    assert role.status_code == 200
    payload = role.get_json()
    assert payload["title"] == "Data Scientist"
    assert payload["marketSnapshot"]["postingCount"] >= 20
    assert payload["versions"]["algorithm"]
    assert "member" not in payload
    assert "history" not in payload


def test_errors_use_consistent_contract(client: FlaskClient) -> None:
    response = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {"skills": ["Communication"]},
            "destinationId": "astronaut",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": {
            "code": "INVALID_DESTINATION",
            "message": "Choose a destination returned by the Path[IN] catalog.",
            "retryable": False,
            "details": {"destinationId": "astronaut"},
        }
    }
