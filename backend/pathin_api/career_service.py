from __future__ import annotations

import copy
import threading
import uuid
from typing import Any

from werkzeug.datastructures import FileStorage

from .errors import ApiError
from .map_store import SavedMapStore, SQLiteSavedMapStore
from .pit_repository import (
    PRIVACY_THRESHOLD,
    EvidenceRepository,
    PitRepository,
    SnapshotPitRepository,
)
from .recommendation_engine import (
    ProfileNormalizer,
    RecommendationEngine,
    _string_list,
    _timestamp,
)
from .profile_store import (
    CurrentProfileStore,
    SQLiteCurrentProfileStore,
)
from .resume_parser import ResumeParser
from .taxonomy import (
    ALGORITHM_VERSION,
    MODEL_VERSION,
    ROLE_BY_ID,
    TAXONOMY_VERSION,
)

__all__ = [
    "ApiError",
    "CareerService",
    "PitRepository",
    "SnapshotPitRepository",
]


class CareerService:
    def __init__(
        self,
        repository: EvidenceRepository | None = None,
        saved_map_store: SavedMapStore | None = None,
        profile_store: CurrentProfileStore | None = None,
    ) -> None:
        self.repository = repository or PitRepository()
        self.saved_map_store = saved_map_store or SQLiteSavedMapStore()
        self.profile_store = profile_store or SQLiteCurrentProfileStore()
        self.resume_parser = ResumeParser()
        self.profile_normalizer = ProfileNormalizer()
        self._maps: dict[str, dict[str, Any]] = {}
        self._feedback: list[dict[str, Any]] = []
        self._lock = threading.Lock()

    def parse_resume(
        self,
        upload: FileStorage | None,
        *,
        source: str = "resume",
    ) -> dict[str, Any]:
        normalized_source = (
            "linkedin" if source.lower() == "linkedin" else "resume"
        )
        return self.resume_parser.parse_upload(
            upload,
            source=normalized_source,
        )

    def normalize_profile(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.profile_normalizer.normalize(payload)

    def get_current_profile(self) -> dict[str, Any]:
        return self.profile_store.get()

    def update_current_profile(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        patch = payload.get("profile", payload)
        if not isinstance(patch, dict):
            raise ApiError(
                "INVALID_PROFILE_UPDATE",
                "Profile updates must be a JSON object.",
                details={"field": "profile"},
            )
        return self.profile_store.update(patch)

    def explore(self, payload: dict[str, Any]) -> dict[str, Any]:
        profile = self.normalize_profile(payload)
        catalog = self.repository.get_catalog()
        engine = RecommendationEngine(catalog)
        feedback = self._feedback_request(payload)
        pinned_destinations = _string_list(
            payload.get("pinnedDestinationIds")
            or feedback.get("pinnedDestinationIds")
        )
        recommendations = engine.recommend(
            profile,
            feedback=feedback,
            pinned_destination_ids=pinned_destinations,
            count=self._result_count(payload.get("resultCount")),
        )
        career_map = engine.build_map(
            profile,
            recommendations,
            mode="explore",
            pinned_node_ids=_string_list(payload.get("pinnedNodeIds")),
            dismissed_node_ids=_string_list(payload.get("dismissedNodeIds")),
            feedback=feedback,
        )
        self._store_map(career_map)
        return career_map

    def build(self, payload: dict[str, Any]) -> dict[str, Any]:
        profile = self.normalize_profile(payload)
        destination_id = str(payload.get("destinationId", "")).strip()
        role_id = destination_id.removeprefix("dest-")
        if role_id not in ROLE_BY_ID:
            raise ApiError(
                "INVALID_DESTINATION",
                "Choose a destination returned by the Path[IN] catalog.",
                details={"destinationId": destination_id},
            )
        catalog = self.repository.get_catalog()
        engine = RecommendationEngine(catalog)
        feedback = self._feedback_request(payload)
        recommendation = engine.score_destination(
            profile,
            role_id,
            feedback=feedback,
        )
        career_map = engine.build_map(
            profile,
            [recommendation],
            mode="build",
            pinned_node_ids=_string_list(payload.get("pinnedNodeIds")),
            dismissed_node_ids=_string_list(payload.get("dismissedNodeIds")),
            feedback=feedback,
        )
        self._store_map(career_map)
        return career_map

    def get_map(self, map_id: str) -> dict[str, Any]:
        with self._lock:
            career_map = self._maps.get(map_id)
        if career_map is None:
            career_map = self.saved_map_store.get(map_id)
            if career_map is not None:
                self._store_map(career_map)
        if career_map is None:
            raise ApiError(
                "MAP_NOT_FOUND",
                "The requested career map was not found.",
                status_code=404,
            )
        return copy.deepcopy(career_map)

    def update_map(
        self,
        map_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        allowed = {
            "name",
            "pinnedNodeIds",
            "dismissedNodeIds",
            "viewport",
        }
        unknown = set(payload) - allowed
        if unknown:
            raise ApiError(
                "UNSUPPORTED_MAP_UPDATE",
                "One or more map fields cannot be updated.",
                details={"unsupportedFields": sorted(unknown)},
            )
        career_map = self.get_map(map_id)
        node_ids = {node["id"] for node in career_map["nodes"]}
        for field in ("pinnedNodeIds", "dismissedNodeIds"):
            if field not in payload:
                continue
            values = _string_list(payload[field])
            invalid = sorted(set(values) - node_ids)
            if invalid:
                raise ApiError(
                    "INVALID_NODE",
                    "The update references a node outside this map.",
                    details={"nodeIds": invalid},
                )
            career_map[field] = values
        if "name" in payload:
            career_map["name"] = str(payload["name"]).strip()[:120]
        if "viewport" in payload:
            career_map["viewport"] = (
                copy.deepcopy(payload["viewport"])
                if isinstance(payload["viewport"], dict)
                else {}
            )
        career_map["updatedAt"] = _timestamp()
        career_map["savedAt"] = career_map["updatedAt"]
        self._store_map(career_map)
        self.saved_map_store.save(career_map)
        return copy.deepcopy(career_map)

    def regenerate(
        self,
        map_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        current = self.get_map(map_id)
        profile_payload = payload.get("profile", current["profileSnapshot"])
        if not isinstance(profile_payload, dict):
            raise ApiError(
                "INVALID_PROFILE",
                "Profile input must be a JSON object.",
                details={"field": "profile"},
            )
        feedback = {
            **copy.deepcopy(
                current.get("generationConstraints", {}).get("feedback", {})
            ),
            **self._feedback_request(payload),
        }
        self._apply_feedback_action(feedback, payload, current)
        merged_payload = {
            "profile": profile_payload,
            "feedback": feedback,
            "pinnedNodeIds": payload.get(
                "pinnedNodeIds", current.get("pinnedNodeIds", [])
            ),
            "dismissedNodeIds": payload.get(
                "dismissedNodeIds", current.get("dismissedNodeIds", [])
            ),
            "pinnedDestinationIds": payload.get(
                "pinnedDestinationIds",
                [
                    node_id
                    for node_id in current.get("pinnedNodeIds", [])
                    if str(node_id).startswith("dest-")
                ],
            ),
            "resultCount": payload.get(
                "resultCount",
                len(current.get("destinationIds", [])) or 4,
            ),
        }
        if current["mode"] == "build":
            destination_id = str(
                payload.get(
                    "destinationId",
                    current.get("destinationIds", [""])[0],
                )
            )
            merged_payload["destinationId"] = destination_id
            regenerated = self.build(merged_payload)
        else:
            regenerated = self.explore(merged_payload)
        regenerated["previousMapId"] = map_id
        self._store_map(regenerated)
        return regenerated

    def add_feedback(
        self,
        map_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        career_map = self.get_map(map_id)
        category = str(payload.get("category", "")).strip()
        allowed_categories = {
            "helpful",
            "not_helpful",
            "not_for_me",
            "more_like_this",
            "something_different",
            "incorrect",
            "unsafe",
            "biased",
            "other",
        }
        if category not in allowed_categories:
            raise ApiError(
                "INVALID_FEEDBACK",
                "Choose a supported feedback category.",
                details={"allowedCategories": sorted(allowed_categories)},
            )
        target = (
            copy.deepcopy(payload["target"])
            if isinstance(payload.get("target"), dict)
            else {}
        )
        feedback = {
            "id": f"feedback_{uuid.uuid4().hex}",
            "mapId": map_id,
            "target": target,
            "category": category,
            "comment": str(payload.get("comment", "")).strip()[:2000],
            "safetyOrBias": bool(
                payload.get("safetyOrBias")
                or category in {"unsafe", "biased"}
            ),
            "generation": copy.deepcopy(career_map["generation"]),
            "createdAt": _timestamp(),
        }
        with self._lock:
            self._feedback.append(feedback)
        return {
            "accepted": True,
            "feedbackId": feedback["id"],
            "message": (
                "Feedback was recorded with the map generation versions. "
                "Use regenerate to apply ranking feedback."
            ),
        }

    def role_details(self, role_id: str) -> dict[str, Any]:
        normalized_role_id = role_id.removeprefix("dest-")
        role = ROLE_BY_ID.get(normalized_role_id)
        if role is None:
            raise ApiError(
                "ROLE_NOT_FOUND",
                "The requested role is not available.",
                status_code=404,
            )
        catalog = self.repository.get_catalog()
        return {
            **copy.deepcopy(role),
            "marketSnapshot": copy.deepcopy(
                catalog.get("roleStats", {}).get(normalized_role_id)
            ),
            "source": {
                **copy.deepcopy(catalog["source"]),
                "scope": (
                    "Synthetic PIT aggregate postings and maintained Path[IN] "
                    "occupational taxonomy."
                ),
            },
            "versions": {
                "taxonomy": TAXONOMY_VERSION,
                "model": MODEL_VERSION,
                "algorithm": ALGORITHM_VERSION,
            },
        }

    @staticmethod
    def versions() -> dict[str, Any]:
        return {
            "api": "v1",
            "taxonomy": TAXONOMY_VERSION,
            "model": MODEL_VERSION,
            "algorithm": ALGORITHM_VERSION,
            "resumeParser": "pathin-resume-parser-1.1",
            "profileSchema": "pathin-current-profile-1.0",
            "privacyThreshold": PRIVACY_THRESHOLD,
        }

    @staticmethod
    def _result_count(value: Any) -> int:
        try:
            requested = int(value)
        except (TypeError, ValueError):
            requested = 4
        return max(3, min(5, requested))

    @staticmethod
    def _feedback_request(payload: dict[str, Any]) -> dict[str, Any]:
        feedback = payload.get("feedback")
        return copy.deepcopy(feedback) if isinstance(feedback, dict) else {}

    @staticmethod
    def _apply_feedback_action(
        feedback: dict[str, Any],
        payload: dict[str, Any],
        current_map: dict[str, Any],
    ) -> None:
        action = str(payload.get("action", "")).strip()
        target_id = str(payload.get("targetId", "")).strip()
        if not action:
            return
        if action == "regenerate":
            pinned_destinations = {
                str(node_id)
                for node_id in _string_list(
                    payload.get(
                        "pinnedNodeIds",
                        current_map.get("pinnedNodeIds", []),
                    )
                )
                if str(node_id).startswith("dest-")
            }
            feedback["regeneratedFromRoleIds"] = [
                destination_id
                for destination_id in current_map.get("destinationIds", [])
                if destination_id not in pinned_destinations
            ]
            return
        if not target_id:
            return
        if action == "not_for_me":
            target_node = next(
                (
                    node
                    for node in current_map.get("nodes", [])
                    if node.get("id") == target_id
                ),
                None,
            )
            if target_node and target_node.get("type") == "destination":
                values = _string_list(feedback.get("notForMeRoleIds"))
                if target_id not in values:
                    values.append(target_id)
                feedback["notForMeRoleIds"] = values
            elif target_node:
                labels = _string_list(feedback.get("avoidStepLabels"))
                label = str(target_node.get("label", "")).strip()
                if label and label not in labels:
                    labels.append(label)
                feedback["avoidStepLabels"] = labels
        elif action == "more_like_this":
            feedback["moreLikeRoleId"] = target_id
        elif action == "something_different":
            feedback["differentFromRoleId"] = target_id
        elif action == "alternative_route":
            feedback["alternativeRouteFor"] = target_id

    def _store_map(self, career_map: dict[str, Any]) -> None:
        with self._lock:
            self._maps[career_map["id"]] = copy.deepcopy(career_map)
