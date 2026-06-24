from __future__ import annotations

from typing import Any

from .members import MemberRepository, PitMemberRepository, SnapshotMemberRepository
from .models import CareerIdentity, ProfileNode
from .neighbors import CareerNeighborFinder
from .path_predictor import StatisticalPathPredictor, compute_horizontal_alternatives
from .transition_analysis import TransitionAnalyzer
from .weighting import build_career_identity, score_node, score_nodes


class HorizontalPathNavigator:
    def __init__(
        self,
        *,
        member_repository: MemberRepository | None = None,
        path_predictor: StatisticalPathPredictor | None = None,
    ) -> None:
        self.member_repository = member_repository or PitMemberRepository()
        self.neighbor_finder = CareerNeighborFinder(self.member_repository)
        self.path_predictor = path_predictor or StatisticalPathPredictor()

    def create_identity(self, profile: dict[str, Any]) -> CareerIdentity:
        return build_career_identity(profile)

    def analyze(
        self,
        profile: dict[str, Any],
        *,
        node_fixtures: dict[str, dict[str, Any]],
        path_fixtures: dict[str, dict[str, Any]] | None = None,
        active_path_ids: list[str] | None = None,
        focus_node_id: str | None = None,
        destination_id: str | None = None,
        neighbor_limit: int = 8,
    ) -> dict[str, Any]:
        identity = self.create_identity(profile)
        members = self.member_repository.get_members()
        jobs = self.member_repository.get_jobs()
        transition_analyzer = TransitionAnalyzer(members, jobs)
        neighbors = self.neighbor_finder.find_neighbors(
            identity,
            limit=neighbor_limit,
        )
        profile_tokens = {
            dimension: identity.tokens_for(dimension)
            for dimension in identity.weighting.weights
        }
        nodes = [
            ProfileNode.from_fixture(node_id, fixture, profile_tokens=profile_tokens)
            for node_id, fixture in node_fixtures.items()
        ]
        current_node = ProfileNode(
            id="current",
            node_type="current_standing",
            label="Your current standing",
            summary="Editable snapshot from authorized profile fields.",
            dimension_data={
                dimension: sorted(tokens)
                for dimension, tokens in profile_tokens.items()
            },
        )
        all_nodes = [current_node, *nodes]
        node_lookup = {node.id: node for node in all_nodes}
        scored = score_nodes(identity, all_nodes)
        pathways = self.path_predictor.predict_pathways(
            identity=identity,
            neighbors=neighbors,
            scored_nodes=scored,
            available_nodes=all_nodes,
            transition_analyzer=transition_analyzer,
            focus_node_id=focus_node_id,
            destination_id=destination_id,
        )

        horizontal_navigation: dict[str, Any] | None = None
        horizontal_focus = focus_node_id or "current"
        if path_fixtures and active_path_ids:
            horizontal_navigation = compute_horizontal_alternatives(
                focus_node_id=horizontal_focus,
                path_fixtures=path_fixtures,
                active_path_ids=active_path_ids,
                scored_nodes=scored,
                transition_analyzer=transition_analyzer,
                neighbors=neighbors,
                node_lookup=node_lookup,
            )

        response = {
            "careerIdentity": identity.as_dict(),
            "neighbors": [neighbor.as_dict() for neighbor in neighbors],
            "nodeScores": [score.as_dict() for score in scored],
            "predictedPathways": [pathway.as_dict() for pathway in pathways],
            "statisticalAnalysis": {
                "method": "weighted_similarity_logistic_regression",
                "transitionModel": transition_analyzer.summary(),
            },
        }
        if focus_node_id:
            focus_score = next(
                (item for item in scored if item.node_id == focus_node_id),
                None,
            )
            response["focusNodeId"] = focus_node_id
            response["focusScore"] = (
                focus_score.as_dict() if focus_score else None
            )
        if horizontal_navigation is not None:
            response["horizontalNavigation"] = horizontal_navigation
        return response

    def score_single_node(
        self,
        profile: dict[str, Any],
        node_id: str,
        fixture: dict[str, Any],
    ) -> dict[str, Any]:
        identity = self.create_identity(profile)
        node = ProfileNode.from_fixture(
            node_id,
            fixture,
            profile_tokens={
                dimension: identity.tokens_for(dimension)
                for dimension in identity.weighting.weights
            },
        )
        return score_node(identity, node).as_dict()


def create_navigator(*, use_snapshot: bool = False) -> HorizontalPathNavigator:
    repository = (
        SnapshotMemberRepository()
        if use_snapshot
        else PitMemberRepository()
    )
    return HorizontalPathNavigator(member_repository=repository)
