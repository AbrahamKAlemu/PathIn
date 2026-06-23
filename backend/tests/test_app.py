import pytest
from flask import Flask

from pathin_api import create_app


@pytest.fixture
def app() -> Flask:
    app = create_app()
    app.config.update(TESTING=True)
    return app


def test_index(app: Flask) -> None:
    response = app.test_client().get("/")

    assert response.status_code == 200
    assert response.get_json() == {
        "name": "PathIn API",
        "status": "ok",
    }


def test_health(app: Flask) -> None:
    response = app.test_client().get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {
        "service": "pathin-api",
        "status": "ok",
    }
