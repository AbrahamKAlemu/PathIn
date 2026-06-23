from __future__ import annotations

import copy
import json
import ssl
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Protocol
from urllib.request import Request, urlopen

import certifi

PIT_BASE_URL = "https://pit.najera.cc"
PRIVACY_THRESHOLD = 20


class ApiError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        retryable: bool = False,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "retryable": self.retryable,
                "details": self.details,
            }
        }


SNAPSHOT_EVIDENCE: dict[str, Any] = {
    "source": {
        "name": "Possibilities in Tech Hackathon 2026 dataset",
        "url": f"{PIT_BASE_URL}/",
        "status": "snapshot",
        "memberCount": 2000,
        "jobCount": 1000,
        "courseCount": 600,
        "cohortCount": 435,
        "note": (
            "The PIT dataset is synthetic. Exact transition counts below the "
            "20-profile privacy threshold are never returned by this API."
        ),
    },
    "transitionCounts": {
        "Software Engineer (Entry) -> DevOps Engineer (Mid)": 4,
        "DevOps Engineer (Mid) -> Data Scientist (Senior)": 4,
        "Data Scientist (Entry) -> Data Scientist (Mid)": 0,
        "Product Manager (Entry) -> Product Manager (Mid)": 1,
        "UX Designer (Entry) -> UX Designer (Mid)": 4,
    },
    "roles": {
        "data-scientist": {
            "canonicalTitle": "Data Scientist",
            "postingCount": 18,
            "averageSalaryFrom": 89845,
            "averageSalaryTo": 170239,
            "locations": [
                "Seattle, WA",
                "Austin, TX",
                "New York, NY",
                "San Francisco, CA",
                "Boston, MA",
            ],
        },
        "devops-engineer": {
            "canonicalTitle": "DevOps Engineer",
            "postingCount": 24,
            "averageSalaryFrom": 96862,
            "averageSalaryTo": 168359,
            "locations": [
                "San Francisco, CA",
                "Seattle, WA",
                "Boston, MA",
                "Austin, TX",
                "New York, NY",
            ],
        },
        "product-manager": {
            "canonicalTitle": "Product Manager",
            "postingCount": 21,
            "averageSalaryFrom": 106939,
            "averageSalaryTo": 180669,
            "locations": [
                "Seattle, WA",
                "Boston, MA",
                "Austin, TX",
                "San Francisco, CA",
                "New York, NY",
            ],
        },
        "software-engineer": {
            "canonicalTitle": "Software Engineer",
            "postingCount": 15,
            "averageSalaryFrom": 89649,
            "averageSalaryTo": 165508,
            "locations": [
                "Austin, TX",
                "Boston, MA",
                "New York, NY",
                "Seattle, WA",
                "San Francisco, CA",
            ],
        },
        "ux-designer": {
            "canonicalTitle": "UX Designer",
            "postingCount": 20,
            "averageSalaryFrom": 93293,
            "averageSalaryTo": 178390,
            "locations": [
                "Austin, TX",
                "Boston, MA",
                "New York, NY",
                "Seattle, WA",
                "San Francisco, CA",
            ],
        },
    },
    "courses": {
        "cloud": {
            "id": "course_3546",
            "name": "Cloud Computing with AWS",
            "skills": ["AWS", "DevOps", "Blockchain"],
            "level": "Easy",
            "length": "3 hours",
        },
        "machine-learning": {
            "id": "course_1476",
            "name": "Machine Learning Fundamentals",
            "skills": ["Machine Learning", "Python", "Data Analysis"],
            "level": "Easy",
            "length": "5 hours",
        },
        "project-management": {
            "id": "course_2852",
            "name": "Project Management Basics",
            "skills": ["Project Planning", "Agile", "Scrum"],
            "level": "Easy",
            "length": "6 hours",
        },
        "ux-design": {
            "id": "course_6335",
            "name": "UX/UI Design",
            "skills": ["Graphic Design", "Photoshop", "UX/UI"],
            "level": "Medium",
            "length": "8 hours",
        },
    },
}


class EvidenceRepository(Protocol):
    def get_evidence(self) -> dict[str, Any]:
        ...


class SnapshotPitRepository:
    def get_evidence(self) -> dict[str, Any]:
        return copy.deepcopy(SNAPSHOT_EVIDENCE)


