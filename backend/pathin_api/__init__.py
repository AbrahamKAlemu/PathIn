import os

from flask import Flask
from flask_cors import CORS


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


def create_app() -> Flask:
    app = Flask(__name__)
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

    return app
