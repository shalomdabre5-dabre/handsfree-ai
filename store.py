"""Development storage: in-memory + a JSON file so data survives restarts.

LIMITATIONS (be honest in your demo!):
- Single process only, no concurrent-writer safety beyond a lock.
- On Render's free tier the disk is wiped on every redeploy/restart.
- Replace this class with a Postgres/Supabase version in Phase 4; the
  methods (get_settings, save_settings, add_session, list_sessions)
  are the only thing main.py depends on.
"""
import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from .schemas import Session, SessionIn, Settings

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "dev_store.json"


class DevStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._settings = Settings()
        self._sessions: list[Session] = []
        self._load()

    def _load(self) -> None:
        if not DATA_FILE.exists():
            return
        try:
            raw = json.loads(DATA_FILE.read_text())
            self._settings = Settings(**raw.get("settings", {}))
            self._sessions = [Session(**s) for s in raw.get("sessions", [])]
        except Exception:
            # Corrupt file: start fresh instead of crashing the server.
            self._settings, self._sessions = Settings(), []

    def _save(self) -> None:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "settings": self._settings.model_dump(),
            "sessions": [s.model_dump(mode="json") for s in self._sessions],
        }
        DATA_FILE.write_text(json.dumps(payload, indent=2))

    def get_settings(self) -> Settings:
        with self._lock:
            return self._settings

    def save_settings(self, settings: Settings) -> Settings:
        with self._lock:
            self._settings = settings
            self._save()
            return settings

    def add_session(self, data: SessionIn) -> Session:
        with self._lock:
            session = Session(
                id=len(self._sessions) + 1,
                created_at=datetime.now(timezone.utc),
                **data.model_dump(),
            )
            self._sessions.append(session)
            self._save()
            return session

    def list_sessions(self) -> list[Session]:
        with self._lock:
            return list(reversed(self._sessions))  # newest first


store = DevStore()
