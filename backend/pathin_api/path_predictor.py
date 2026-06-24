from __future__ import annotations

import uuid
from typing import Any, Protocol

from .models import (
    CareerIdentity,
    CareerNeighbor,
    NodeScore,
    PredictedPathway,
    ProfileNode,
)
from .transition_analysis import (
    TransitionAnalyzer,
    logistic_confidence,
    neighbor_support_for_label,
)


class PathPredictor(Protocol):
    def predict_pathways(
        self,
        *,
        identity: CareerIdentity,
        neighbors: list[CareerNeighbor],
        scored_nodes: list[NodeScore],
        available_nodes: list[ProfileNode],
        transition_analyzer: TransitionAnalyzer,
        focus_node_id: str | None = None,
        destination_id: str | None = None,
    ) -> list[PredictedPathway]: ...


class StatisticalPathPredictor:
    """Predict pathways using weighted scoring, cohort transitions, and logistic confidence."""

    def predict_pathways(
        self,
        *,
        identity: CareerIdentity,
        neighbors: list[CareerNeighbor],
        scored_nodes: list[NodeScore],
        available_nodes: list[ProfileNode],
        transition_analyzer: TransitionAnalyzer,
        focus_node_id: str | None = None,
        destination_id: str | None = None,
    ) -> list[PredictedPathway]:
        node_lookup = {node.id: node for node in available_nodes}
        score_lookup = {score.node_id: score for score in scored_nodes}
        ordered_scores = sorted(scored_nodes, key=lambda item: item.total_score, reverse=True)

        if focus_node_id:
            ordered_scores = [
                score for score in ordered_scores if score.node_id != focus_node_id
            ]
            seed_nodes = [focus_node_id] if focus_node_id in node_lookup else ["current"]
            source_label = node_lookup.get(focus_node_id, node_lookup.get("current")).label
        else:
            seed_nodes = ["current"]
            source_label = node_lookup["current"].label

        destination_nodes = _destination_nodes(
            available_nodes,
            destination_id=destination_id,
        )

        pathways: list[PredictedPathway] = []
        for index, destination in enumerate(destination_nodes[:3]):
            bridge_scores = [
                score
                for score in ordered_scores
                if score.node_id not in {destination.id, "current", focus_node_id}
            ][:3]
            bridge_nodes = [score.node_id for score in bridge_scores]
            node_ids = seed_nodes + bridge_nodes + [destination.id]

            neighbor_hint = neighbors[index] if index < len(neighbors) else None
            transition_support = transition_analyzer.transition_rate(
                source_label,
                destination.label,
            )
            if bridge_scores:
                transition_support = max(
                    transition_support,
                    transition_analyzer.cohort_support_for_label(
                        node_lookup[bridge_scores[0].node_id].label
                        if bridge_scores[0].node_id in node_lookup
                        else bridge_scores[0].node_id
                    ),
                )

            average_score = (
                sum(score.total_score for score in bridge_scores) / len(bridge_scores)
                if bridge_scores
                else score_lookup.get(seed_nodes[0], ordered_scores[0]).total_score
            )
            neighbor_support = neighbor_support_for_label(destination.label, neighbors)
            confidence = logistic_confidence(
                node_score=average_score,
                neighbor_support=neighbor_support,
                transition_support=transition_support,
            )

            actions = _recommended_actions(
                identity=identity,
                bridge_nodes=[
                    node_lookup[node_id]
                    for node_id in bridge_nodes
                    if node_id in node_lookup
                ],
                neighbor=neighbor_hint,
                transition_analyzer=transition_analyzer,
                source_label=source_label,
            )
            rationale = _build_rationale(
                identity=identity,
                destination=destination,
                neighbor=neighbor_hint,
                bridge_nodes=bridge_nodes,
                confidence=confidence,
                transition_support=transition_support,
            )
            pathways.append(
                PredictedPathway(
                    id=f"path_{uuid.uuid4().hex[:10]}",
                    label=f"{destination.label} route {index + 1}",
                    destination_label=destination.label,
                    confidence=confidence,
                    rationale=rationale,
                    recommended_actions=actions,
                    node_ids=node_ids,
                )
            )

        pathways.sort(key=lambda pathway: pathway.confidence, reverse=True)
        return pathways


