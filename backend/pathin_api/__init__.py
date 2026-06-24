import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from .career_service import ApiError, CareerService
from .navigator import HorizontalPathNavigator
from .navigator_fixtures import NODE_FIXTURES, PATH_FIXTURES
from .resume_parser import MAX_UPLOAD_BYTES


def _frontend_origins() -> list[str]:
    configured_origins = os.getenv(
        "FRONTEND_ORIGINS",
        (
            "http://localhost:3000,http://127.0.0.1:3000,"
            "https://pit26codepin.vercel.app"
        ),
    )
    return [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]


def create_app(career_service: CareerService | None = None) -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES + 64 * 1024
    service = career_service or CareerService()
    navigator = HorizontalPathNavigator()

    def _run_navigator(payload: dict[str, object]) -> dict[str, object]:
        profile = payload.get("profile")
        if not isinstance(profile, dict):
            profile = payload
        active_path_ids = payload.get("activePathIds") or list(
            PATH_FIXTURES.keys()
        )[:3]
        focus_node_id = str(payload.get("focusNodeId") or "").strip() or None
        destination_id = str(payload.get("destinationId") or "").strip() or None
        try:
            neighbor_limit = int(payload.get("neighborLimit", 8))
        except (TypeError, ValueError):
            neighbor_limit = 8
        return navigator.analyze(
            profile,
            node_fixtures=NODE_FIXTURES,
            path_fixtures=PATH_FIXTURES,
            active_path_ids=active_path_ids,
            focus_node_id=focus_node_id,
            destination_id=destination_id,
            neighbor_limit=neighbor_limit,
        )

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": _frontend_origins(),
            }
        },
    )

    @app.get("/")
    def index() -> dict[str, str]:
        return {
            "name": "PathIn API",
            "status": "ok",
        }

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {
            "service": "pathin-api",
            "status": "ok",
        }

    @app.get("/api/v1/health")
    def versioned_health() -> dict[str, object]:
        return {
            "service": "pathin-api",
            "status": "ok",
            "versions": service.versions(),
            "privacyThreshold": service.versions()["privacyThreshold"],
        }

    @app.post("/api/v1/resumes/parse")
    def parse_resume():
        source = str(request.form.get("source", "resume"))
        return jsonify(
            service.parse_resume(
                request.files.get("file"),
                source=source,
            )
        )

    @app.post("/api/v1/profiles/normalize")
    def normalize_profile():
        return jsonify(service.normalize_profile(_json_payload()))

    @app.get("/api/v1/profiles/current")
    def current_profile():
        return jsonify(service.get_current_profile())

    @app.patch("/api/v1/profiles/current")
    def update_current_profile():
        return jsonify(service.update_current_profile(_json_payload()))

    @app.post("/api/v1/maps/explore")
    def explore_map():
        return jsonify(service.explore(_json_payload())), 201

    @app.post("/api/v1/maps/build")
    def build_map():
        return jsonify(service.build(_json_payload())), 201

    @app.get("/api/v1/maps/<map_id>")
    def get_map(map_id: str):
        return jsonify(service.get_map(map_id))

    @app.patch("/api/v1/maps/<map_id>")
    def update_map(map_id: str):
        return jsonify(service.update_map(map_id, _json_payload()))

    @app.post("/api/v1/maps/<map_id>/regenerate")
    def regenerate_map(map_id: str):
        return jsonify(service.regenerate(map_id, _json_payload())), 201

    @app.post("/api/v1/maps/<map_id>/feedback")
    def map_feedback(map_id: str):
        return jsonify(service.add_feedback(map_id, _json_payload())), 202

    @app.get("/api/v1/roles/<role_id>")
    def role_details(role_id: str):
        return jsonify(service.role_details(role_id))

    @app.post("/api/v1/navigator/analyze")
    def navigator_analyze():
        return jsonify(_run_navigator(_json_payload()))

    @app.post("/api/v1/navigator/nodes/<node_id>/expand")
    def navigator_expand_node(node_id: str):
        payload = _json_payload()
        payload["focusNodeId"] = node_id
        return jsonify(_run_navigator(payload))

    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(RequestEntityTooLarge)
    def handle_oversized_upload(_error: RequestEntityTooLarge):
        error = ApiError(
            "FILE_TOO_LARGE",
            "The selected file is larger than the 5 MB limit.",
            details={"maxBytes": MAX_UPLOAD_BYTES},
        )
        return jsonify(error.to_dict()), error.status_code

    return app


def _json_payload() -> dict[str, object]:
    payload = request.get_json(silent=True)
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ApiError(
            "INVALID_JSON",
            "The request body must be a JSON object.",
            details={"contentType": request.content_type},
        )
    return payload
