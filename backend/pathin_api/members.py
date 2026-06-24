from __future__ import annotations

import copy
import json
import ssl
import threading
import time
from typing import Any, Protocol
from urllib.request import Request, urlopen

import certifi

PIT_BASE_URL = "https://pit.najera.cc"


class MemberRepository(Protocol):
    def get_members(self) -> list[dict[str, Any]]: ...

    def get_jobs(self) -> list[dict[str, Any]]: ...


class SnapshotMemberRepository:
    def __init__(self, members: list[dict[str, Any]] | None = None) -> None:
        self._members = members or _DEFAULT_SNAPSHOT_MEMBERS
        self._jobs = _DEFAULT_SNAPSHOT_JOBS

    def get_members(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._members)

    def get_jobs(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._jobs)


class PitMemberRepository:
    def __init__(self, *, cache_seconds: int = 3600, timeout_seconds: int = 8):
        self.cache_seconds = cache_seconds
        self.timeout_seconds = timeout_seconds
        self._members: list[dict[str, Any]] | None = None
        self._jobs: list[dict[str, Any]] | None = None
        self._expires_at = 0.0
        self._lock = threading.Lock()

    def get_members(self) -> list[dict[str, Any]]:
        self._ensure_loaded()
        return copy.deepcopy(self._members or [])

    def get_jobs(self) -> list[dict[str, Any]]:
        self._ensure_loaded()
        return copy.deepcopy(self._jobs or [])

    def _ensure_loaded(self) -> None:
        with self._lock:
            now = time.monotonic()
            if self._members is not None and now < self._expires_at:
                return
            try:
                self._members = self._fetch_json("/user_data.json")
                self._jobs = self._fetch_json("/jobs_data.json")
            except (OSError, TimeoutError, ValueError, TypeError):
                snapshot = SnapshotMemberRepository()
                self._members = snapshot.get_members()
                self._jobs = snapshot.get_jobs()
            self._expires_at = now + self.cache_seconds

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


_DEFAULT_SNAPSHOT_JOBS: list[dict[str, Any]] = [
    {
        "id": "job_1",
        "company": "LinkedIn",
        "position": "Software Engineer",
        "level": "Entry",
        "industry": "Technology",
    },
    {
        "id": "job_2",
        "company": "Amazon",
        "position": "Software Engineer",
        "level": "Mid",
        "industry": "Technology",
    },
    {
        "id": "job_3",
        "company": "Citadel",
        "position": "Quantitative Analyst",
        "level": "Entry",
        "industry": "Finance",
    },
    {
        "id": "job_4",
        "company": "Stanford University",
        "position": "Research Assistant",
        "level": "Entry",
        "industry": "Education",
    },
]

_DEFAULT_SNAPSHOT_MEMBERS: list[dict[str, Any]] = [
    {
        "id": "member_stanford_linkedin",
        "name": "Synthetic Neighbor A",
        "school_history": [
            {
                "school_name": "Stanford University",
                "degree": "Computer Science",
                "graduation_year": 2024,
            }
        ],
        "job_history": ["job_1", "job_2"],
        "skills": ["Python", "Communication", "Software problem solving"],
        "posts_activity": ["AI club"],
        "courses": [],
        "current_location": "San Francisco, CA",
    },
    {
        "id": "member_amazon_citadel",
        "name": "Synthetic Neighbor B",
        "school_history": [
            {
                "school_name": "MIT",
                "degree": "Mathematics",
                "graduation_year": 2022,
            }
        ],
        "job_history": ["job_2", "job_3"],
        "skills": ["Quantitative reasoning", "Python", "Data analysis"],
        "posts_activity": ["Quant finance"],
        "courses": [],
        "current_location": "New York, NY",
    },
    {
        "id": "member_product_design",
        "name": "Synthetic Neighbor C",
        "school_history": [
            {
                "school_name": "Stanford University",
                "degree": "Human-Computer Interaction",
                "graduation_year": 2023,
            }
        ],
        "job_history": ["job_1"],
        "skills": ["User research", "Prototyping", "Communication"],
        "posts_activity": ["Design club", "Product"],
        "courses": [],
        "current_location": "Seattle, WA",
    },
]
