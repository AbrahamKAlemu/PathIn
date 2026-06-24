from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

from .errors import ApiError
from .recommendation_engine import PROFILE_CATEGORIES

CURRENT_PROFILE_ID = "winstoniskandar"
PROFILE_SCHEMA_VERSION = "pathin-current-profile-1.0"

DEFAULT_ENABLED_CATEGORIES = {
    category: True for category in PROFILE_CATEGORIES
}

DEFAULT_CURRENT_PROFILE: dict[str, Any] = {
    "id": CURRENT_PROFILE_ID,
    "slug": "winstoniskandar",
    "name": "Winston Iskandar",
    "headline": "Similate, Inc. (SR007) | CS/Math @ Stanford",
    "location": "United States",
    "connectionCount": "500+",
    "followerCount": 982,
    "profileLanguage": "English",
    "publicUrl": "www.linkedin.com/in/winstoniskandar",
    "profilePhoto": "/linkedin/profile.png",
    "cover": {
        "kind": "solid",
        "value": "#000000",
    },
    "affiliations": [
        {
            "id": "jane-street",
            "name": "Jane Street",
            "logo": "/linkedin/jane-street.png",
        },
        {
            "id": "stanford",
            "name": "Stanford University",
            "logo": "/linkedin/stanford.svg",
        },
    ],
    "analytics": {
        "profileViews": 652,
        "postImpressions": 0,
        "searchAppearances": 150,
        "period": "Past 7 days",
    },
    "activity": [
        {
            "id": "comment-1",
            "kind": "comment",
            "age": "2mo",
            "text": "Damn is that the 2 sig guy",
        },
        {
            "id": "comment-2",
            "kind": "comment",
            "age": "3mo",
            "text": "Super agree",
        },
    ],
    "experience": [
        {
            "id": "similate-ceo",
            "title": "ceo",
            "company": "Similate",
            "employmentType": "",
            "startDate": "Apr 2026",
            "endDate": "Present",
            "duration": "3 mos",
            "location": "",
            "description": [],
            "logo": "/linkedin/simulate-mark.png",
        },
        {
            "id": "jane-street-fttp",
            "title": "fttp",
            "company": "Jane Street",
            "employmentType": "",
            "startDate": "Feb 2026",
            "endDate": "Present",
            "duration": "5 mos",
            "location": "New York, New York, United States",
            "description": [],
            "logo": "/linkedin/jane-street.png",
        },
        {
            "id": "stanford-markets",
            "title": "studying markets",
            "company": "Stanford University",
            "employmentType": "Part-time",
            "startDate": "Dec 2025",
            "endDate": "Present",
            "duration": "7 mos",
            "location": "",
            "description": [
                "blockchain and ai research // Advanced Financial Technology Lab"
            ],
            "logo": "/linkedin/stanford.svg",
        },
        {
            "id": "mit-research",
            "title": "research",
            "company": "Massachusetts Institute of Technology",
            "employmentType": "Internship",
            "startDate": "Jun 2022",
            "endDate": "Aug 2025",
            "duration": "3 yrs 3 mos",
            "location": "Cambridge, Massachusetts, United States",
            "description": [
                "presented live demo of music making web-app at TEDx talk"
            ],
            "logo": "/linkedin/mit.svg",
        },
        {
            "id": "dartmouth-research",
            "title": "research",
            "company": "Thayer School of Engineering at Dartmouth",
            "employmentType": "Internship",
            "startDate": "Feb 2022",
            "endDate": "Aug 2025",
            "duration": "3 yrs 7 mos",
            "location": "Hanover, New Hampshire, United States",
            "description": [
                "published paper at ACM CHI 2024, built AI literacy apps, ran user studies"
            ],
            "logo": "/linkedin/dartmouth.svg",
        },
    ],
    "education": [
        {
            "id": "stanford-education",
            "school": "Stanford University",
            "degree": "Mathematics and Computer Science",
            "dates": "",
            "description": [
                "BASES (director), blockchain, poker, effective altruism, piano society"
            ],
            "logo": "/linkedin/stanford.svg",
        },
        {
            "id": "colburn-education",
            "school": "Colburn School of Music",
            "degree": "",
            "dates": "2011 - 2025",
            "description": [
                "Performed in NYC for solo piano debut at Carnegie Hall, Spring 2022"
            ],
            "logo": "/linkedin/colburn.svg",
        },
    ],
    "connectedApps": [
        {"id": "gamma", "name": "Gamma", "mark": "G"},
        {"id": "intellij", "name": "IntelliJ IDEA", "mark": "IJ"},
        {"id": "hubspot", "name": "HubSpot", "mark": "H"},
        {"id": "replit", "name": "Replit", "mark": "R"},
    ],
    "skills": [
        {
            "id": "software-development",
            "name": "Software Development",
            "endorsementCount": 19,
            "endorsementNotes": [
                "Endorsed by 2 colleagues at Jane Street",
                "Endorsed by 2 people in the last 6 months",
            ],
        },
        {
            "id": "freelance-web-app-development",
            "name": "Freelance Web/App Development",
            "endorsementCount": 13,
            "endorsementNotes": [],
        },
    ],
    "skillCount": 25,
    "recommendations": {
        "receivedCount": 1,
        "givenCount": 0,
        "receivedVisible": False,
    },
    "honors": [
        {
            "id": "emergent-ventures",
            "name": "4x Emergent Ventures",
            "issuer": "EV",
            "issued": "Feb 2026",
        },
        {
            "id": "google-scholar",
            "name": "Google Scholar",
            "issuer": "Google",
            "issued": "Oct 2025",
        },
    ],
    "honorCount": 7,
    "interests": {
        "activeTab": "Top Voices",
        "tabs": ["Top Voices", "Companies", "Groups", "Newsletters", "Schools"],
        "items": [
            {
                "id": "brad-jacobs",
                "tab": "Top Voices",
                "name": "Brad Jacobs",
                "relationship": "2nd",
                "headline": "Chairman and CEO, QXO, Inc.",
                "followers": "127,660 followers",
            },
            {
                "id": "jane-street-company",
                "tab": "Companies",
                "name": "Jane Street",
                "relationship": "",
                "headline": "Financial Services",
                "followers": "",
            },
            {
                "id": "stanford-school",
                "tab": "Schools",
                "name": "Stanford University",
                "relationship": "",
                "headline": "Higher Education",
                "followers": "",
            },
        ],
    },
    "viewerSuggestions": [
        {
            "id": "kelly-tai",
            "name": "Kelly Tai",
            "relationship": "2nd",
            "headline": "CS + Math @ Yale",
            "initials": "KT",
        },
        {
            "id": "aidan-duncan",
            "name": "Aidan Duncan",
            "relationship": "2nd",
            "headline": "Math + CS @ MIT",
            "initials": "AD",
        },
        {
            "id": "noga-gercsak",
            "name": "Noga Gercsak",
            "relationship": "2nd",
            "headline": "Incoming CS @ Carnegie Mellon | Jane Street AMP '26",
            "initials": "NG",
        },
    ],
    "peopleYouMayKnow": [
        {
            "id": "davido-zhang",
            "name": "Davido Zhang",
            "relationship": "2nd",
            "headline": "Stanford Math & EE | Phillips Exeter | RSI | Z Fellows",
            "initials": "DZ",
        },
        {
            "id": "micky-de-la-rosa",
            "name": "Micky M Dela Rosa",
            "relationship": "3rd+",
            "headline": "Student at Stanford University",
            "initials": "MD",
        },
        {
            "id": "brian-yip",
            "name": "Brian Yip",
            "relationship": "2nd",
            "headline": "Stanford University '29 | Symbolic Systems and Design",
            "initials": "BY",
        },
        {
            "id": "gusti-randa",
            "name": "Gusti Randa",
            "relationship": "3rd+",
            "headline": "Student at Stanford University",
            "initials": "GR",
        },
        {
            "id": "angel-raychev",
            "name": "Angel Raychev",
            "relationship": "2nd",
            "headline": "Giving up - Couldn't be me",
            "initials": "AR",
        },
    ],
    "suggestedPages": [
        {
            "id": "two-sigma",
            "name": "Two Sigma",
            "industry": "Financial Services",
            "followers": "289,473 followers",
            "context": "Peter & 1 other connection work here",
            "initials": "2S",
        },
        {
            "id": "jump-trading",
            "name": "Jump Trading",
            "industry": "Financial Services",
            "followers": "131,085 followers",
            "context": "Avery & 32 other connections follow this page",
            "initials": "JT",
        },
    ],
    "projects": [
        "Music-making web application presented in a live TEDx demo",
        "AI literacy applications and user studies",
        "ACM CHI 2024 research paper",
    ],
    "industries": [
        "Technology",
        "Financial Services",
        "Artificial Intelligence",
        "Research",
        "Education",
        "Music",
    ],
    "careerInterests": [
        "Markets",
        "Blockchain",
        "Artificial intelligence",
        "Entrepreneurship",
        "Effective altruism",
        "Piano",
    ],
    "careerGoals": [],
    "workStyles": [
        "Entrepreneurial",
        "Research-oriented",
        "Interdisciplinary",
    ],
    "enabledCategories": DEFAULT_ENABLED_CATEGORIES,
    "provenance": {
        "source": "user_supplied_linkedin_profile",
        "authorized": True,
        "scraped": False,
        "description": (
            "Profile facts supplied by the user for this Path[IN] prototype. "
            "No LinkedIn credentials or scraping are used."
        ),
    },
    "schemaVersion": PROFILE_SCHEMA_VERSION,
    "updatedAt": "2026-06-23T00:00:00+00:00",
}


