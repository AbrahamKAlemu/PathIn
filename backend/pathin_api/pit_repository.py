from __future__ import annotations

import copy
import json
import ssl
import threading
import time
from collections import Counter, defaultdict
from typing import Any, Protocol
from urllib.request import Request, urlopen

import certifi

from .taxonomy import normalize_title

PIT_BASE_URL = "https://pit.najera.cc"
PRIVACY_THRESHOLD = 20

SNAPSHOT_ROLE_STATS: dict[str, dict[str, Any]] = {
    "customer-service-manager": {
        "postingCount": 103,
        "averageSalaryFrom": 94869,
        "averageSalaryTo": 177158,
    },
    "data-scientist": {
        "postingCount": 86,
        "averageSalaryFrom": 93885,
        "averageSalaryTo": 182465,
    },
    "devops-engineer": {
        "postingCount": 89,
        "averageSalaryFrom": 94159,
        "averageSalaryTo": 173360,
    },
    "financial-analyst": {
        "postingCount": 93,
        "averageSalaryFrom": 93427,
        "averageSalaryTo": 175157,
    },
    "hr-coordinator": {
        "postingCount": 107,
        "averageSalaryFrom": 91773,
        "averageSalaryTo": 175505,
    },
    "marketing-specialist": {
        "postingCount": 107,
        "averageSalaryFrom": 92784,
        "averageSalaryTo": 180217,
    },
    "product-manager": {
        "postingCount": 95,
        "averageSalaryFrom": 104633,
        "averageSalaryTo": 183667,
    },
    "sales-representative": {
        "postingCount": 117,
        "averageSalaryFrom": 95258,
        "averageSalaryTo": 169522,
    },
    "software-engineer": {
        "postingCount": 102,
        "averageSalaryFrom": 88901,
        "averageSalaryTo": 177174,
    },
    "ux-designer": {
        "postingCount": 101,
        "averageSalaryFrom": 94888,
        "averageSalaryTo": 179784,
    },
}

SNAPSHOT_TRANSITIONS = {
    "marketing-specialist::sales-representative": 34,
    "sales-representative::financial-analyst": 30,
    "devops-engineer::marketing-specialist": 28,
    "sales-representative::marketing-specialist": 27,
    "marketing-specialist::product-manager": 27,
    "financial-analyst::ux-designer": 27,
    "hr-coordinator::ux-designer": 27,
    "hr-coordinator::sales-representative": 26,
    "customer-service-manager::marketing-specialist": 25,
    "product-manager::software-engineer": 23,
    "devops-engineer::product-manager": 22,
    "hr-coordinator::software-engineer": 22,
    "financial-analyst::customer-service-manager": 21,
    "software-engineer::devops-engineer": 4,
    "software-engineer::data-scientist": 4,
    "data-analyst::data-scientist": 0,
}

SNAPSHOT_COURSES = [
    {
        "id": "course_1476",
        "name": "Machine Learning Fundamentals",
        "category": "Data Science",
        "skills": ["Machine Learning", "Python", "Data Analysis"],
        "length": {"value": 5, "unit": "hours"},
        "level": "Easy",
    },
    {
        "id": "course_3546",
        "name": "Cloud Computing with AWS",
        "category": "Cloud Computing",
        "skills": ["AWS", "DevOps", "Cloud"],
        "length": {"value": 3, "unit": "hours"},
        "level": "Easy",
    },
    {
        "id": "course_2852",
        "name": "Project Management Basics",
        "category": "Project Management",
        "skills": ["Project Planning", "Agile", "Scrum"],
        "length": {"value": 6, "unit": "hours"},
        "level": "Easy",
    },
    {
        "id": "course_6335",
        "name": "UX/UI Design",
        "category": "Design",
        "skills": ["UX/UI", "Graphic Design", "Prototyping"],
        "length": {"value": 8, "unit": "hours"},
        "level": "Medium",
    },
    {
        "id": "course_1555",
        "name": "Effective Communication Skills",
        "category": "Communication",
        "skills": ["Public Speaking", "Communication", "Negotiation"],
        "length": {"value": 2, "unit": "hours"},
        "level": "Medium",
    },
    {
        "id": "course_9025",
        "name": "Introduction to Marketing",
        "category": "Marketing",
        "skills": ["Marketing Strategies", "SEO", "Content Creation"],
        "length": {"value": 8, "unit": "hours"},
        "level": "Easy",
    },
    {
        "id": "course_8452",
        "name": "Cybersecurity Essentials",
        "category": "Cybersecurity",
        "skills": ["Network Security", "Information Security", "Risk Analysis"],
        "length": {"value": 8, "unit": "hours"},
        "level": "Hard",
    },
    {
        "id": "course_6100",
        "name": "Business Analytics Foundations",
        "category": "Business",
        "skills": ["Data Analysis", "Spreadsheets", "Business Analysis"],
        "length": {"value": 6, "unit": "hours"},
        "level": "Easy",
    },
]


