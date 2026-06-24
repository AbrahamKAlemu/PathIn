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
from pathin_api.profile_store import (
    InMemoryCurrentProfileStore,
    SQLiteCurrentProfileStore,
)
from pathin_api.recommendation_engine import RecommendationEngine
from pathin_api.resume_parser import MAX_UPLOAD_BYTES
from pathin_api.taxonomy import ROLE_BY_ID
from pathin_api.text_cleanup import (
    clean_extracted_text,
    clean_profile_text,
    is_probably_compacted_text,
)


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

ENGINEERING_RESUME_TEXT = """Jordan Example
Atlanta, GA | jordan@example.com

EDUCATION
Computer Engineering, State Institute, 2028

PROFESSIONAL & TECHNICAL EXPERIENCE
Robotics Club
Robotics 101 Member January 2025 - Present
● Working on a beginner-level robot to build technical skills.
● Learning CAD with Autodesk Fusion and embedded systems with Arduino.

BattleBots Team
3-lb Chassis Engineer September 2025 - Present
● Designing a chassis for a competitive robot.
● Drafting prototypes with Autodesk Inventor and soldering electronics.
● Developing CAD, manufacturing, and mechanical design skills.

Restaurant365
Data & Analytics Intern June 2024 - August 2024
● Developed Python and SQL skills with Google Cloud and Excel.
● Built a machine learning model to predict customer churn.

SKILLS
● Programming Languages: Python, Java, and SQL ● Collaboration and communication
● CAD, Arduino, embedded systems, electronics, manufacturing, 3D printing

LEADERSHIP & COMMUNITY SERVICE EXPERIENCE
Bridge Program Cohort Representative October 2025 - Present
● Elected to propose solutions with program directors.
● Coordinated sponsor conversations and program development.

AWARDS
Future Engineer Scholarship 2025
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

INTERDISCIPLINARY_PROFILES: dict[str, dict[str, list[str]]] = {
    "health_tech": {
        "education": ["BS Computer Science", "Minor in Public Health"],
        "roles": ["Hospital Innovation Lab Software Intern"],
        "responsibilities": [
            "Built a Python patient scheduling tool with clinicians",
            "Analyzed hospital workflow data and interviewed nurses",
        ],
        "projects": [
            "Accessible mobile prototype for medication reminders"
        ],
        "skills": [
            "Python",
            "JavaScript",
            "Data Analysis",
            "User Research",
        ],
        "interests": ["Digital health", "Patient experience"],
        "goals": ["Use technology to improve healthcare access"],
    },
    "law_tech": {
        "education": [
            "BA Political Science",
            "Computer Science coursework",
        ],
        "roles": ["Legal Technology Intern"],
        "responsibilities": [
            "Automated contract review workflows with Python",
            (
                "Researched privacy law and translated regulations into "
                "product requirements"
            ),
        ],
        "projects": ["Privacy compliance dashboard for a legal clinic"],
        "skills": [
            "Python",
            "Requirements Analysis",
            "Legal Research",
            "Data Analysis",
        ],
        "interests": ["Law", "Privacy", "Technology"],
        "goals": [
            "Build technology that makes legal services easier to navigate"
        ],
    },
    "creative_tech": {
        "education": ["BA Digital Media and Computer Science"],
        "roles": ["Creative Coding Assistant"],
        "responsibilities": [
            "Built interactive music visualizations in JavaScript",
            "Designed and tested an installation with museum visitors",
        ],
        "projects": ["Generative art and sound installation"],
        "skills": [
            "JavaScript",
            "Creative Coding",
            "Visual Communication",
            "Prototyping",
        ],
        "interests": ["Art", "Music", "Interactive media"],
        "goals": ["Create expressive technology experiences"],
    },
    "logic": {
        "education": ["BS Mathematics"],
        "roles": ["Mathematics Research Assistant"],
        "responsibilities": [
            "Developed proofs and algorithms for optimization problems",
            "Explained complex logical arguments and tested edge cases",
        ],
        "projects": ["Constraint-solving research project"],
        "skills": [
            "Logical Reasoning",
            "Python",
            "Problem Solving",
            "Statistics",
        ],
        "interests": ["Puzzles", "Decision making", "Research"],
        "goals": ["Solve difficult structured problems"],
    },
}


@pytest.fixture
def service() -> CareerService:
    return CareerService(
        SnapshotPitRepository(),
        InMemorySavedMapStore(),
        InMemoryCurrentProfileStore(),
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


def test_current_profile_exposes_authorized_evidence_without_social_metrics(
    client: FlaskClient,
) -> None:
    response = client.get("/api/v1/profiles/current")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["name"] == "Winston Iskandar"
    assert payload["provenance"] == {
        "source": "user_supplied_linkedin_profile",
        "authorized": True,
        "scraped": False,
        "description": (
            "Profile facts supplied by the user for this PathIn prototype. "
            "No LinkedIn credentials or scraping are used."
        ),
    }
    evidence = payload["pathinEvidence"]
    assert evidence["source"] == "linkedin"
    assert evidence["fields"]["roles"]
    assert evidence["fields"]["education"]
    assert evidence["fields"]["skills"]
    assert all(
        item["source"] == "linkedin"
        for items in evidence["fields"].values()
        for item in items
    )
    serialized_evidence = str(evidence)
    assert "profileViews" not in serialized_evidence
    assert "viewerSuggestions" not in serialized_evidence


def test_current_profile_updates_identity_and_enabled_categories(
    client: FlaskClient,
) -> None:
    response = client.patch(
        "/api/v1/profiles/current",
        json={
            "profile": {
                "headline": "Founder | CS/Math @ Stanford",
                "enabledCategories": {
                    "roles": True,
                    "skills": False,
                    "education": True,
                },
            }
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["headline"] == "Founder | CS/Math @ Stanford"
    assert payload["enabledCategories"]["skills"] is False
    assert payload["pathinEvidence"]["enabledCategories"]["skills"] is False

    reopened = client.get("/api/v1/profiles/current").get_json()
    assert reopened["headline"] == "Founder | CS/Math @ Stanford"
    assert reopened["enabledCategories"]["skills"] is False


def test_current_profile_rejects_unsupported_updates(
    client: FlaskClient,
) -> None:
    response = client.patch(
        "/api/v1/profiles/current",
        json={"profile": {"privateLinkedinToken": "do-not-store"}},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "UNSUPPORTED_PROFILE_UPDATE"
    assert payload["error"]["details"]["unsupportedFields"] == [
        "privateLinkedinToken"
    ]


def test_current_profile_persists_across_service_restart(tmp_path) -> None:
    database_path = tmp_path / "profiles.sqlite3"
    first_service = CareerService(
        SnapshotPitRepository(),
        InMemorySavedMapStore(),
        SQLiteCurrentProfileStore(database_path),
    )
    first_service.update_current_profile(
        {
            "headline": "Persistent PathIn profile",
            "enabledCategories": {
                "roles": True,
                "skills": False,
            },
        }
    )

    restarted_service = CareerService(
        SnapshotPitRepository(),
        InMemorySavedMapStore(),
        SQLiteCurrentProfileStore(database_path),
    )
    reopened = restarted_service.get_current_profile()

    assert reopened["headline"] == "Persistent PathIn profile"
    assert reopened["enabledCategories"]["skills"] is False


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


def test_character_spaced_resume_text_is_repaired_before_parsing(
    client: FlaskClient,
) -> None:
    spaced_resume = """
