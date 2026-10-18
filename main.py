import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import Analytics, Session, SessionIn, Settings
from .store import store

app = FastAPI(title="Handsfree AI API", version="0.1.0")

origins = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "storage": "dev-json-file"}


@app.get("/api/settings", response_model=Settings)
def get_settings():
    return store.get_settings()


@app.put("/api/settings", response_model=Settings)
def put_settings(settings: Settings):
    return store.save_settings(settings)


@app.post("/api/sessions", response_model=Session, status_code=201)
def create_session(data: SessionIn):
    return store.add_session(data)


@app.get("/api/sessions", response_model=list[Session])
def list_sessions():
    return store.list_sessions()


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 2) if values else None


@app.get("/api/analytics", response_model=Analytics)
def analytics():
    sessions = store.list_sessions()
    attempted = sum(s.commands_attempted for s in sessions)
    recognized = sum(s.commands_recognized for s in sessions)
    return Analytics(
        total_sessions=len(sessions),
        commands_attempted=attempted,
        commands_recognized=recognized,
        recognition_accuracy=round(recognized / attempted * 100, 1) if attempted else None,
        avg_task_completion_s=_avg(s.task_completion_s for s in sessions),
        accidental_activations=sum(s.accidental_activations for s in sessions),
        avg_calibration_s=_avg(s.calibration_s for s in sessions),
    )
