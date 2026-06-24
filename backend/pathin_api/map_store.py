from __future__ import annotations

import copy
import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Protocol


class SavedMapStore(Protocol):
    def get(self, map_id: str) -> dict[str, Any] | None:
        ...

    def save(self, career_map: dict[str, Any]) -> None:
        ...


class InMemorySavedMapStore:
    def __init__(self) -> None:
        self._maps: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def get(self, map_id: str) -> dict[str, Any] | None:
        with self._lock:
            career_map = self._maps.get(map_id)
            return copy.deepcopy(career_map) if career_map else None

    def save(self, career_map: dict[str, Any]) -> None:
        with self._lock:
            self._maps[career_map["id"]] = copy.deepcopy(career_map)


class SQLiteSavedMapStore:
    def __init__(self, database_path: str | Path | None = None) -> None:
        configured_path = database_path or os.getenv("PATHIN_MAP_DB")
        self.database_path = Path(
            configured_path
            or Path(__file__).resolve().parents[1]
            / "instance"
            / "pathin_maps.sqlite3"
        ).expanduser()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._initialize()

    def get(self, map_id: str) -> dict[str, Any] | None:
        with self._lock, self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM saved_maps WHERE id = ?",
                (map_id,),
            ).fetchone()
        if row is None:
            return None
        payload = json.loads(row[0])
        return payload if isinstance(payload, dict) else None

    def save(self, career_map: dict[str, Any]) -> None:
        payload = json.dumps(
            career_map,
            ensure_ascii=True,
            separators=(",", ":"),
            sort_keys=True,
        )
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO saved_maps (id, payload, saved_at)
                VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    payload = excluded.payload,
                    saved_at = excluded.saved_at
                """,
                (
                    career_map["id"],
                    payload,
                    career_map.get("savedAt", career_map.get("updatedAt", "")),
                ),
            )
            connection.commit()

    def _initialize(self) -> None:
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS saved_maps (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    saved_at TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.database_path, timeout=5)