E D U C A T I O N
B S  C o m p u t e r  S c i e n c e

E X P E R I E N C E
S o f t w a r e  E n g i n e e r  I n t e r n  |  E x a m p l e  C o  |  J a n 2 0 2 6 - P r e s e n t
B u i l t  P y t h o n  A P I s  a n d  R e a c t  i n t e r f a c e s  f o r  s t u d e n t s

S K I L L S
P y t h o n ,  J a v a S c r i p t ,  R e a c t
"""
    response = _upload(
        client,
        data=spaced_resume.encode(),
        filename="spaced-resume.txt",
        mimetype="text/plain",
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["fields"]["roles"][0]["value"] == (
        "Software Engineer Intern | Example Co"
    )
    assert [item["value"] for item in payload["fields"]["dates"]] == [
        "Jan 2026",
        "Present",
    ]
    assert payload["fields"]["responsibilities"][0]["value"] == (
        "Built Python APIs and React interfaces for students"
    )
    assert [item["value"] for item in payload["fields"]["skills"][:3]] == [
        "Python",
        "JavaScript",
        "React",
    ]


def test_engineering_resume_sections_produce_specific_evidence_and_careers(
    client: FlaskClient,
) -> None:
    parsed_response = _upload(
        client,
        data=ENGINEERING_RESUME_TEXT.encode(),
        filename="engineering-resume.txt",
        mimetype="text/plain",
    )

    assert parsed_response.status_code == 200
    parsed = parsed_response.get_json()
    assert parsed["identity"] == {
        "name": "Jordan Example",
        "location": "Atlanta, GA",
    }
    assert [item["value"] for item in parsed["fields"]["roles"]] == [
        "Robotics 101 Member",
        "3-lb Chassis Engineer",
        "Data & Analytics Intern",
        "Bridge Program Cohort Representative",
    ]
    responsibilities = {
        item["value"] for item in parsed["fields"]["responsibilities"]
    }
    assert any("Autodesk Inventor" in value for value in responsibilities)
    assert any("machine learning model" in value for value in responsibilities)
    assert any("program directors" in value for value in responsibilities)
    projects = {item["value"] for item in parsed["fields"]["projects"]}
    assert any("competitive robot" in value for value in projects)
    assert any("customer churn" in value for value in projects)
    skills = {item["value"] for item in parsed["fields"]["skills"]}
    assert {
        "Python",
        "Java",
        "SQL",
        "CAD",
        "Autodesk Fusion 360",
        "Autodesk Inventor",
        "Arduino",
        "Embedded Systems",
        "Electronics",
        "Soldering",
        "Manufacturing",
        "3D Printing",
        "Machine Learning",
    } <= skills
    assert "Apis" not in skills

    generated = _explore(
        client,
        {
            "name": parsed["identity"]["name"],
            "fields": parsed["fields"],
        },
        count=5,
    )
    canonical_roles = [
        item["canonicalRole"]
        for item in generated["rankedDestinations"]
    ]
    hardware_roles = {
        "Robotics Engineer",
        "Embedded Systems Engineer",
        "Mechanical Design Engineer",
        "Manufacturing Engineer",
        "Hardware Test Engineer",
    }
    assert canonical_roles[0] in hardware_roles
    assert len(hardware_roles & set(canonical_roles[:4])) >= 3
    assert all(
        "education" not in item["personalizedTitle"].lower()
        for item in generated["rankedDestinations"]
    )
    assert "Robotics 101 Member" in generated["profileSummary"]
    assert "CAD" in generated["profileSummary"]
    skill_steps = [
        node
        for node in generated["nodes"]
        if node["type"] == "skill" and node.get("stepDetails")
    ]
    assert skill_steps
    assert all(
        "focused practice" not in node["summary"].lower()
        for node in skill_steps
    )
    assert all(
        "review" in node["stepDetails"]["completionEvidence"].lower()
        or "feedback" in node["stepDetails"]["completionEvidence"].lower()
        for node in skill_steps
    )


def test_profile_text_cleanup_handles_screenshot_failure_modes() -> None:
    assert clean_profile_text(
        "CollegeContactMentor|Jan2026-Present:"
    ) == "College Contact Mentor | Jan 2026 - Present:"
    assert clean_profile_text(
        "N e w  S t u d e n t  R e p r e s e n t a t i v e"
    ) == "New Student Representative"
    assert clean_profile_text(
        "Incoming Summer Analyst June 202 6 - August 20 26"
    ) == "Incoming Summer Analyst June 2026 - August 2026"
    assert clean_profile_text(
        "Expected graduation: 2 0 2 7"
    ) == "Expected graduation: 2027"
    assert clean_extracted_text(
        "Incoming\u200b Analyst\u00a0June 202\n6",
        max_characters=100,
    ) == "Incoming Analyst June 2026"
    assert not is_probably_compacted_text("JavaScript")
    assert is_probably_compacted_text(
        "Advisingstudentsthroughtailoredacademicpersonalcareer"
        "guidancetoenhanceretentionandachievepostsecondarygoals"
    )
    assert RecommendationEngine._subject_from_evidence(
        "AI literacy applications and user studies",
        "fallback",
    ) == "AI literacy applications and user studies"


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


def test_frontend_profile_keeps_roles_separate_from_responsibilities(
    client: FlaskClient,
) -> None:
    payload = _explore(
        client,
        {
            "education": ["Rice University"],
            "roles": [
                "CollegeContactMentor|Jan2026-Present:",
                "NewStudentRepresentative",
            ],
            "responsibilities": [
                "Advised students through tailored academic and career guidance"
            ],
            "skills": ["Communication", "Program Management"],
            "interests": ["Education"],
        },
    )

    assert payload["profile"]["roles"] == [
        "College Contact Mentor | Jan 2026 - Present:",
        "New Student Representative",
    ]
    assert payload["profile"]["experience"] == payload["profile"]["roles"]
    assert payload["profile"]["responsibilities"] == [
        "Advised students through tailored academic and career guidance"
    ]


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


def test_resume_and_linkedin_evidence_does_not_invent_senior_north_star(
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
    assert dream["personalizedDreamTitle"] != (
        "Senior Software Engineer at LinkedIn"
    )
    assert dream["aspirationSource"] == "inferred"
    assert "LinkedIn-specific hiring fit" not in dream["uncertainty"]
    assert not {
        "System Design",
        "Technical Leadership",
        "Large-scale Distributed Systems",
    } <= set(dream["criticalGaps"])
    recommendation = next(
        item
        for item in payload["rankedDestinations"]
        if item["isDreamCareer"]
    )
    assert recommendation["title"] == dream["personalizedDreamTitle"]
    assert recommendation["aspirationSource"] == "inferred"
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
    assert any(
        "next.js scheduling app" in label.lower()
        for label in route_labels
    )


def test_explicit_role_goal_can_select_a_north_star(
    client: FlaskClient,
) -> None:
    payload = _explore(
        client,
        {
            "education": ["BS Computer Science"],
            "roles": ["Software Engineer Intern"],
            "responsibilities": [
                "Built React applications and REST APIs",
            ],
            "projects": ["Deployed a Next.js scheduling app"],
            "skills": [
                "JavaScript",
                "React",
                "Python",
                "Git",
            ],
            "goals": ["Senior Software Engineer at LinkedIn"],
        },
        count=5,
    )

    dream = payload["dreamCareer"]
    assert dream["canonicalRole"] == "Software Engineer"
    assert dream["aspirationSource"] == "user_selected"
    assert dream["careerThesis"].startswith(
        "North Star selected from your stated goal:"
    )
    assert "Senior Software Engineer at LinkedIn" in dream["careerThesis"]
    assert "seniority" in dream["uncertainty"]
    assert "hiring outcomes are not inferred" in dream["uncertainty"]


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
    assert all(
        len(payload["destinationIds"]) >= 2
        for payload in payloads.values()
    )
    assert all(
        len(payload["buildPathIdsByDestination"][destination_id]) >= 2
        for payload in payloads.values()
        for destination_id in payload["destinationIds"]
    )
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


def test_interdisciplinary_profiles_compose_domains_with_capabilities(
    client: FlaskClient,
) -> None:
    health = _explore(client, INTERDISCIPLINARY_PROFILES["health_tech"])
    legal = _explore(client, INTERDISCIPLINARY_PROFILES["law_tech"])
    creative = _explore(client, INTERDISCIPLINARY_PROFILES["creative_tech"])
    logic = _explore(client, INTERDISCIPLINARY_PROFILES["logic"])

    assert {
        item["canonicalRole"]
        for item in health["rankedDestinations"]
    } >= {"UX Designer", "Data Scientist"}
    assert all(
        item["targetIndustryOrDomain"] == "Healthcare"
        for item in health["rankedDestinations"]
    )
    assert all(
        "Healthcare" in item["personalizedTitle"]
        for item in health["rankedDestinations"]
    )

    assert [
        item["canonicalRole"]
        for item in legal["rankedDestinations"]
    ][:2] == ["Business Analyst", "Data Scientist"]
    assert all(
        item["targetIndustryOrDomain"] == "Legal and Policy"
        for item in legal["rankedDestinations"]
    )
    assert all(
        item["interdisciplinaryFit"]["capabilityThemes"]
        for item in legal["rankedDestinations"]
    )

    assert [
        item["canonicalRole"]
        for item in creative["rankedDestinations"]
    ][:2] == ["UX Designer", "Software Engineer"]
    assert all(
        item["targetIndustryOrDomain"]
        == "Arts and Creative Technology"
        for item in creative["rankedDestinations"]
    )

    assert logic["profileFingerprint"]["domains"] == []
    logic_capabilities = {
        item["label"]
        for item in logic["profileFingerprint"]["capabilityThemes"]
    }
    assert {
        "Quantitative and Logical Reasoning",
        "Systems Problem Solving",
    } <= logic_capabilities
    assert logic["rankedDestinations"][0]["canonicalRole"] == "Data Scientist"
    assert all(
        item["targetIndustryOrDomain"] is None
        for item in logic["rankedDestinations"]
    )


def test_interdisciplinary_routes_use_supplied_project_evidence(
    client: FlaskClient,
) -> None:
    payload = _explore(client, INTERDISCIPLINARY_PROFILES["law_tech"])
    destination = payload["rankedDestinations"][0]
    route_ids = payload["buildPathIdsByDestination"][
        destination["destinationId"]
    ]
    route_nodes = {
        node_id
        for path in payload["paths"]
        if path["id"] in route_ids
        for node_id in path["nodeIds"]
    }
    nodes = {
        node["id"]: node
        for node in payload["nodes"]
        if node["id"] in route_nodes
    }

    assert any(
        "privacy compliance dashboard" in (
            f"{node['label']} {node['summary']}"
        ).lower()
        for node in nodes.values()
    )
    assert any(
        evidence["value"]
        == "Privacy compliance dashboard for a legal clinic"
        for evidence in destination["personalizationEvidence"]
    )


def test_interdisciplinary_copy_uses_grounded_profile_language(
    client: FlaskClient,
) -> None:
    profile = {
        "education": [
            "Public health coursework",
            "Computer science coursework",
        ],
        "roles": ["Program Assistant"],
        "responsibilities": [
            "Analyzed patient workflow data with Python",
            "Interviewed nurses and documented requirements",
        ],
        "skills": [
            "Python",
            "Data Analysis",
            "User Research",
            "Communication",
        ],
        "interests": ["Digital health", "Patient experience"],
        "goals": ["Use technology to improve healthcare access"],
    }
    payload = _explore(client, profile)

    for recommendation in payload["rankedDestinations"]:
        transferable = recommendation["transferableSkills"]
        assert set(transferable) <= set(profile["skills"])
        if transferable:
            expected_strengths = "; ".join(transferable[:3])
            assert (
                f"Current evidence: {expected_strengths}."
                in recommendation["explanation"]
            )
        fit = recommendation.get("interdisciplinaryFit")
        if fit and len(fit["capabilityThemes"]) >= 2:
            first, second = fit["capabilityThemes"][:2]
            assert (
                f"applies {first}; {second} in {fit['domain']['label']}"
                in recommendation["explanation"]
            )
        assert "Current evidence: Financial Analysis" not in (
            recommendation["explanation"]
        )
        assert "Current evidence: Presentation" not in (
            recommendation["explanation"]
        )

    route_step_labels = {
        node["label"]
        for node in payload["nodes"]
        if node["type"] not in {"current", "destination"}
    }
    assert any(
        " in healthcare" in label for label in route_step_labels
    )
    assert all(
        " for healthcare" not in label.lower()
        for label in route_step_labels
    )


def test_unrelated_project_is_not_repurposed_for_a_role_route(
    client: FlaskClient,
) -> None:
    payload = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {
                "education": ["Mathematics and Computer Science"],
                "roles": ["FTTP at Jane Street"],
                "responsibilities": [
                    "Studied financial markets and trading systems"
                ],
                "projects": [
                    "ACM CHI 2024 research paper",
                    "Research project",
                ],
                "skills": ["Python", "Communication", "Research"],
                "industries": ["Finance"],
                "interests": ["Markets", "Technology"],
            },
            "destinationId": "dest-financial-analyst",
        },
    ).get_json()

    route_steps = [
        node
        for node in payload["nodes"]
        if node["type"] not in {"current", "destination"}
    ]
    serialized_steps = str(route_steps).lower()
    recommendation = payload["rankedDestinations"][0]
    assert "acm chi" not in serialized_steps
    assert "acm chi" not in str(
        recommendation["personalizationEvidence"]
    ).lower()
    assert recommendation["componentScores"]["projectEvidence"]["score"] == 0
    assert any(
        "small business scenario in financial services" in node["label"]
        for node in route_steps
    )

    relevant_payload = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {
                "education": ["Mathematics and Computer Science"],
                "roles": ["FTTP at Jane Street"],
                "responsibilities": [
                    "Studied financial markets and trading systems"
                ],
                "projects": [
                    "Built an investment research model for public companies"
                ],
                "skills": ["Python", "Communication", "Research"],
                "industries": ["Finance"],
                "interests": ["Markets", "Technology"],
            },
            "destinationId": "dest-financial-analyst",
        },
    ).get_json()
    relevant_steps = [
        node
        for node in relevant_payload["nodes"]
        if node["type"] not in {"current", "destination"}
    ]
    bridge_node = next(
        node
        for node in relevant_steps
        if node["id"].startswith("bridge-financial-analyst-")
    )
    assert "investment research model" in str(relevant_steps).lower()
    assert (
        relevant_payload["rankedDestinations"][0]["componentScores"][
            "projectEvidence"
        ]["score"]
        > 0
    )
    assert bridge_node["summary"].startswith("Data Analysis ·")
    assert bridge_node["stepDetails"]["supportingEvidence"] == []
    assert "does not claim that you already held this role" in (
        bridge_node["stepDetails"]["support"]
    )


def test_generated_copy_avoids_truncation_and_skill_name_collisions(
    client: FlaskClient,
) -> None:
    profile = {
        "education": ["Mathematics and Computer Science"],
        "roles": ["Student researcher", "Cross-functional project lead"],
        "responsibilities": [
            "Built models and explained findings to reviewers",
        ],
        "projects": [
            (
                "Built an interactive music web application and presented "
                "it in a live performance for a community audience"
            ),
            "Machine learning model",
        ],
        "skills": ["Python", "Statistics", "Machine Learning"],
        "interests": ["Data", "Technology"],
    }
    payload = client.post(
        "/api/v1/maps/build",
        json={
            "profile": profile,
            "destinationId": "dest-data-scientist",
        },
    ).get_json()

    assert '..." and "Machine learning model"' in payload["profileSummary"]
    assert "...;" not in payload["profileSummary"]

    generated_text = str(payload)
    assert "Data Analysis analysis" not in generated_text
    assert any(
        "work sample applying data analysis" in str(
            node.get("stepDetails", {}).get("completionEvidence", "")
        ).lower()
        for node in payload["nodes"]
    )

    tedx_payload = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {
                "roles": ["Web developer"],
                "responsibilities": [
                    "Built and presented a music-making web application"
                ],
                "projects": [
                    "Music-making web application presented in a live TEDx demo"
                ],
                "skills": ["Software Development"],
            },
            "destinationId": "dest-software-engineer",
        },
    ).get_json()
    assert any(
        "live TEDx demo" in node["label"]
        for node in tedx_payload["nodes"]
        if node["type"] not in {"current", "destination"}
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


def test_goal_aliases_and_sparse_fallbacks_stay_relevant(
    client: FlaskClient,
) -> None:
    career_change = _explore(
        client,
        {
            "roles": ["Middle School Teacher"],
            "responsibilities": [
                "Led classes, coached students, and explained complex ideas"
            ],
            "skills": ["Communication", "Facilitation", "Planning"],
            "interests": ["Technology", "Helping customers"],
            "goals": ["Customer Success Manager"],
        },
        count=5,
    )

    assert [
        item["canonicalRole"]
        for item in career_change["rankedDestinations"]
    ] == ["Customer Success Specialist", "Customer Service Manager"]
    assert career_change["dreamCareer"]["aspirationSource"] == "user_selected"
    assert "Engineering Manager" not in {
        item["canonicalRole"]
        for item in career_change["rankedDestinations"]
    }

    sparse = _explore(
        client,
        {
            "education": ["High school student"],
            "interests": ["Helping people"],
        },
        count=5,
    )

    assert [
        item["canonicalRole"] for item in sparse["rankedDestinations"]
    ] == ["HR Coordinator", "Customer Success Specialist"]
    assert sparse["rankedDestinations"][1]["explanation"].startswith(
        "Current evidence: limited role-specific evidence."
    )
    serialized = str(sparse)
    assert "the upload" not in serialized.lower()
    assert "uploaded profile" not in serialized.lower()


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


def test_explore_never_returns_only_one_career_option(
    client: FlaskClient,
) -> None:
    response = client.post(
        "/api/v1/maps/explore",
        json={
            "profile": {
                **CONTRASTING_PROFILES["software"],
                "constraints": {
                    "excludedRoles": [
                        role_id
                        for role_id in ROLE_BY_ID
                        if role_id != "software-engineer"
                    ],
                    "excludedIndustries": [],
                },
            },
            "resultCount": 4,
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == {
        "code": "INSUFFICIENT_DESTINATION_VARIETY",
        "message": (
            "PathIn needs at least two distinct career options. Adjust the "
            "profile exclusions or add more career evidence."
        ),
        "retryable": False,
        "details": {
            "minimumCareerOptions": 2,
            "eligibleCareerOptions": 1,
        },
    }


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


def test_results_prioritize_credible_matches_and_are_explainable(
    client: FlaskClient,
) -> None:
    payload = _explore(client, CONTRASTING_PROFILES["data"], count=5)
    recommendations = payload["rankedDestinations"]

    assert 2 <= len(recommendations) <= 5
    assert len({item["title"] for item in recommendations}) == len(
        recommendations
    )
    assert [
        item["canonicalRole"]
        for item in recommendations
    ] == ["Data Scientist", "Data Analyst"]
    assert all(
        item["confidence"] != "exploratory"
        for item in recommendations
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
        assert item["explanation"].startswith("Current evidence:")
        assert len(item["explanation"]) < 160
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
            "projects": ["Small data dashboard | Python, SQL, Tableau"],
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
                if node_id.startswith("bridge-"):
                    assert set(details["skillsDeveloped"]) & set(
                        recommendation["skills"]
                    )
                    assert details["supportingEvidence"] == []
                    assert "maintained taxonomy" in details["support"]
                else:
                    assert details["gapAddressed"] in supported_gaps
                    assert details["supportingEvidence"]
                    assert "Small data dashboard" in details["support"]
                assert details["requirement"] in {
                    "optional",
                    "recommended",
                    "necessary",
                }
                assert details["effort"]
                assert details["completionEvidence"]
                assert "evidence project" not in node_by_id[node_id][
                    "label"
                ].lower()
                if node_by_id[node_id]["type"] == "experience":
                    assert "|" not in node_by_id[node_id]["label"]
                if node_id.startswith("project-"):
                    summary = node_by_id[node_id]["summary"]
                    assert summary.startswith(details["gapAddressed"])
                    assert "extend '" not in summary.lower()
                    assert "evidence that demonstrates" not in summary.lower()
                    assert "|" not in summary


def test_generated_route_copy_uses_real_artifacts_and_credible_learning(
    client: FlaskClient,
) -> None:
    robotics_profile = {
        "roles": ["BattleBots Team Captain"],
        "responsibilities": [
            "Designed an aluminum chassis in Fusion 360",
            "Integrated Arduino sensors and soldered electronics",
        ],
        "projects": ["Built and tested a combat robot"],
        "skills": [
            "CAD",
            "Arduino",
            "Embedded Systems",
            "Electronics",
            "Soldering",
        ],
        "interests": ["Robotics", "Manufacturing"],
    }
    robotics = client.post(
        "/api/v1/maps/build",
        json={
            "profile": robotics_profile,
            "destinationId": "dest-robotics-engineer",
        },
    ).get_json()
    robotics_nodes = {node["id"]: node for node in robotics["nodes"]}
    robotics_route_nodes = [
        robotics_nodes[node_id]
        for path in robotics["paths"]
        for node_id in path["nodeIds"][1:-1]
    ]
    assert any(
        node["label"] == "Design, integrate, and test a combat robot"
        for node in robotics_route_nodes
    )
    assert any(
        node["label"] == "Guided Prototyping learning plan"
        and node["sourceRecord"]["kind"] == "taxonomy"
        for node in robotics_route_nodes
    )
    assert all(
        "and tested a combat robot" not in node["label"].lower()
        for node in robotics_route_nodes
    )

    hardware = client.post(
        "/api/v1/maps/build",
        json={
            "profile": robotics_profile,
            "destinationId": "dest-hardware-test-engineer",
        },
    ).get_json()
    hardware_labels = {node["label"] for node in hardware["nodes"]}
    assert "Guided Hardware Testing learning plan" in hardware_labels
    assert "Business Analytics Foundations" not in hardware_labels
    assert "Quality Assurance Analyst" in hardware_labels

    career_change = client.post(
        "/api/v1/maps/build",
        json={
            "profile": {
                "roles": ["Elementary School Teacher"],
                "responsibilities": [
                    "Designed lessons and explained complex ideas to families"
                ],
                "skills": ["Teaching", "Communication", "Planning"],
            },
            "destinationId": "dest-customer-success-specialist",
        },
    ).get_json()
    career_change_labels = {node["label"] for node in career_change["nodes"]}
    assert (
        "Design product adoption for a sample product in education"
        in career_change_labels
    )
    assert "Customer Service Manager" not in career_change_labels
    assert all(
        "for elementary school teacher" not in label.lower()
        for label in career_change_labels
    )

    data_science = client.post(
        "/api/v1/maps/build",
        json={
            "profile": CONTRASTING_PROFILES["data"],
            "destinationId": "dest-data-scientist",
        },
    ).get_json()
    data_science_labels = {node["label"] for node in data_science["nodes"]}
    assert "Guided Experimentation learning plan" in data_science_labels
    assert "Effective Communication Skills" not in data_science_labels
    assert "Expand Data Analyst scope" in data_science_labels
    assert data_science["profileSummary"].startswith(
        "Your enabled profile input shows Data Analyst."
    )

    data_analyst = client.post(
        "/api/v1/maps/build",
        json={
            "profile": CONTRASTING_PROFILES["data"],
            "destinationId": "dest-data-analyst",
        },
    ).get_json()
    assert "Business Analytics Foundations" in {
        node["label"] for node in data_analyst["nodes"]
    }


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


def test_saved_map_preserves_validated_route_customizations(
    client: FlaskClient,
) -> None:
    created = _explore(client, CONTRASTING_PROFILES["design"])
    map_id = created["id"]
    edited_node_id = next(
        node["id"]
        for node in created["nodes"]
        if node["id"] != "current" and node["type"] != "destination"
    )
    custom_node = {
        "id": "custom-step-review",
        "type": "experience",
        "label": "Present a portfolio review",
        "eyebrow": "Custom path step",
        "summary": "Explain design choices and evidence to a reviewer.",
        "stage": "User-added step",
        "workSetting": "Portfolio review",
        "whyItFits": ["The user added this step."],
        "responsibilities": ["Present the work and collect feedback."],
        "existingSkills": [],
        "transferableSkills": ["Communication"],
        "skillsToBuild": [],
        "preview": "Explain design choices and evidence to a reviewer.",
        "challenges": [],
        "sourceRecord": {
            "id": "custom-step-review",
            "kind": "generated",
            "label": "User-created Build My Path step",
        },
    }
    nodes = [
        {
            **node,
            "label": (
                "Run a focused design critique"
                if node["id"] == edited_node_id
                else node["label"]
            ),
            "summary": (
                "Gather structured feedback on one design artifact."
                if node["id"] == edited_node_id
                else node["summary"]
            ),
        }
        for node in created["nodes"]
    ]
    nodes.append(custom_node)
    paths = [{**path, "nodeIds": list(path["nodeIds"])} for path in created["paths"]]
    paths[0]["nodeIds"].insert(-1, custom_node["id"])

    saved = client.patch(
        f"/api/v1/maps/{map_id}",
        json={
            "nodes": nodes,
            "paths": paths,
            "pinnedNodeIds": [custom_node["id"]],
            "dismissedNodeIds": [],
        },
    )

    assert saved.status_code == 200
    payload = saved.get_json()
    assert next(
        node for node in payload["nodes"] if node["id"] == edited_node_id
    )["label"] == "Run a focused design critique"
    assert next(
        node for node in payload["nodes"] if node["id"] == custom_node["id"]
    )["sourceRecord"]["label"] == "User-customized Build My Path step"
    assert custom_node["id"] in payload["paths"][0]["nodeIds"]
    assert payload["pinnedNodeIds"] == [custom_node["id"]]

    reopened = client.get(f"/api/v1/maps/{map_id}")
    assert reopened.status_code == 200
    assert custom_node["id"] in reopened.get_json()["paths"][0]["nodeIds"]

    invalid_paths = [
        {**path, "nodeIds": list(path["nodeIds"])}
        for path in payload["paths"]
    ]
    invalid_paths[0]["nodeIds"][0] = "unknown-node"
    rejected = client.patch(
        f"/api/v1/maps/{map_id}",
        json={"paths": invalid_paths},
    )
    assert rejected.status_code == 400
    assert (
        rejected.get_json()["error"]["code"]
        == "INVALID_MAP_CUSTOMIZATION"
    )


def test_regenerate_returns_a_new_destination_set(
    client: FlaskClient,
) -> None:
    created = _explore(client, CONTRASTING_PROFILES["design"])

    regenerated = client.post(
        f"/api/v1/maps/{created['id']}/regenerate",
        json={
            "profile": CONTRASTING_PROFILES["design"],
            "action": "regenerate",
        },
    )

    assert regenerated.status_code == 201
    payload = regenerated.get_json()
    assert payload["id"] != created["id"]
    assert set(payload["destinationIds"]).isdisjoint(
        created["destinationIds"]
    )
    assert payload["generationConstraints"]["feedback"][
        "regeneratedFromRoleIds"
    ] == created["destinationIds"]


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
            "message": "Choose a destination returned by the PathIn catalog.",
            "retryable": False,
            "details": {"destinationId": "astronaut"},
        }
    }
