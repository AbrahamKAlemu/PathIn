from __future__ import annotations

from typing import Any

from .models import (
    CareerIdentity,
    NodeScore,
    ProfileDimension,
    ProfileNode,
    ScorableNode,
    WeightingMatrix,
    WeightingScenario,
    _normalize_token,
)


def detect_weighting_scenario(profile: dict[str, Any]) -> WeightingScenario:
    explicit = profile.get("weightingScenario") or profile.get("careerStage")
    if explicit:
        normalized = str(explicit).strip().lower()
        mapping = {
            "college_student": WeightingScenario.COLLEGE_STUDENT,
            "student": WeightingScenario.COLLEGE_STUDENT,
            "student_or_exploring": WeightingScenario.COLLEGE_STUDENT,
            "early_career": WeightingScenario.EARLY_CAREER,
            "early_career_professional": WeightingScenario.EARLY_CAREER,
            "professional": WeightingScenario.EARLY_CAREER,
            "career_explorer": WeightingScenario.CAREER_EXPLORER,
            "explorer": WeightingScenario.CAREER_EXPLORER,
        }
        if normalized in mapping:
            return mapping[normalized]

    experience = profile.get("experience") or []
    education = profile.get("education") or []
    interests = profile.get("interests") or []
    skills = profile.get("skills") or []

    if experience:
        return WeightingScenario.EARLY_CAREER
    if education and not experience:
        return WeightingScenario.COLLEGE_STUDENT
    if interests or skills:
        return WeightingScenario.CAREER_EXPLORER
    return WeightingScenario.CAREER_EXPLORER


def build_career_identity(profile: dict[str, Any]) -> CareerIdentity:
    scenario = detect_weighting_scenario(profile)
    dimensions = {
        ProfileDimension.WORK_EXPERIENCE: _tokenize_fields(
            profile.get("experience", []),
            profile.get("projects", []),
            profile.get("activities", []),
            profile.get("volunteering", []),
        ),
        ProfileDimension.SKILLS: _tokenize_fields(profile.get("skills", [])),
        ProfileDimension.EDUCATION: _tokenize_fields(
            profile.get("education", []),
            profile.get("coursework", []),
        ),
        ProfileDimension.INTERESTS: _tokenize_fields(profile.get("interests", [])),
    }
    return CareerIdentity(
        profile_id=str(profile.get("id", "anonymous-profile")),
        scenario=scenario,
        dimensions=dimensions,
        weighting=WeightingMatrix.for_scenario(scenario),
        raw_fields={
            "education": _string_list(profile.get("education")),
            "coursework": _string_list(profile.get("coursework")),
            "experience": _string_list(profile.get("experience")),
            "projects": _string_list(profile.get("projects")),
            "activities": _string_list(profile.get("activities")),
            "volunteering": _string_list(profile.get("volunteering")),
            "skills": _string_list(profile.get("skills")),
            "interests": _string_list(profile.get("interests")),
            "goals": _string_list(profile.get("goals")),
        },
    )


def score_node(
    identity: CareerIdentity,
    node: ScorableNode,
    *,
    weighting: WeightingMatrix | None = None,
) -> NodeScore:
    matrix = weighting or identity.weighting
    node_tokens = node.dimension_tokens()
    dimension_scores: dict[str, float] = {}
    fit_reasons: list[str] = []

    for dimension, weight in matrix.weights.items():
        user_tokens = identity.tokens_for(dimension)
        candidate_tokens = node_tokens.get(dimension, set())
        similarity = _jaccard_similarity(user_tokens, candidate_tokens)
        if (
            dimension == ProfileDimension.SKILLS
            and not matrix.skills_contested
            and user_tokens
        ):
            overlap = user_tokens & candidate_tokens
            if overlap:
                similarity = max(similarity, len(overlap) / len(user_tokens))
                fit_reasons.append(
                    "Skills are treated as established signals for early-career matching."
                )
        dimension_scores[dimension.value] = similarity
        shared = sorted(user_tokens & candidate_tokens)
        if shared:
            fit_reasons.append(
                f"Shared {dimension.value.replace('_', ' ')}: {', '.join(shared[:3])}."
            )

    total = sum(
        matrix.weights[dimension] * dimension_scores[dimension.value]
        for dimension in matrix.weights
    )
    total_percent = round(total * 100, 2)

    if not fit_reasons:
        fit_reasons.append(
            "This step builds adjacent evidence even where direct overlap is limited."
        )

    return NodeScore(
        node_id=node.id,
        total_score=total_percent,
        dimension_scores=dimension_scores,
        weights_applied={
            dimension.value: weight for dimension, weight in matrix.weights.items()
        },
        fit_reasons=fit_reasons[:4],
    )


def score_nodes(
    identity: CareerIdentity,
    nodes: list[ProfileNode],
) -> list[NodeScore]:
    scored = [score_node(identity, node) for node in nodes]
    return sorted(scored, key=lambda item: item.total_score, reverse=True)


def _jaccard_similarity(left: set[str], right: set[str]) -> float:
    if not left and not right:
        return 0.0
    if not left or not right:
        return 0.0
    intersection = left & right
    union = left | right
    token_overlap = len(intersection) / len(union)
    partial = _partial_token_overlap(left, right)
    return max(token_overlap, partial)


def _partial_token_overlap(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    matches = 0
    for left_token in left:
        for right_token in right:
            if left_token in right_token or right_token in left_token:
                matches += 1
                break
    return matches / max(len(left), len(right))


def _tokenize_fields(*field_groups: Any) -> set[str]:
    tokens: set[str] = set()
    for group in field_groups:
        for value in _string_list(group):
            tokens.add(_normalize_token(value))
            for part in value.replace(",", " ").replace("|", " ").split():
                cleaned = _normalize_token(part)
                if len(cleaned) > 2:
                    tokens.add(cleaned)
    return tokens


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