class PitRepository:
    def __init__(self, *, cache_seconds: int = 3600, timeout_seconds: int = 8):
        self.cache_seconds = cache_seconds
        self.timeout_seconds = timeout_seconds
        self._cache: dict[str, Any] | None = None
        self._expires_at = 0.0
        self._lock = threading.Lock()

    def get_evidence(self) -> dict[str, Any]:
        with self._lock:
            now = time.monotonic()
            if self._cache is not None and now < self._expires_at:
                return copy.deepcopy(self._cache)

            try:
                users = self._fetch_json("/user_data.json")
                jobs = self._fetch_json("/jobs_data.json")
                courses = self._fetch_json("/course_data.json")
                evidence = self._aggregate(users, jobs, courses)
            except (OSError, TimeoutError, ValueError, KeyError, TypeError):
                evidence = copy.deepcopy(SNAPSHOT_EVIDENCE)

            self._cache = evidence
            self._expires_at = now + self.cache_seconds
            return copy.deepcopy(evidence)

    def _fetch_json(self, path: str) -> list[dict[str, Any]]:
        request = Request(
            f"{PIT_BASE_URL}{path}",
            headers={"User-Agent": "PathIn-Prototype/0.1"},
        )
        tls_context = ssl.create_default_context(cafile=certifi.where())
        with urlopen(
            request,
            timeout=self.timeout_seconds,
            context=tls_context,
        ) as response:
            payload = json.load(response)
        if not isinstance(payload, list):
            raise ValueError(f"Expected a JSON list from {path}")
        return payload

    def _aggregate(
        self,
        users: list[dict[str, Any]],
        jobs: list[dict[str, Any]],
        courses: list[dict[str, Any]],
    ) -> dict[str, Any]:
        job_by_id = {job["id"]: job for job in jobs}
        cohort = [
            member
            for member in users
            if any(
                any(
                    field in str(school.get("degree", "")).lower()
                    for field in (
                        "computer science",
                        "software engineering",
                        "information technology",
                    )
                )
                for school in member.get("school_history", [])
            )
        ]
        transition_counts: dict[str, int] = {}
        for member in cohort:
            history = [
                job_by_id[job_id]
                for job_id in member.get("job_history", [])
                if job_id in job_by_id
            ]
            for source, target in zip(history, history[1:]):
                key = (
                    f"{source['position']} ({source['level']}) -> "
                    f"{target['position']} ({target['level']})"
                )
                transition_counts[key] = transition_counts.get(key, 0) + 1

        role_names = {
            "data-scientist": "Data Scientist",
            "devops-engineer": "DevOps Engineer",
            "product-manager": "Product Manager",
            "software-engineer": "Software Engineer",
            "ux-designer": "UX Designer",
        }
        role_evidence: dict[str, dict[str, Any]] = {}
        for role_id, title in role_names.items():
            matches = [
                job
                for job in jobs
                if job.get("position") == title
                and job.get("industry") == "Technology"
            ]
            if not matches:
                role_evidence[role_id] = copy.deepcopy(
                    SNAPSHOT_EVIDENCE["roles"][role_id]
                )
                continue
            salary_from = [
                int(job["salary_range"]["from"]) for job in matches
            ]
            salary_to = [int(job["salary_range"]["to"]) for job in matches]
            role_evidence[role_id] = {
                "canonicalTitle": title,
                "postingCount": len(matches),
                "averageSalaryFrom": round(sum(salary_from) / len(salary_from)),
                "averageSalaryTo": round(sum(salary_to) / len(salary_to)),
                "locations": sorted(
                    {str(job.get("location", "")) for job in matches}
                ),
            }

        course_names = {
            "cloud": "Cloud Computing with AWS",
            "machine-learning": "Machine Learning Fundamentals",
            "project-management": "Project Management Basics",
            "ux-design": "UX/UI Design",
        }
        course_evidence: dict[str, dict[str, Any]] = {}
        for course_id, name in course_names.items():
            match = next(
                (
                    course
                    for course in courses
                    if course.get("name") == name
                    and course.get("level") == "Easy"
                ),
                None,
            ) or next(
                (course for course in courses if course.get("name") == name),
                None,
            )
            if match is None:
                course_evidence[course_id] = copy.deepcopy(
                    SNAPSHOT_EVIDENCE["courses"][course_id]
                )
                continue
            length = match.get("length", {})
            course_evidence[course_id] = {
                "id": match["id"],
                "name": match["name"],
                "skills": list(match.get("skills", [])),
                "level": match.get("level", "Unknown"),
                "length": (
                    f"{length.get('value', 'Unknown')} "
                    f"{length.get('unit', '')}".strip()
                ),
            }

        return {
            "source": {
                "name": "Possibilities in Tech Hackathon 2026 dataset",
                "url": f"{PIT_BASE_URL}/",
                "status": "live",
                "memberCount": len(users),
                "jobCount": len(jobs),
                "courseCount": len(courses),
                "cohortCount": len(cohort),
                "note": (
                    "The PIT dataset is synthetic. Exact transition counts "
                    "below the 20-profile privacy threshold are never returned."
                ),
            },
            "transitionCounts": transition_counts,
            "roles": role_evidence,
            "courses": course_evidence,
        }