class CurrentProfileStore(Protocol):
    def get(self) -> dict[str, Any]:
        ...

    def update(self, patch: dict[str, Any]) -> dict[str, Any]:
        ...


class InMemoryCurrentProfileStore:
    def __init__(self, initial_profile: dict[str, Any] | None = None) -> None:
        self._profile = copy.deepcopy(initial_profile or DEFAULT_CURRENT_PROFILE)
        self._lock = threading.Lock()

    def get(self) -> dict[str, Any]:
        with self._lock:
            return _with_pathin_evidence(copy.deepcopy(self._profile))

    def update(self, patch: dict[str, Any]) -> dict[str, Any]:
        safe_patch = _validate_patch(patch)
        with self._lock:
            self._profile = _merge_profile(self._profile, safe_patch)
            return _with_pathin_evidence(copy.deepcopy(self._profile))


class SQLiteCurrentProfileStore:
    def __init__(self, database_path: str | Path | None = None) -> None:
        configured_path = database_path or os.getenv("PATHIN_PROFILE_DB")
        self.database_path = Path(
            configured_path
            or Path(__file__).resolve().parents[1]
            / "instance"
            / "pathin_maps.sqlite3"
        ).expanduser()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._initialize()

    def get(self) -> dict[str, Any]:
        with self._lock, self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM current_profiles WHERE id = ?",
                (CURRENT_PROFILE_ID,),
            ).fetchone()
            if row is None:
                profile = copy.deepcopy(DEFAULT_CURRENT_PROFILE)
                self._save(connection, profile)
            else:
                payload = json.loads(row[0])
                profile = (
                    payload
                    if isinstance(payload, dict)
                    else copy.deepcopy(DEFAULT_CURRENT_PROFILE)
                )
        return _with_pathin_evidence(profile)

    def update(self, patch: dict[str, Any]) -> dict[str, Any]:
        safe_patch = _validate_patch(patch)
        with self._lock, self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM current_profiles WHERE id = ?",
                (CURRENT_PROFILE_ID,),
            ).fetchone()
            current = (
                json.loads(row[0])
                if row is not None
                else copy.deepcopy(DEFAULT_CURRENT_PROFILE)
            )
            if not isinstance(current, dict):
                current = copy.deepcopy(DEFAULT_CURRENT_PROFILE)
            updated = _merge_profile(current, safe_patch)
            self._save(connection, updated)
        return _with_pathin_evidence(updated)

    def _initialize(self) -> None:
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS current_profiles (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.commit()

    @staticmethod
    def _save(connection: sqlite3.Connection, profile: dict[str, Any]) -> None:
        connection.execute(
            """
            INSERT INTO current_profiles (id, payload, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = excluded.updated_at
            """,
            (
                CURRENT_PROFILE_ID,
                json.dumps(
                    profile,
                    ensure_ascii=True,
                    separators=(",", ":"),
                    sort_keys=True,
                ),
                str(profile["updatedAt"]),
            ),
        )
        connection.commit()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.database_path, timeout=5)


