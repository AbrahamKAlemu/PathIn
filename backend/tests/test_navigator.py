import pytest
from flask import Flask

from pathin_api import create_app
from pathin_api.members import SnapshotMemberRepository
from pathin_api.models import ProfileDimension, ProfileNode, WeightingScenario
from pathin_api.navigator import HorizontalPathNavigator
from pathin_api.navigator_fixtures import NODE_FIXTURES, PATH_FIXTURES
from pathin_api.transition_analysis import TransitionAnalyzer, logistic_confidence
from pathin_api.weighting import (
    WeightingMatrix,
    build_career_identity,
    score_node,
)


@pytest.fixture
def navigator() -> HorizontalPathNavigator:
    return HorizontalPathNavigator(
        member_repository=SnapshotMemberRepository(),
    )


def test_weighting_matrices_sum_to_one() -> None:
    for scenario in WeightingScenario:
        matrix = WeightingMatrix.for_scenario(scenario)
        total = sum(matrix.weights.values())
        assert 0.99 <= total <= 1.01


def test_college_student_scenario_weights() -> None:
    matrix = WeightingMatrix.for_scenario(WeightingScenario.COLLEGE_STUDENT)
    assert matrix.weights[ProfileDimension.WORK_EXPERIENCE] == 0.40
    assert matrix.weights[ProfileDimension.SKILLS] == 0.30
    assert matrix.weights[ProfileDimension.EDUCATION] == 0.20
    assert matrix.weights[ProfileDimension.INTERESTS] == 0.10


def test_early_career_skills_are_not_contested() -> None:
    matrix = WeightingMatrix.for_scenario(WeightingScenario.EARLY_CAREER)
    assert matrix.skills_contested is False
    assert matrix.weights[ProfileDimension.WORK_EXPERIENCE] == 0.60


def test_logistic_confidence_is_bounded() -> None:
    confidence = logistic_confidence(
        node_score=72,
        neighbor_support=0.4,
        transition_support=0.2,
    )
    assert 0 < confidence < 1


def test_transition_analyzer_suppresses_sparse_counts() -> None:
    repository = SnapshotMemberRepository()
    analyzer = TransitionAnalyzer(
        repository.get_members(),
        repository.get_jobs(),
    )
    summary = analyzer.summary()
    assert summary["privacyThreshold"] == 20
    assert summary["method"] == "empirical_markov_cohort"


def test_profile_node_computes_its_own_score() -> None:
    identity = build_career_identity(
        {
            "id": "student-1",
            "education": ["Stanford University Computer Science"],
            "skills": ["Python", "Communication"],
            "interests": ["AI"],
        }
    )
    node = ProfileNode(
        id="course-ml",
        node_type="education_milestone",
        label="Machine Learning Fundamentals",
        summary="Bridge from coursework to applied data work.",
        dimension_data={
            ProfileDimension.SKILLS: ["python", "data analysis"],
            ProfileDimension.EDUCATION: ["machine learning fundamentals"],
            ProfileDimension.INTERESTS: ["ai"],
            ProfileDimension.WORK_EXPERIENCE: [],
        },
    )

    result = score_node(identity, node)

    assert result.node_id == "course-ml"
    assert result.total_score > 0
    assert "skills" in result.dimension_scores


def test_navigator_finds_neighbors_and_statistical_pathways(
    navigator: HorizontalPathNavigator,
) -> None:
    analysis = navigator.analyze(
        {
            "education": ["Stanford University"],
            "experience": ["LinkedIn"],
            "skills": ["Python", "Communication"],
            "interests": ["AI"],
        },
        node_fixtures=NODE_FIXTURES,
        path_fixtures=PATH_FIXTURES,
        active_path_ids=list(PATH_FIXTURES.keys())[:3],
    )

    assert analysis["careerIdentity"]["scenario"] == "early_career"
    assert analysis["neighbors"]
    assert analysis["nodeScores"]
    assert analysis["predictedPathways"]
    assert (
        analysis["statisticalAnalysis"]["method"]
        == "weighted_similarity_logistic_regression"
    )
    assert analysis["horizontalNavigation"]


def test_navigator_expand_node_returns_horizontal_branches(
    navigator: HorizontalPathNavigator,
) -> None:
    analysis = navigator.analyze(
        {
            "education": ["Stanford University"],
            "skills": ["Python"],
            "interests": ["Data"],
        },
        node_fixtures=NODE_FIXTURES,
        path_fixtures=PATH_FIXTURES,
        active_path_ids=list(PATH_FIXTURES.keys())[:3],
        focus_node_id="current",
    )

    horizontal = analysis["horizontalNavigation"]
    assert horizontal["focusNodeId"] == "current"
    assert horizontal["method"] == "weighted_logistic_branch_ranking"
    assert "left" in horizontal
    assert "right" in horizontal


def test_fixture_navigator_is_not_exposed_as_product_api() -> None:
    app: Flask = create_app()
    app.config.update(TESTING=True)
    client = app.test_client()

    assert client.post("/api/v1/navigator/analyze", json={}).status_code == 404
    assert (
        client.post("/api/v1/navigator/nodes/current/expand", json={}).status_code
        == 404
    )