ROLE_DETAILS: dict[str, dict[str, Any]] = {
    "data-scientist": {
        "id": "data-scientist",
        "canonicalTitle": "Data Scientist",
        "aliases": ["Applied Data Scientist", "Machine Learning Scientist"],
        "careerFamily": "Data and AI",
        "description": (
            "Uses data, statistics, and code to answer questions and build "
            "decision-support or predictive systems."
        ),
        "responsibilities": [
            "Frame measurable questions with partners.",
            "Prepare and analyze data.",
            "Evaluate models and explain uncertainty.",
            "Communicate findings to technical and non-technical audiences.",
        ],
        "skills": [
            "Python",
            "Statistics",
            "Data analysis",
            "Machine learning",
            "Communication",
        ],
        "workEnvironment": "Cross-functional technology or analytics team",
    },
    "product-manager": {
        "id": "product-manager",
        "canonicalTitle": "Product Manager",
        "aliases": ["Associate Product Manager", "Technical Product Manager"],
        "careerFamily": "Product",
        "description": (
            "Connects user needs, business goals, and technical constraints to "
            "guide what a team builds and why."
        ),
        "responsibilities": [
            "Research user and customer problems.",
            "Prioritize opportunities and tradeoffs.",
            "Define outcomes and coordinate delivery.",
            "Review evidence and adapt the roadmap.",
        ],
        "skills": [
            "User discovery",
            "Prioritization",
            "Communication",
            "Roadmapping",
            "Technical fluency",
        ],
        "workEnvironment": "Cross-functional product and engineering team",
    },
    "ux-designer": {
        "id": "ux-designer",
        "canonicalTitle": "UX Designer",
        "aliases": ["Product Designer", "Interaction Designer"],
        "careerFamily": "Design",
        "description": (
            "Researches user needs and designs understandable, useful product "
            "experiences within technical and business constraints."
        ),
        "responsibilities": [
            "Plan and synthesize user research.",
            "Map journeys and interaction flows.",
            "Prototype and test design options.",
            "Partner with product and engineering on implementation quality.",
        ],
        "skills": [
            "User research",
            "Interaction design",
            "Prototyping",
            "Facilitation",
            "Visual communication",
        ],
        "workEnvironment": "Collaborative product design team",
    },
}