def compute_horizontal_alternatives(
    *,
    focus_node_id: str,
    path_fixtures: dict[str, dict[str, Any]],
    active_path_ids: list[str],
    scored_nodes: list[NodeScore],
    transition_analyzer: TransitionAnalyzer,
    neighbors: list[CareerNeighbor],
    node_lookup: dict[str, ProfileNode],
) -> dict[str, Any]:
    focus_paths = [
        path_fixtures[path_id]
        for path_id in active_path_ids
        if path_id in path_fixtures and focus_node_id in path_fixtures[path_id]["nodeIds"]
    ]
    if not focus_paths:
        return {"left": [], "right": [], "method": "weighted_logistic_branch_ranking"}

    step_index = focus_paths[0]["nodeIds"].index(focus_node_id)
    sibling_ids: set[str] = set()
    for path in path_fixtures.values():
        node_ids = path["nodeIds"]
        if step_index < len(node_ids):
            candidate_id = node_ids[step_index]
            if candidate_id != focus_node_id:
                sibling_ids.add(candidate_id)

    ranked: list[dict[str, Any]] = []
    score_lookup = {score.node_id: score for score in scored_nodes}
    focus_node = node_lookup.get(focus_node_id)
    source_label = focus_node.label if focus_node else focus_node_id

    for node_id in sibling_ids:
        node = node_lookup.get(node_id)
        score = score_lookup.get(node_id)
        if node is None or score is None:
            continue
        transition_support = transition_analyzer.transition_rate(source_label, node.label)
        neighbor_support = neighbor_support_for_label(node.label, neighbors)
        confidence = logistic_confidence(
            node_score=score.total_score,
            neighbor_support=neighbor_support,
            transition_support=transition_support,
        )
        ranked.append(
            {
                "nodeId": node_id,
                "label": node.label,
                "nodeType": node.node_type,
                "totalScore": score.total_score,
                "confidence": round(confidence, 3),
                "transitionSupport": round(transition_support, 3),
                "neighborSupport": round(neighbor_support, 3),
                "fitReasons": score.fit_reasons,
            }
        )

    ranked.sort(
        key=lambda item: (item["confidence"], item["totalScore"]),
        reverse=True,
    )
    midpoint = max(1, len(ranked) // 2)
    return {
        "method": "weighted_logistic_branch_ranking",
        "focusNodeId": focus_node_id,
        "right": ranked[:midpoint],
        "left": ranked[midpoint:],
    }


def _destination_nodes(
    available_nodes: list[ProfileNode],
    *,
    destination_id: str | None,
) -> list[ProfileNode]:
    if destination_id:
        matches = [
            node
            for node in available_nodes
            if node.node_type == "destination_role"
            and (
                node.metadata.get("roleId") == destination_id
                or node.id == destination_id
            )
        ]
        if matches:
            return matches
    return [node for node in available_nodes if node.node_type == "destination_role"]


def _recommended_actions(
    *,
    identity: CareerIdentity,
    bridge_nodes: list[ProfileNode],
    neighbor: CareerNeighbor | None,
    transition_analyzer: TransitionAnalyzer,
    source_label: str,
) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for node in bridge_nodes:
        transition_rate = transition_analyzer.transition_rate(source_label, node.label)
        actions.append(
            {
                "type": _node_action_type(node.node_type),
                "label": node.label,
                "reason": (
                    f"Cohort transition support {transition_rate:.0%}. "
                    f"{node.summary or 'Builds toward the selected destination.'}"
                ),
                "statisticalSupport": round(transition_rate, 3),
            }
        )
    if neighbor:
        shared_companies = neighbor.shared_signals.get("work_experience", [])
        shared_schools = neighbor.shared_signals.get("education", [])
        if shared_schools:
            actions.append(
                {
                    "type": "connection",
                    "label": f"Peers from {shared_schools[0]}",
                    "reason": (
                        "Neighbors with overlapping education followed comparable routes."
                    ),
                    "statisticalSupport": round(neighbor.similarity_score, 3),
                }
            )
        if shared_companies:
            actions.append(
                {
                    "type": "job",
                    "label": f"Explore roles near {shared_companies[0]}",
                    "reason": (
                        "Neighbor histories show statistically similar employer transitions."
                    ),
                    "statisticalSupport": round(neighbor.similarity_score, 3),
                }
            )
    interests = identity.raw_fields.get("interests", [])
    if interests:
        actions.append(
            {
                "type": "club",
                "label": f"{interests[0]} community or club",
                "reason": "Interest-aligned activities improve exploratory fit scores.",
                "statisticalSupport": None,
            }
        )
    return actions[:5]


def _build_rationale(
    *,
    identity: CareerIdentity,
    destination: ProfileNode,
    neighbor: CareerNeighbor | None,
    bridge_nodes: list[str],
    confidence: float,
    transition_support: float,
) -> str:
    parts = [
        (
            f"Statistical fit for a {identity.scenario.value.replace('_', ' ')} profile "
            f"targets {destination.label} with {confidence:.0%} logistic confidence."
        )
    ]
    if bridge_nodes:
        parts.append(
            f"Bridge sequence: {', '.join(bridge_nodes[:3])} ranked by weighted overlap."
        )
    if transition_support > 0:
        parts.append(
            f"Cohort transition support for this move is {transition_support:.0%}."
        )
    elif neighbor:
        parts.append(
            "Direct cohort transitions are privacy-suppressed; neighbor similarity provides support."
        )
    return " ".join(parts)


def _node_action_type(node_type: str) -> str:
    mapping = {
        "education_milestone": "course",
        "skill": "project",
        "experience": "project",
        "entry_role": "job",
        "intermediate_role": "job",
        "destination_role": "job",
    }
    return mapping.get(node_type, "project")
