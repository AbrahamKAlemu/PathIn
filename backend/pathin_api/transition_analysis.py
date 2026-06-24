from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

PRIVACY_THRESHOLD = 20


def sigmoid(value: float) -> float:
    if value >= 0:
        exponential = math.exp(-value)
        return 1 / (1 + exponential)
    exponential = math.exp(value)
    return exponential / (1 + exponential)


def logistic_confidence(
    *,
    node_score: float,
    neighbor_support: float,
    transition_support: float,
    coefficients: tuple[float, float, float, float] = (-0.15, 0.038, 1.6, 0.75),
) -> float:
    intercept, score_weight, neighbor_weight, transition_weight = coefficients
    linear_predictor = (
        intercept
        + score_weight * node_score
        + neighbor_weight * neighbor_support
        + transition_weight * math.log1p(transition_support)
    )
    return sigmoid(linear_predictor)


class TransitionAnalyzer:
    def __init__(
        self,
        members: list[dict[str, Any]],
        jobs: list[dict[str, Any]],
        *,
        privacy_threshold: int = PRIVACY_THRESHOLD,
    ) -> None:
        self.members = members
        self.jobs = {job["id"]: job for job in jobs}
        self.privacy_threshold = privacy_threshold
        self._transition_counts = self._build_transition_counts()
        self._role_frequencies = self._build_role_frequencies()

    def transition_rate(self, source_label: str, target_label: str) -> float:
        source_key = _normalize_label(source_label)
        target_key = _normalize_label(target_label)
        if not source_key or not target_key:
            return 0.0
        count = self._transition_counts.get((source_key, target_key), 0)
        if count < self.privacy_threshold:
            return 0.0
        source_total = sum(
            value
            for (source, _), value in self._transition_counts.items()
            if source == source_key
        )
        if source_total <= 0:
            return 0.0
        return count / source_total

    def cohort_support_for_label(self, label: str) -> float:
        normalized = _normalize_label(label)
        if not normalized:
            return 0.0
        count = self._role_frequencies.get(normalized, 0)
        if count < self.privacy_threshold:
            return 0.0
        return min(1.0, count / max(len(self.members), 1))

    def suppressed_transition_count(self, source_label: str, target_label: str) -> bool:
        source_key = _normalize_label(source_label)
        target_key = _normalize_label(target_label)
        count = self._transition_counts.get((source_key, target_key), 0)
        return 0 < count < self.privacy_threshold

    def summary(self) -> dict[str, Any]:
        approved = {
            f"{source} -> {target}": count
            for (source, target), count in self._transition_counts.items()
            if count >= self.privacy_threshold
        }
        suppressed = sum(
            1
            for count in self._transition_counts.values()
            if 0 < count < self.privacy_threshold
        )
        return {
            "approvedTransitions": len(approved),
            "suppressedTransitions": suppressed,
            "privacyThreshold": self.privacy_threshold,
            "method": "empirical_markov_cohort",
        }

    def _build_transition_counts(self) -> dict[tuple[str, str], int]:
        counts: dict[tuple[str, str], int] = defaultdict(int)
        for member in self.members:
            history = [
                self.jobs[job_id]
                for job_id in member.get("job_history", [])
                if job_id in self.jobs
            ]
            for source, target in zip(history, history[1:]):
                source_label = _job_label(source)
                target_label = _job_label(target)
                counts[(source_label, target_label)] += 1
        return dict(counts)

    def _build_role_frequencies(self) -> dict[str, int]:
        counts: dict[str, int] = defaultdict(int)
        for member in self.members:
            for job_id in member.get("job_history", []):
                job = self.jobs.get(job_id)
                if job is None:
                    continue
                counts[_job_label(job)] += 1
        return dict(counts)


def neighbor_support_for_label(
    label: str,
    neighbors: list[Any],
) -> float:
    normalized = _normalize_label(label)
    if not normalized or not neighbors:
        return 0.0
    scores: list[float] = []
    for neighbor in neighbors:
        roles = neighbor.career_summary.get("roles", [])
        for role in roles:
            role_label = _normalize_label(
                f"{role.get('position', '')} {role.get('company', '')}"
            )
            if normalized in role_label or role_label in normalized:
                scores.append(neighbor.similarity_score)
                break
        schools = neighbor.career_summary.get("schools", [])
        for school in schools:
            school_label = _normalize_label(str(school.get("name", "")))
            if normalized in school_label or school_label in normalized:
                scores.append(neighbor.similarity_score * 0.85)
                break
    if not scores:
        return 0.0
    return min(1.0, sum(scores) / len(scores))


def _job_label(job: dict[str, Any]) -> str:
    position = str(job.get("position", "")).strip().lower()
    level = str(job.get("level", "")).strip().lower()
    if level:
        return f"{position} ({level})"
    return position


def _normalize_label(value: str) -> str:
    return " ".join(str(value).lower().split())
