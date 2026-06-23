import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from .career_service import ApiError, CareerService


def _frontend_origins() -> list[str]:
    configured_origins = os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000",
    )
    return [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]


def create_app(career_service: CareerService | None = None) -> Flask:
    app = Flask(__name__)
    service = career_service or CareerService()
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
            "versions": {
                "api": "v1",
                "taxonomy": "pathin-taxonomy-0.1",
                "model": "pathin-rules-0.1",
                "prompt": "prd-1.0",
            },
            "privacyThreshold": 20,
        }

    @app.post("/api/v1/profiles/normalize")
    def normalize_profile():
        return jsonify(service.normalize_profile(_json_payload()))

    @app.get("/api/v1/maps/demo")
    def demo_map():
        return jsonify(service.demo_map())

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

    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
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
