import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from .career_service import ApiError, CareerService
from .resume_parser import MAX_UPLOAD_BYTES
from .suggestion_service import (
    generate_suggestions,
    get_roles,
    get_scenario,
)


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

    @app.get("/api/v1/quiz/roles")
    def quiz_roles():
        return jsonify(get_roles())

    @app.get("/api/v1/quiz/scenarios/<role_id>")
    def quiz_scenario(role_id: str):
        scenario = get_scenario(role_id)
        if scenario is None:
            raise ApiError(
                "SCENARIO_NOT_FOUND",
                "That career simulation is not available.",
                status_code=404,
                details={"roleId": role_id},
            )
        return jsonify(scenario)

    @app.post("/api/v1/quiz/suggestions")
    def quiz_suggestions():
        try:
            return jsonify(generate_suggestions(_json_payload()))
        except ValueError as error:
            raise ApiError(
                "INVALID_SCENARIO_RESPONSE",
                str(error),
                status_code=400,
            ) from error

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