NODE_FIXTURES: dict[str, dict[str, Any]] = {
    "course-ml": {
        "type": "education_milestone",
        "label": "Machine Learning Fundamentals",
        "summary": "Build a bridge from quantitative coursework to applied data work.",
        "existingSkills": ["Programming", "Quantitative reasoning"],
        "transferableSkills": ["Python", "Data analysis"],
        "skillGaps": ["Model evaluation", "Data storytelling"],
    },
    "skill-data-analysis": {
        "type": "skill",
        "label": "Applied data analysis",
        "summary": (
            "Turn Python and quantitative reasoning into repeatable analysis, "
            "evaluation, and communication."
        ),
        "existingSkills": ["Programming", "Quantitative reasoning"],
        "transferableSkills": ["Structured analysis", "Evidence communication"],
        "skillGaps": ["Data cleaning", "Model evaluation", "Data storytelling"],
    },
    "data-project": {
        "type": "experience",
        "label": "Applied data project",
        "summary": "Frame a question, analyze a public dataset, and explain the result.",
        "existingSkills": ["Programming", "Mathematics"],
        "transferableSkills": ["Research framing", "Evidence communication"],
        "skillGaps": ["Data cleaning", "Model evaluation"],
    },
    "data-entry": {
        "type": "entry_role",
        "label": "Entry-level Data Scientist",
        "summary": "Contribute analysis and modeling with guidance from senior teammates.",
        "existingSkills": ["Python", "Quantitative reasoning"],
        "transferableSkills": ["Structured analysis", "Technical communication"],
        "skillGaps": ["Production data workflows", "Experiment design"],
    },
    "data-senior": {
        "type": "destination_role",
        "roleId": "data-scientist",
        "label": "Senior Data Scientist",
        "summary": "Lead analytical projects and communicate evidence responsibly.",
        "existingSkills": ["Technical foundation", "Quantitative reasoning"],
        "transferableSkills": ["Problem framing", "Communication"],
        "skillGaps": ["Technical leadership", "Advanced model evaluation"],
    },
    "course-cloud": {
        "type": "education_milestone",
        "label": "Cloud Computing with AWS",
        "summary": "Add cloud and delivery vocabulary to a software foundation.",
        "existingSkills": ["Programming", "Debugging"],
        "transferableSkills": ["AWS", "Automation"],
        "skillGaps": ["Infrastructure as code", "Reliability"],
    },
    "software-entry": {
        "type": "entry_role",
        "roleId": "software-engineer",
        "label": "Entry-level Software Engineer",
        "summary": "Build, test, and maintain software with a product team.",
        "existingSkills": ["Programming", "Problem solving"],
        "transferableSkills": ["Debugging", "Systems thinking"],
        "skillGaps": ["Production ownership", "Architecture"],
    },
    "devops-mid": {
        "type": "intermediate_role",
        "roleId": "devops-engineer",
        "label": "Mid-level DevOps Engineer",
        "summary": "Improve automation, reliability, and delivery systems.",
        "existingSkills": ["Software fundamentals", "Cloud concepts"],
        "transferableSkills": ["Automation", "Operational analysis"],
        "skillGaps": ["Data modeling", "Statistical evaluation"],
    },
    "course-product": {
        "type": "education_milestone",
        "label": "Project Management Basics",
        "summary": "Learn the planning language used by cross-functional teams.",
        "existingSkills": ["Technical communication", "Organization"],
        "transferableSkills": ["Agile", "Project planning"],
        "skillGaps": ["User discovery", "Prioritization"],
    },
    "skill-product-discovery": {
        "type": "skill",
        "label": "Product discovery",
        "summary": (
            "Identify a user problem, test assumptions, and make explicit "
            "priority tradeoffs."
        ),
        "existingSkills": ["Technical problem solving", "Communication"],
        "transferableSkills": ["Interviewing", "Decision making"],
        "skillGaps": ["User research", "Prioritization", "Outcome framing"],
    },
    "product-project": {
        "type": "experience",
        "label": "Product discovery sprint",
        "summary": "Interview users, prioritize a need, and ship a focused prototype.",
        "existingSkills": ["Technical execution", "Problem solving"],
        "transferableSkills": ["Decision making", "Communication"],
        "skillGaps": ["User research", "Roadmapping"],
    },
    "product-entry": {
        "type": "entry_role",
        "label": "Associate Product Manager",
        "summary": "Support discovery, prioritization, and delivery for a product area.",
        "existingSkills": ["Technical fluency", "Communication"],
        "transferableSkills": ["Cross-functional coordination", "Analysis"],
        "skillGaps": ["Product strategy", "Outcome measurement"],
    },
    "product-mid": {
        "type": "destination_role",
        "roleId": "product-manager",
        "label": "Product Manager",
        "summary": "Guide a team from user problem through measurable product outcome.",
        "existingSkills": ["Technical context", "Structured problem solving"],
        "transferableSkills": ["Communication", "Prioritization"],
        "skillGaps": ["Product strategy", "Stakeholder leadership"],
    },
    "feature-lead": {
        "type": "experience",
        "label": "Lead a cross-functional feature",
        "summary": "Own a small feature from user context through release and learning.",
        "existingSkills": ["Software delivery", "Technical communication"],
        "transferableSkills": ["Ownership", "Tradeoff decisions"],
        "skillGaps": ["User discovery", "Roadmapping"],
    },
    "course-ux": {
        "type": "education_milestone",
        "label": "UX/UI Design",
        "summary": "Add user-centered design methods to a technical foundation.",
        "existingSkills": ["Problem decomposition", "Technical context"],
        "transferableSkills": ["UX/UI", "Visual communication"],
        "skillGaps": ["Research synthesis", "Interaction design"],
    },
    "skill-user-research": {
        "type": "skill",
        "label": "User research",
        "summary": (
            "Ask useful questions, synthesize patterns, and connect evidence "
            "to design decisions."
        ),
        "existingSkills": ["Analytical thinking", "Communication"],
        "transferableSkills": ["Interviewing", "Synthesis"],
        "skillGaps": [
            "Research planning",
            "Usability testing",
            "Insight communication",
        ],
    },
    "ux-project": {
        "type": "experience",
        "label": "UX case study",
        "summary": "Research a user problem and document design decisions in a case study.",
        "existingSkills": ["Problem solving", "Communication"],
        "transferableSkills": ["Interviewing", "Prototyping"],
        "skillGaps": ["Usability testing", "Portfolio storytelling"],
    },
    "ux-entry": {
        "type": "entry_role",
        "label": "Entry-level UX Designer",
        "summary": "Support research, flows, prototypes, and implementation quality.",
        "existingSkills": ["Technical context", "Visual communication"],
        "transferableSkills": ["Facilitation", "Systems thinking"],
        "skillGaps": ["Design systems", "Research planning"],
    },
    "ux-mid": {
        "type": "destination_role",
        "roleId": "ux-designer",
        "label": "Product Designer",
        "summary": "Own user-centered design for a product area.",
        "existingSkills": ["Technical context", "Problem decomposition"],
        "transferableSkills": ["Systems thinking", "Facilitation"],
        "skillGaps": ["Design strategy", "Research leadership"],
    },
}


