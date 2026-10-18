"""Data models. Pydantic validates every request automatically."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class Settings(BaseModel):
    sensitivity: float = Field(1.0, ge=0.3, le=3.0)
    dwell_ms: int = Field(1500, ge=500, le=5000)
    voice_feedback: bool = False
    high_contrast: bool = False
    store_history: bool = True


class SessionIn(BaseModel):
    duration_s: float = Field(ge=0)
    commands_attempted: int = Field(0, ge=0)
    commands_recognized: int = Field(0, ge=0)
    task_completion_s: Optional[float] = Field(None, ge=0)
    accidental_activations: int = Field(0, ge=0)
    calibration_s: Optional[float] = Field(None, ge=0)


class Session(SessionIn):
    id: int
    created_at: datetime


class Analytics(BaseModel):
    total_sessions: int
    commands_attempted: int
    commands_recognized: int
    # None means "no data yet" (we never invent numbers)
    recognition_accuracy: Optional[float]
    avg_task_completion_s: Optional[float]
    accidental_activations: int
    avg_calibration_s: Optional[float]
