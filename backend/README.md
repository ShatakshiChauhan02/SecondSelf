# SecondSelf Backend

Python FastAPI backend for the SecondSelf Windows AI Digital Twin prototype.

## Requirements
- Python 3.10+
- FastAPI & Uvicorn

## Setup Instructions

1. **Create & activate virtual environment (Windows PowerShell):**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Run the backend development server:**
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

## Endpoints

### `GET /api/health`
Returns system status.
**Response:**
```json
{
  "status": "ok",
  "project": "SecondSelf"
}
```

## Structure
- `app/main.py`: FastAPI server entrypoint and route declarations.
- `app/agent/`: Reserved for future AI Agent modules.
- `app/memory/`: Reserved for future Personal Memory components.
- `app/browser/`: Reserved for future Browser Automation logic.
- `app/computer/`: Reserved for future Computer Control integrations.
