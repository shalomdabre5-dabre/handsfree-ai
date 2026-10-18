# Handsfree AI — Voice and Webcam-Based Browsing

Browse a demo web workspace using head movement (MediaPipe Face Landmarker) and voice commands (Web Speech API).

## Run locally

Backend (Terminal 1):
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Check: open http://127.0.0.1:8000/api/health -> {"status":"ok",...}  (API docs: /docs)

Frontend (Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (use Chrome or Edge; localhost counts as secure for camera/mic).

## Voice commands (Phase 1)
start/stop handsfree, scroll down/up, go to the top, go back, go home, click, confirm, cancel,
search for <topic>, type <text>, read this page, stop reading.

## Who owns what
- Developer 1: `frontend/` (UI, webcam, head tracking, calibration)
- Developer 2: `backend/` (API, database, analytics, deployment)

## Honest limits
- Head tracking uses real face landmarks but is auto-centred only; guided calibration comes in Phase 2.
- Speech recognition needs internet in Chrome/Edge. MediaPipe loads its model from a CDN on first start.
- Backend storage is a JSON file for development; it is wiped on free Render restarts.