PATH_FIXTURES: dict[str, dict[str, Any]] = {
    "data-project": {
        "destinationId": "data-senior",
        "label": "Project-first data route",
        "strategy": "Lower-barrier evidence building",
        "nodeIds": [
            "current",
            "course-ml",
            "skill-data-analysis",
            "data-project",
            "data-entry",
            "data-senior",
        ],
    },
    "data-engineering": {
        "destinationId": "data-senior",
        "label": "Engineering-to-data route",
        "strategy": "Transferable technical skills",
        "nodeIds": [
            "current",
            "course-cloud",
            "software-entry",
            "devops-mid",
            "data-senior",
        ],
    },
    "product-project": {
        "destinationId": "product-mid",
        "label": "Discovery-first product route",
        "strategy": "Project-first transition",
        "nodeIds": [
            "current",
            "course-product",
            "skill-product-discovery",
            "product-project",
            "product-entry",
            "product-mid",
        ],
    },
    "product-technical": {
        "destinationId": "product-mid",
        "label": "Technical product route",
        "strategy": "Transferable technical skills",
        "nodeIds": [
            "current",
            "software-entry",
            "feature-lead",
            "product-entry",
            "product-mid",
        ],
    },
    "ux-portfolio": {
        "destinationId": "ux-mid",
        "label": "Portfolio-first design route",
        "strategy": "Portfolio evidence",
        "nodeIds": [
            "current",
            "course-ux",
            "skill-user-research",
            "ux-project",
            "ux-entry",
            "ux-mid",
        ],
    },
    "ux-technical": {
        "destinationId": "ux-mid",
        "label": "Engineering-to-design route",
        "strategy": "Adjacent-role transition",
        "nodeIds": [
            "current",
            "software-entry",
            "course-ux",
            "skill-user-research",
            "ux-entry",
            "ux-mid",
        ],
    },
}


TRANSITION_KEYS = {
    ("software-entry", "devops-mid"): (
        "Software Engineer (Entry) -> DevOps Engineer (Mid)"
    ),
    ("devops-mid", "data-senior"): (
        "DevOps Engineer (Mid) -> Data Scientist (Senior)"
    ),
    ("data-entry", "data-senior"): (
        "Data Scientist (Entry) -> Data Scientist (Mid)"
    ),
    ("product-entry", "product-mid"): (
        "Product Manager (Entry) -> Product Manager (Mid)"
    ),
    ("ux-entry", "ux-mid"): "UX Designer (Entry) -> UX Designer (Mid)",
}