def _validate_patch(patch: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(patch, dict):
        raise ApiError(
            "INVALID_PROFILE_UPDATE",
            "Profile updates must be a JSON object.",
            details={"field": "profile"},
        )

    allowed = {
        "name",
        "headline",
        "location",
        "profileLanguage",
        "publicUrl",
        "experience",
        "education",
        "skills",
        "honors",
        "careerInterests",
        "careerGoals",
        "workStyles",
        "enabledCategories",
    }
    unknown = sorted(set(patch) - allowed)
    if unknown:
        raise ApiError(
            "UNSUPPORTED_PROFILE_UPDATE",
            "One or more profile fields cannot be updated.",
            details={"unsupportedFields": unknown},
        )

    safe_patch = copy.deepcopy(patch)
    for field in (
        "name",
        "headline",
        "location",
        "profileLanguage",
        "publicUrl",
    ):
        if field not in safe_patch:
            continue
        value = str(safe_patch[field]).strip()
        if len(value) > 500:
            raise ApiError(
                "INVALID_PROFILE_UPDATE",
                "A profile field exceeds the supported length.",
                details={"field": field, "maxCharacters": 500},
            )
        safe_patch[field] = value

    for field in (
        "experience",
        "education",
        "skills",
        "honors",
        "careerInterests",
        "careerGoals",
        "workStyles",
    ):
        if field in safe_patch and not isinstance(safe_patch[field], list):
            raise ApiError(
                "INVALID_PROFILE_UPDATE",
                "Profile list fields must be arrays.",
                details={"field": field},
            )
        if field in safe_patch and len(safe_patch[field]) > 100:
            raise ApiError(
                "INVALID_PROFILE_UPDATE",
                "A profile list contains too many entries.",
                details={"field": field, "maxItems": 100},
            )

    if "enabledCategories" in safe_patch:
        values = safe_patch["enabledCategories"]
        if not isinstance(values, dict):
            raise ApiError(
                "INVALID_PROFILE_UPDATE",
                "Enabled profile categories must be an object.",
                details={"field": "enabledCategories"},
            )
        safe_patch["enabledCategories"] = {
            category: bool(values.get(category, True))
            for category in PROFILE_CATEGORIES
        }

    try:
        json.dumps(safe_patch, ensure_ascii=True)
    except (TypeError, ValueError) as error:
        raise ApiError(
            "INVALID_PROFILE_UPDATE",
            "Profile updates must contain JSON-compatible values.",
        ) from error
    return safe_patch


def _merge_profile(
    current: dict[str, Any],
    patch: dict[str, Any],
) -> dict[str, Any]:
    updated = copy.deepcopy(current)
    updated.update(copy.deepcopy(patch))
    updated["id"] = CURRENT_PROFILE_ID
    updated["slug"] = "winstoniskandar"
    updated["schemaVersion"] = PROFILE_SCHEMA_VERSION
    updated["updatedAt"] = _timestamp()
    return updated


def _with_pathin_evidence(profile: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(profile)
    result["pathinEvidence"] = {
        "fields": _profile_fields(result),
        "enabledCategories": {
            category: bool(
                result.get("enabledCategories", {}).get(category, True)
            )
            for category in PROFILE_CATEGORIES
        },
        "source": "linkedin",
        "sourceLabel": "User-authorized LinkedIn-style profile",
        "privacy": (
            "Only enabled categories are sent to Path[IN]. Analytics, viewer "
            "suggestions, and social recommendations are never used for ranking."
        ),
    }
    return result


def _profile_fields(
    profile: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    fields: dict[str, list[dict[str, Any]]] = {
        category: [] for category in PROFILE_CATEGORIES
    }

    for experience in _objects(profile.get("experience")):
        title = str(experience.get("title", "")).strip()
        company = str(experience.get("company", "")).strip()
        if title:
            role = f"{title} at {company}" if company else title
            _append_evidence(fields["roles"], role, "roles", 0.99)
        for description in _strings(experience.get("description")):
            _append_evidence(
                fields["responsibilities"],
                description,
                "responsibilities",
                0.98,
            )
        date_value = " - ".join(
            value
            for value in (
                str(experience.get("startDate", "")).strip(),
                str(experience.get("endDate", "")).strip(),
            )
            if value
        )
        if date_value:
            _append_evidence(fields["dates"], date_value, "dates", 0.99)
        location = str(experience.get("location", "")).strip()
        if location:
            _append_evidence(fields["locations"], location, "locations", 0.99)

    for education in _objects(profile.get("education")):
        school = str(education.get("school", "")).strip()
        degree = str(education.get("degree", "")).strip()
        education_value = ", ".join(
            value for value in (degree, school) if value
        )
        if education_value:
            _append_evidence(
                fields["education"],
                education_value,
                "education",
                0.99,
            )
        if degree:
            for course in re.split(r"\s+and\s+|[,/]", degree):
                _append_evidence(
                    fields["coursework"],
                    course,
                    "coursework",
                    0.9,
                )
        for description in _strings(education.get("description")):
            for interest in re.split(r"[,/]", description):
                _append_evidence(
                    fields["interests"],
                    interest,
                    "interests",
                    0.92,
                )

    for skill in _objects(profile.get("skills")):
        _append_evidence(
            fields["skills"],
            str(skill.get("name", "")),
            "skills",
            0.99,
        )

    for project in _strings(profile.get("projects")):
        _append_evidence(fields["projects"], project, "projects", 0.98)
    for industry in _strings(profile.get("industries")):
        _append_evidence(fields["industries"], industry, "industries", 0.95)
    for interest in _strings(profile.get("careerInterests")):
        _append_evidence(fields["interests"], interest, "interests", 0.98)
    for goal in _strings(profile.get("careerGoals")):
        _append_evidence(fields["goals"], goal, "goals", 0.99)
    for style in _strings(profile.get("workStyles")):
        _append_evidence(
            fields["workStyles"],
            style,
            "workStyles",
            0.82,
            explicit=False,
            evidence="Derived from the user-authorized profile summary",
        )
    location = str(profile.get("location", "")).strip()
    if location:
        _append_evidence(fields["locations"], location, "locations", 0.99)

    for honor in _objects(profile.get("honors")):
        name = str(honor.get("name", "")).strip()
        issuer = str(honor.get("issuer", "")).strip()
        value = f"{name}, issued by {issuer}" if issuer else name
        _append_evidence(fields["achievements"], value, "achievements", 0.99)

    return fields


def _append_evidence(
    target: list[dict[str, Any]],
    value: str,
    category: str,
    confidence: float,
    *,
    explicit: bool = True,
    evidence: str | None = None,
) -> None:
    cleaned = re.sub(r"\s+", " ", str(value)).strip(" ,-/")
    if not cleaned or len(cleaned) > 500:
        return
    normalized = re.sub(r"[^a-z0-9]+", " ", cleaned.lower()).strip()
    if not normalized or any(
        item["normalized"] == normalized for item in target
    ):
        return
    target.append(
        {
            "id": hashlib.sha1(
                f"linkedin:{category}:{normalized}".encode("utf-8")
            ).hexdigest()[:14],
            "value": cleaned,
            "normalized": normalized,
            "source": "linkedin",
            "confidence": round(confidence, 2),
            "explicit": explicit,
            "enabled": True,
            "originalSource": "user_supplied_linkedin_profile",
            "importBatch": "authorized-profile",
            **({"evidence": evidence} if evidence else {}),
        }
    )


def _objects(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