def snapshot_catalog() -> dict[str, Any]:
    role_stats = {}
    for role_id, stats in SNAPSHOT_ROLE_STATS.items():
        role_stats[role_id] = {
            **copy.deepcopy(stats),
            "locations": [
                "Austin, TX",
                "Boston, MA",
                "New York, NY",
                "San Francisco, CA",
                "Seattle, WA",
            ],
            "industries": [
                "Technology",
                "Finance",
                "Healthcare",
                "Retail",
            ],
            "levels": ["Entry", "Mid", "Senior", "Management"],
            "source": "pit",
        }
    return {
        "source": {
            "name": "Possibilities in Tech Hackathon 2026 dataset",
            "url": f"{PIT_BASE_URL}/",
            "status": "snapshot",
            "memberCount": 2000,
            "jobCount": 1000,
            "courseCount": 600,
            "cohortCount": 2000,
            "note": (
                "The PIT dataset is synthetic. Historical evidence is aggregated, "
                "and exact counts below 20 profiles are suppressed."
            ),
        },
        "roleStats": role_stats,
        "courses": copy.deepcopy(SNAPSHOT_COURSES),
        "transitionCounts": copy.deepcopy(SNAPSHOT_TRANSITIONS),
    }


class EvidenceRepository(Protocol):
    def get_catalog(self) -> dict[str, Any]:
        ...


class SnapshotPitRepository:
    def get_catalog(self) -> dict[str, Any]:
        return snapshot_catalog()

    def get_evidence(self) -> dict[str, Any]:
        return self.get_catalog()


class PitRepository:
    def __init__(self, *, cache_seconds: int = 3600, timeout_seconds: int = 8):
        self.cache_seconds = cache_seconds
        self.timeout_seconds = timeout_seconds
        self._cache: dict[str, Any] | None = None
        self._expires_at = 0.0
        self._lock = threading.Lock()

    def get_catalog(self) -> dict[str, Any]:
        with self._lock:
            now = time.monotonic()
            if self._cache is not None and now < self._expires_at:
                return copy.deepcopy(self._cache)
            try:
                users = self._fetch_json("/user_data.json")
                jobs = self._fetch_json("/jobs_data.json")
                courses = self._fetch_json("/course_data.json")
                catalog = self._aggregate(users, jobs, courses)
            except (OSError, TimeoutError, ValueError, KeyError, TypeError):
                catalog = snapshot_catalog()
            self._cache = catalog
            self._expires_at = now + self.cache_seconds
            return copy.deepcopy(catalog)

    def get_evidence(self) -> dict[str, Any]:
        return self.get_catalog()

    def _fetch_json(self, path: str) -> list[dict[str, Any]]:
        request = Request(
            f"{PIT_BASE_URL}{path}",
            headers={"User-Agent": "PathIn-Prototype/1.0"},
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
        grouped_jobs: dict[str, list[dict[str, Any]]] = defaultdict(list)
        job_role_ids: dict[str, str] = {}
        for job in jobs:
            role_id = normalize_title(str(job.get("position", "")))
            if not role_id:
                continue
            grouped_jobs[role_id].append(job)
            job_role_ids[str(job.get("id", ""))] = role_id

        role_stats: dict[str, dict[str, Any]] = {}
        for role_id, matches in grouped_jobs.items():
            salary_from = [
                int(job.get("salary_range", {}).get("from", 0))
                for job in matches
                if str(job.get("salary_range", {}).get("from", "")).isdigit()
            ]
            salary_to = [
                int(job.get("salary_range", {}).get("to", 0))
                for job in matches
                if str(job.get("salary_range", {}).get("to", "")).isdigit()
            ]
            role_stats[role_id] = {
                "postingCount": len(matches),
                "averageSalaryFrom": (
                    round(sum(salary_from) / len(salary_from)) if salary_from else 0
                ),
                "averageSalaryTo": (
                    round(sum(salary_to) / len(salary_to)) if salary_to else 0
                ),
                "locations": sorted(
                    {
                        str(job.get("location", "")).strip()
                        for job in matches
                        if str(job.get("location", "")).strip()
                    }
                ),
                "industries": sorted(
                    {
                        str(job.get("industry", "")).strip()
                        for job in matches
                        if str(job.get("industry", "")).strip()
                    }
                ),
                "levels": sorted(
                    {
                        str(job.get("level", "")).strip()
                        for job in matches
                        if str(job.get("level", "")).strip()
                    }
                ),
                "source": "pit",
            }

        transition_counts: Counter[str] = Counter()
        for member in users:
            history = [
                job_role_ids[job_id]
                for job_id in member.get("job_history", [])
                if job_id in job_role_ids
            ]
            for source, target in zip(history, history[1:]):
                transition_counts[f"{source}::{target}"] += 1

        normalized_courses = []
        for course in courses:
            if not course.get("id") or not course.get("name"):
                continue
            length = course.get("length")
            normalized_courses.append(
                {
                    "id": str(course["id"]),
                    "name": str(course["name"]),
                    "category": str(course.get("category", "General")),
                    "skills": [
                        str(skill)
                        for skill in course.get("skills", [])
                        if str(skill).strip()
                    ],
                    "length": (
                        copy.deepcopy(length)
                        if isinstance(length, dict)
                        else {"value": 0, "unit": "hours"}
                    ),
                    "level": str(course.get("level", "Unknown")),
                }
            )

        return {
            "source": {
                "name": "Possibilities in Tech Hackathon 2026 dataset",
                "url": f"{PIT_BASE_URL}/",
                "status": "live",
                "memberCount": len(users),
                "jobCount": len(jobs),
                "courseCount": len(courses),
                "cohortCount": len(users),
                "note": (
                    "The PIT dataset is synthetic. Historical evidence is "
                    "aggregated, and exact counts below 20 profiles are suppressed."
                ),
            },
            "roleStats": role_stats,
            "courses": normalized_courses,
            "transitionCounts": dict(transition_counts),
        }