class CareerService:
    def __init__(self, repository: EvidenceRepository | None = None) -> None:
        self.repository = repository or PitRepository()
        self._maps: dict[str, dict[str, Any]] = {}
        self._feedback: list[dict[str, Any]] = []
        self._lock = threading.Lock()

    def normalize_profile(self, payload: dict[str, Any]) -> dict[str, Any]:
        profile = payload.get("profile", payload)
        if not isinstance(profile, dict):
            raise ApiError(
                "INVALID_PROFILE",
                "Profile input must be a JSON object.",
                details={"field": "profile"},
            )

        normalized = {
            "id": str(profile.get("id", "demo-profile")),
            "education": self._string_list(profile.get("education")),
            "coursework": self._string_list(profile.get("coursework")),
            "experience": self._string_list(profile.get("experience")),
            "projects": self._string_list(profile.get("projects")),
            "activities": self._string_list(profile.get("activities")),
            "volunteering": self._string_list(profile.get("volunteering")),
            "skills": self._string_list(profile.get("skills")),
            "interests": self._string_list(profile.get("interests")),
            "goals": self._string_list(profile.get("goals")),
            "locationPreferences": self._string_list(
                profile.get("locationPreferences")
                or profile.get("location")
            ),
            "preferences": self._object(profile.get("preferences")),
            "constraints": self._object(profile.get("constraints")),
            "consent": self._object(profile.get("consent")),
            "fieldProvenance": self._object(profile.get("fieldProvenance")),
        }

        if not any(
            normalized[field]
            for field in (
                "education",
                "coursework",
                "experience",
                "projects",
                "activities",
                "volunteering",
                "skills",
                "interests",
            )
        ):
            normalized.update(self._demo_profile())

        normalized["inferredFields"] = {
            "educationStage": self._education_stage(normalized["education"]),
            "careerStage": (
                "early_career"
                if normalized["experience"]
                else "student_or_exploring"
            ),
        }
        normalized["warnings"] = [
            "Review all inferred fields before generating a path.",
            "Sensitive demographic attributes are not used for recommendations.",
        ]
        return normalized

    def explore(self, payload: dict[str, Any]) -> dict[str, Any]:
        profile = self.normalize_profile(payload)
        excluded = set(self._string_list(payload.get("excludedRoles")))
        path_ids = [
            path_id
            for path_id in ("data-project", "product-project", "ux-portfolio")
            if PATH_FIXTURES[path_id]["destinationId"] not in excluded
        ]
        pinned = set(self._string_list(payload.get("pinnedDestinations")))
        for path_id, path in PATH_FIXTURES.items():
            if (
                path["destinationId"] in pinned
                and path_id not in path_ids
                and len(path_ids) < 5
            ):
                path_ids.append(path_id)
        if not path_ids:
            raise ApiError(
                "NO_DESTINATIONS",
                "All available prototype destinations were excluded.",
                details={"availableDestinationIds": self.destination_ids()},
            )
        return self._create_map(
            mode="explore",
            profile=profile,
            path_ids=path_ids[:5],
            constraints=self._object(payload.get("preferences")),
        )

    def build(self, payload: dict[str, Any]) -> dict[str, Any]:
        profile = self.normalize_profile(payload)
        destination = str(payload.get("destinationId", "")).strip()
        if destination not in self.destination_ids():
            raise ApiError(
                "INVALID_DESTINATION",
                "Choose a supported destination before building a path.",
                details={"availableDestinationIds": self.destination_ids()},
            )
        path_ids = [
            path_id
            for path_id, path in PATH_FIXTURES.items()
            if path["destinationId"] == destination
        ][:3]
        return self._create_map(
            mode="build",
            profile=profile,
            path_ids=path_ids,
            constraints=self._object(payload.get("constraints")),
            pinned_node_ids=self._string_list(payload.get("pinnedNodeIds")),
            dismissed_node_ids=self._string_list(
                payload.get("dismissedNodeIds")
            ),
        )

    def demo_map(self) -> dict[str, Any]:
        return self.explore({"profile": self._demo_profile()})

    def get_map(self, map_id: str) -> dict[str, Any]:
        with self._lock:
            career_map = self._maps.get(map_id)
            if career_map is None:
                raise ApiError(
                    "MAP_NOT_FOUND",
                    "The requested career map was not found.",
                    status_code=404,
                )
            return copy.deepcopy(career_map)

    def update_map(
        self, map_id: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        allowed = {
            "name",
            "pinnedNodeIds",
            "dismissedNodeIds",
            "viewport",
        }
        unknown = set(payload) - allowed
        if unknown:
            raise ApiError(
                "UNSUPPORTED_MAP_UPDATE",
                "One or more map fields cannot be updated.",
                details={"unsupportedFields": sorted(unknown)},
            )
        with self._lock:
            career_map = self._maps.get(map_id)
            if career_map is None:
                raise ApiError(
                    "MAP_NOT_FOUND",
                    "The requested career map was not found.",
                    status_code=404,
                )
            node_ids = {node["id"] for node in career_map["nodes"]}
            for field in ("pinnedNodeIds", "dismissedNodeIds"):
                if field in payload:
                    values = self._string_list(payload[field])
                    invalid = sorted(set(values) - node_ids)
                    if invalid:
                        raise ApiError(
                            "INVALID_NODE",
                            "The update references a node outside this map.",
                            details={"nodeIds": invalid},
                        )
                    career_map[field] = values
            if "name" in payload:
                career_map["name"] = str(payload["name"]).strip()[:120]
            if "viewport" in payload:
                career_map["viewport"] = self._object(payload["viewport"])
            career_map["updatedAt"] = self._timestamp()
            return copy.deepcopy(career_map)

    def regenerate(
        self, map_id: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        current = self.get_map(map_id)
        merged_payload = {
            "profile": payload.get("profile", current["profileSnapshot"]),
            "pinnedNodeIds": payload.get(
                "pinnedNodeIds", current["pinnedNodeIds"]
            ),
            "dismissedNodeIds": payload.get(
                "dismissedNodeIds", current["dismissedNodeIds"]
            ),
            "constraints": payload.get(
                "constraints", current["generationConstraints"]
            ),
        }
        if current["mode"] == "build":
            merged_payload["destinationId"] = current["destinationIds"][0]
            regenerated = self.build(merged_payload)
        else:
            regenerated = self.explore(merged_payload)
            regenerated["pinnedNodeIds"] = merged_payload["pinnedNodeIds"]
            regenerated["dismissedNodeIds"] = merged_payload[
                "dismissedNodeIds"
            ]
        regenerated["previousMapId"] = map_id
        return regenerated

    def add_feedback(
        self, map_id: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        career_map = self.get_map(map_id)
        category = str(payload.get("category", "")).strip()
        allowed_categories = {
            "helpful",
            "not_helpful",
            "incorrect",
            "unsafe",
            "biased",
            "other",
        }
        if category not in allowed_categories:
            raise ApiError(
                "INVALID_FEEDBACK",
                "Choose a supported feedback category.",
                details={"allowedCategories": sorted(allowed_categories)},
            )
        target = self._object(payload.get("target"))
        feedback = {
            "id": f"feedback_{uuid.uuid4().hex}",
            "mapId": map_id,
            "target": target,
            "category": category,
            "comment": str(payload.get("comment", "")).strip()[:2000],
            "safetyOrBias": bool(
                payload.get("safetyOrBias")
                or category in {"unsafe", "biased"}
            ),
            "generation": copy.deepcopy(career_map["generation"]),
            "createdAt": self._timestamp(),
        }
        with self._lock:
            self._feedback.append(feedback)
        return {
            "accepted": True,
            "feedbackId": feedback["id"],
            "message": "Feedback recorded for this prototype session.",
        }

    def role_details(self, role_id: str) -> dict[str, Any]:
        role = ROLE_DETAILS.get(role_id)
        if role is None:
            raise ApiError(
                "ROLE_NOT_FOUND",
                "The requested role is not available.",
                status_code=404,
            )
        evidence = self.repository.get_evidence()
        market = evidence["roles"].get(role_id)
        return {
            **copy.deepcopy(role),
            "marketSnapshot": market,
            "source": {
                **evidence["source"],
                "scope": (
                    "Synthetic PIT technology postings; not a current "
                    "labor-market estimate."
                ),
            },
            "taxonomyVersion": "pathin-taxonomy-0.1",
        }

    @staticmethod
    def destination_ids() -> list[str]:
        return ["data-senior", "product-mid", "ux-mid"]

    def _create_map(
        self,
        *,
        mode: str,
        profile: dict[str, Any],
        path_ids: list[str],
        constraints: dict[str, Any],
        pinned_node_ids: list[str] | None = None,
        dismissed_node_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        evidence = self.repository.get_evidence()
        selected_paths = [
            {"id": path_id, **copy.deepcopy(PATH_FIXTURES[path_id])}
            for path_id in path_ids
        ]
        visible_node_ids: list[str] = []
        for path in selected_paths:
            for node_id in path["nodeIds"]:
                if node_id not in visible_node_ids:
                    visible_node_ids.append(node_id)

        current_node = {
            "id": "current",
            "type": "current_standing",
            "label": "Your current standing",
            "summary": (
                "An editable snapshot assembled from the profile fields the "
                "user authorized for Path[IN]."
            ),
            "fitReasons": [
                "The route starts from the enabled profile fields.",
                "Projects, coursework, and activities count as evidence.",
            ],
            "existingSkills": profile["skills"][:6],
            "transferableSkills": profile["skills"][:4],
            "skillGaps": [],
        }
        nodes = [current_node]
        for node_id in visible_node_ids:
            if node_id == "current":
                continue
            fixture = {"id": node_id, **copy.deepcopy(NODE_FIXTURES[node_id])}
            fixture["fitReasons"] = self._fit_reasons(node_id, profile)
            nodes.append(fixture)

        edge_by_key: dict[tuple[str, str], dict[str, Any]] = {}
        for path in selected_paths:
            for source, target in zip(path["nodeIds"], path["nodeIds"][1:]):
                key = (source, target)
                if key not in edge_by_key:
                    edge_by_key[key] = self._edge(
                        source, target, evidence["transitionCounts"]
                    )

        created_at = self._timestamp()
        map_id = f"map_{uuid.uuid4().hex}"
        career_map = {
            "id": map_id,
            "name": "My Path[IN] career map",
            "mode": mode,
            "disclaimer": (
                "These are possible routes grounded in selected profile "
                "signals and synthetic aggregate evidence, not guaranteed "
                "outcomes."
            ),
            "profileSnapshot": copy.deepcopy(profile),
            "destinationIds": list(
                dict.fromkeys(path["destinationId"] for path in selected_paths)
            ),
            "nodes": nodes,
            "edges": list(edge_by_key.values()),
            "paths": selected_paths,
            "pinnedNodeIds": pinned_node_ids or [],
            "dismissedNodeIds": dismissed_node_ids or [],
            "generationConstraints": constraints,
            "warnings": [
                "Sparse transition counts are suppressed below 20 profiles.",
                "PIT salary fields are synthetic posting data, not live estimates.",
            ],
            "source": evidence["source"],
            "generation": {
                "dataVersion": (
                    "pit-live-2026-06"
                    if evidence["source"]["status"] == "live"
                    else "pit-snapshot-2026-06-23"
                ),
                "taxonomyVersion": "pathin-taxonomy-0.1",
                "modelVersion": "pathin-rules-0.1",
                "promptVersion": "prd-1.0",
                "generatedAt": created_at,
            },
            "createdAt": created_at,
            "updatedAt": created_at,
        }
        with self._lock:
            self._maps[map_id] = copy.deepcopy(career_map)
        return career_map

    def _edge(
        self,
        source: str,
        target: str,
        transition_counts: dict[str, int],
    ) -> dict[str, Any]:
        transition_key = TRANSITION_KEYS.get((source, target))
        if transition_key is not None:
            count = int(transition_counts.get(transition_key, 0))
            if count >= PRIVACY_THRESHOLD:
                return {
                    "id": f"edge-{source}-{target}",
                    "source": source,
                    "target": target,
                    "type": "observed_transition",
                    "evidenceLevel": "moderate",
                    "historicalFrequencyBucket": (
                        "100_plus" if count >= 100 else "20_to_99"
                    ),
                    "cohortSizeBucket": "20_plus",
                    "privacyStatus": "approved",
                    "explanation": (
                        "This transition appears in a privacy-safe aggregate "
                        "cohort. Exact counts are not required to understand "
                        "the route."
                    ),
                }
            return {
                "id": f"edge-{source}-{target}",
                "source": source,
                "target": target,
                "type": "recommended_transition",
                "evidenceLevel": "inferred",
                "historicalFrequencyBucket": "insufficient_data",
                "cohortSizeBucket": "below_20",
                "privacyStatus": "suppressed",
                "explanation": (
                    "The roles share relevant skills, but matching historical "
                    "sequences are below the 20-profile privacy threshold. "
                    "This connection is shown as an inference."
                ),
            }

        source_type = (
            "profile_signal"
            if source == "current"
            else NODE_FIXTURES[source]["type"]
        )
        target_type = NODE_FIXTURES[target]["type"]
        skill_bridge = source_type != "current_standing" and (
            source_type == "education_milestone"
            or target_type == "experience"
        )
        return {
            "id": f"edge-{source}-{target}",
            "source": source,
            "target": target,
            "type": "skill_bridge" if skill_bridge else "recommended_transition",
            "evidenceLevel": "moderate" if skill_bridge else "inferred",
            "historicalFrequencyBucket": "not_applicable",
            "cohortSizeBucket": "not_applicable",
            "privacyStatus": "not_applicable",
            "explanation": (
                "This connection is grounded in overlapping skills and the "
                "prototype role taxonomy, not an individual career history."
            ),
        }

    @staticmethod
    def _fit_reasons(
        node_id: str, profile: dict[str, Any]
    ) -> list[str]:
        skills = profile.get("skills", [])
        interests = profile.get("interests", [])
        reasons = [
            (
                f"Builds on {skills[0]} from the selected profile."
                if skills
                else "Builds on the selected technical profile signals."
            ),
            (
                f"Connects to the stated interest in {interests[0]}."
                if interests
                else "Adds a concrete way to test interest before committing."
            ),
        ]
        if node_id.startswith("course-"):
            reasons.append(
                "Uses a short course as preparation, not as a guaranteed credential."
            )
        elif "project" in node_id or node_id == "feature-lead":
            reasons.append(
                "Creates inspectable evidence without requiring a title first."
            )
        else:
            reasons.append(
                "Uses transferable skills while making remaining gaps explicit."
            )
        return reasons

    @staticmethod
    def _demo_profile() -> dict[str, Any]:
        return {
            "id": "demo-profile",
            "education": [
                "Computer Science and Mathematics at Stanford University"
            ],
            "coursework": ["Computer science", "Mathematics"],
            "experience": ["Similate, Inc.", "Jane Street"],
            "projects": [],
            "activities": [],
            "volunteering": [],
            "skills": [
                "Software problem solving",
                "Quantitative reasoning",
                "Technical communication",
            ],
            "interests": ["AI", "Product", "Career discovery"],
            "goals": ["Explore possible technical careers"],
            "locationPreferences": ["United States"],
            "preferences": {},
            "constraints": {},
            "consent": {
                "education": True,
                "experience": True,
                "skills": True,
                "interests": True,
                "location": True,
            },
            "fieldProvenance": {
                "education": "profile",
                "experience": "profile",
                "skills": "profile",
                "interests": "user_selected",
                "locationPreferences": "profile",
            },
        }

    @staticmethod
    def _string_list(value: Any) -> list[str]:
        if value is None:
            return []
        values = value if isinstance(value, list) else [value]
        result: list[str] = []
        for item in values:
            text = str(item).strip()
            if text and text not in result:
                result.append(text)
        return result

    @staticmethod
    def _object(value: Any) -> dict[str, Any]:
        return copy.deepcopy(value) if isinstance(value, dict) else {}

    @staticmethod
    def _education_stage(education: list[str]) -> str:
        combined = " ".join(education).lower()
        if any(term in combined for term in ("university", "college", "bachelor")):
            return "college"
        if any(term in combined for term in ("high school", "secondary")):
            return "high_school"
        return "not_specified"

    @staticmethod
    def _timestamp() -> str:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
