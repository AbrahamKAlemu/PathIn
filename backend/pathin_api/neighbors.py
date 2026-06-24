from __future__ import annotations

from typing import Any

from .members import MemberRepository
from .models import (
    CareerIdentity,
    CareerNeighbor,
    ProfileDimension,
    WeightingMatrix,
    WeightingScenario,
)
from .weighting import _jaccard_similarity, _tokenize_fields


class CareerNeighborFinder:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def find_neighbors(
        self,
        identity: CareerIdentity,
        *,
        limit: int = 8,
        min_score: float = 0.08,
    ) -> list[CareerNeighbor]:
        members = self.repository.get_members()
        jobs = {job["id"]: job for job in self.repository.get_jobs()}
        neighbors: list[CareerNeighbor] = []

        for member in members:
            member_identity = _member_identity(member, jobs)
            similarity = _profile_similarity(identity, member_identity)
            if similarity < min_score:
                continue
            shared_signals = _shared_signals(identity, member_identity)
            neighbors.append(
                CareerNeighbor(
                    member_id=str(member.get("id", "unknown")),
                    similarity_score=similarity,
                    shared_signals=shared_signals,
                    career_summary=_career_summary(member, jobs),
                )
            )

        neighbors.sort(key=lambda item: item.similarity_score, reverse=True)
        return neighbors[:limit]


def _member_identity(
    member: dict[str, Any],
    jobs: dict[str, dict[str, Any]],
) -> CareerIdentity:
    schools = [
        f"{school.get('school_name', '')} {school.get('degree', '')}".strip()
        for school in member.get("school_history", [])
    ]
    experience: list[str] = []
    for job_id in member.get("job_history", []):
        job = jobs.get(job_id)
        if job is None:
            continue
        experience.extend(
            [
                str(job.get("company", "")),
                str(job.get("position", "")),
                f"{job.get('position', '')} at {job.get('company', '')}".strip(),
            ]
        )
    activities = _string_list(member.get("posts_activity"))
    scenario = _member_scenario(member)
    return CareerIdentity(
        profile_id=str(member.get("id", "member")),
        scenario=scenario,
        dimensions={
            ProfileDimension.WORK_EXPERIENCE: _tokenize_fields(experience, activities),
            ProfileDimension.SKILLS: _tokenize_fields(member.get("skills", [])),
            ProfileDimension.EDUCATION: _tokenize_fields(schools),
            ProfileDimension.INTERESTS: _tokenize_fields(activities),
        },
        weighting=WeightingMatrix.for_scenario(scenario),
    )


def _member_scenario(member: dict[str, Any]) -> WeightingScenario:
    if member.get("job_history"):
        return WeightingScenario.EARLY_CAREER
    if member.get("school_history"):
        return WeightingScenario.COLLEGE_STUDENT
    return WeightingScenario.CAREER_EXPLORER


def _profile_similarity(
    left: CareerIdentity,
    right: CareerIdentity,
) -> float:
    matrix = left.weighting
    total = 0.0
    for dimension, weight in matrix.weights.items():
        similarity = _jaccard_similarity(
            left.tokens_for(dimension),
            right.tokens_for(dimension),
        )
        total += weight * similarity
    return total


def _shared_signals(
    left: CareerIdentity,
    right: CareerIdentity,
) -> dict[str, list[str]]:
    shared: dict[str, list[str]] = {}
    for dimension in ProfileDimension:
        overlap = sorted(left.tokens_for(dimension) & right.tokens_for(dimension))
        if overlap:
            shared[dimension.value] = overlap[:5]
    return shared


def _career_summary(
    member: dict[str, Any],
    jobs: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    schools = member.get("school_history", [])
    job_history = [
        jobs[job_id]
        for job_id in member.get("job_history", [])
        if job_id in jobs
    ]
    return {
        "schools": [
            {
                "name": school.get("school_name"),
                "degree": school.get("degree"),
                "graduationYear": school.get("graduation_year"),
            }
            for school in schools
        ],
        "roles": [
            {
                "company": job.get("company"),
                "position": job.get("position"),
                "level": job.get("level"),
            }
            for job in job_history
        ],
        "skills": _string_list(member.get("skills"))[:6],
        "activities": _string_list(member.get("posts_activity"))[:4],
        "location": member.get("current_location"),
    }


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
