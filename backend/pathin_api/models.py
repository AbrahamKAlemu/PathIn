from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


class WeightingScenario(str, Enum):
    COLLEGE_STUDENT = "college_student"
    EARLY_CAREER = "early_career"
    CAREER_EXPLORER = "career_explorer"


class ProfileDimension(str, Enum):
    WORK_EXPERIENCE = "work_experience"
    SKILLS = "skills"
    EDUCATION = "education"
    INTERESTS = "interests"


@dataclass(frozen=True)
class WeightingMatrix:
    scenario: WeightingScenario
    weights: dict[ProfileDimension, float]
    skills_contested: bool = True

    def __post_init__(self) -> None:
        total = sum(self.weights.values())
        if not 0.99 <= total <= 1.01:
            raise ValueError(
                f"Weighting matrix for {self.scenario.value} must sum to 1.0, got {total:.3f}"
            )

    @classmethod
    def for_scenario(cls, scenario: WeightingScenario) -> WeightingMatrix:
        presets: dict[WeightingScenario, tuple[dict[ProfileDimension, float], bool]] = {
            WeightingScenario.COLLEGE_STUDENT: (
                {
                    ProfileDimension.WORK_EXPERIENCE: 0.40,
                    ProfileDimension.SKILLS: 0.30,
                    ProfileDimension.EDUCATION: 0.20,
                    ProfileDimension.INTERESTS: 0.10,
                },
                True,
            ),
            WeightingScenario.EARLY_CAREER: (
                {
                    ProfileDimension.WORK_EXPERIENCE: 0.60,
                    ProfileDimension.SKILLS: 0.25,
                    ProfileDimension.EDUCATION: 0.15,
                },
                False,
            ),
            WeightingScenario.CAREER_EXPLORER: (
                {
                    ProfileDimension.SKILLS: 0.40,
                    ProfileDimension.INTERESTS: 0.30,
                    ProfileDimension.EDUCATION: 0.20,
                    ProfileDimension.WORK_EXPERIENCE: 0.10,
                },
                True,
            ),
        }
        weights, skills_contested = presets[scenario]
        return cls(
            scenario=scenario,
            weights=weights,
            skills_contested=skills_contested,
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "scenario": self.scenario.value,
            "weights": {
                dimension.value: weight
                for dimension, weight in self.weights.items()
            },
            "skillsContested": self.skills_contested,
        }


@dataclass
class CareerIdentity:
    profile_id: str
    scenario: WeightingScenario
    dimensions: dict[ProfileDimension, set[str]]
    weighting: WeightingMatrix
    raw_fields: dict[str, list[str]] = field(default_factory=dict)

    def tokens_for(self, dimension: ProfileDimension) -> set[str]:
        return self.dimensions.get(dimension, set())

    def as_dict(self) -> dict[str, Any]:
        return {
            "profileId": self.profile_id,
            "scenario": self.scenario.value,
            "weighting": self.weighting.as_dict(),
            "dimensions": {
                dimension.value: sorted(tokens)
                for dimension, tokens in self.dimensions.items()
            },
            "rawFields": self.raw_fields,
        }


@dataclass
class NodeScore:
    node_id: str
    total_score: float
    dimension_scores: dict[str, float]
    weights_applied: dict[str, float]
    fit_reasons: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "nodeId": self.node_id,
            "totalScore": round(self.total_score, 2),
            "dimensionScores": {
                key: round(value, 3) for key, value in self.dimension_scores.items()
            },
            "weightsApplied": self.weights_applied,
            "fitReasons": self.fit_reasons,
        }


@dataclass
class CareerNeighbor:
    member_id: str
    similarity_score: float
    shared_signals: dict[str, list[str]]
    career_summary: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "memberId": self.member_id,
            "similarityScore": round(self.similarity_score, 3),
            "sharedSignals": self.shared_signals,
            "careerSummary": self.career_summary,
        }


@dataclass
class PredictedPathway:
    id: str
    label: str
    destination_label: str
    confidence: float
    rationale: str
    recommended_actions: list[dict[str, Any]]
    node_ids: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "destinationLabel": self.destination_label,
            "confidence": round(self.confidence, 3),
            "rationale": self.rationale,
            "recommendedActions": self.recommended_actions,
            "nodeIds": self.node_ids,
        }


class ScorableNode(Protocol):
    id: str
    node_type: str
    label: str

    def dimension_tokens(self) -> dict[ProfileDimension, set[str]]: ...


@dataclass
class ProfileNode:
    id: str
    node_type: str
    label: str
    summary: str
    dimension_data: dict[ProfileDimension, list[str]]
    metadata: dict[str, Any] = field(default_factory=dict)

    def dimension_tokens(self) -> dict[ProfileDimension, set[str]]:
        return {
            dimension: {_normalize_token(token) for token in tokens if token}
            for dimension, tokens in self.dimension_data.items()
        }

    @classmethod
    def from_fixture(
        cls,
        node_id: str,
        fixture: dict[str, Any],
        *,
        profile_tokens: dict[ProfileDimension, set[str]] | None = None,
    ) -> ProfileNode:
        node_type = str(fixture.get("type", "unknown"))
        label = str(fixture.get("label", node_id))
        summary = str(fixture.get("summary", ""))
        existing = fixture.get("existingSkills", [])
        transferable = fixture.get("transferableSkills", [])
        gaps = fixture.get("skillGaps", [])
        skills = [str(item) for item in existing + transferable + gaps]

        dimension_data: dict[ProfileDimension, list[str]] = {
            ProfileDimension.SKILLS: skills,
            ProfileDimension.INTERESTS: _infer_interests(label, summary),
            ProfileDimension.EDUCATION: _infer_education(node_type, label),
            ProfileDimension.WORK_EXPERIENCE: _infer_experience(
                node_type, label, fixture.get("roleId")
            ),
        }
        if profile_tokens:
            for dimension, tokens in profile_tokens.items():
                if dimension not in dimension_data or not dimension_data[dimension]:
                    dimension_data[dimension] = sorted(tokens)

        return cls(
            id=node_id,
            node_type=node_type,
            label=label,
            summary=summary,
            dimension_data=dimension_data,
            metadata={
                key: value
                for key, value in fixture.items()
                if key
                not in {
                    "type",
                    "label",
                    "summary",
                    "existingSkills",
                    "transferableSkills",
                    "skillGaps",
                }
            },
        )


def _normalize_token(value: str) -> str:
    return " ".join(str(value).lower().split())


def _infer_interests(label: str, summary: str) -> list[str]:
    text = f"{label} {summary}".lower()
    interest_keywords = (
        "product",
        "design",
        "data",
        "ai",
        "machine learning",
        "cloud",
        "research",
        "leadership",
    )
    return [keyword for keyword in interest_keywords if keyword in text]


def _infer_education(node_type: str, label: str) -> list[str]:
    if node_type == "education_milestone":
        return [label]
    if "course" in label.lower():
        return [label]
    return []


def _infer_experience(
    node_type: str, label: str, role_id: Any
) -> list[str]:
    if node_type in {
        "entry_role",
        "intermediate_role",
        "destination_role",
        "experience",
    }:
        tokens = [label]
        if role_id:
            tokens.append(str(role_id).replace("-", " "))
        return tokens
    return []
