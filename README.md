# SecondSelf — Windows AI Digital Twin

**SecondSelf** is a Windows-first prototype of an AI digital twin. The project is an independent implementation of an AI twin capable of understanding user preferences, maintaining persistent memory, reasoning about tasks, using tools, automating web browser actions, and controlling Windows desktop software on the user's behalf with explicit approval.

## Platform Target
- **Target OS:** Windows
- **Hackathon Phase:** Phase 7 (Complete Prototype)
- **License / Cost:** Built strictly using free and open-source software (FOSS).

## Conceptual Architecture

```
User
  │
  ▼
SecondSelf Interface (React + Vite Dark Glassmorphism Dashboard)
  │
  ▼
AI Agent (FastAPI Backend Core & Agent reasoning engine)
  │
  ▼
Personal Memory + Tool Registry (SQLite Storage & Native ToolRegistry)
  │
  ▼
Browser Automation & Windows Computer Control (Playwright Chromium & PyAutoGUI)
```

## System Features

- **Backend:** FastAPI application running on Uvicorn with CORS middleware enabled for local frontend access.
- **AI Core:** Dual LLM provider support (Google Gemini Cloud API & Ollama local fallback) with native function declaration tool calling.
- **Persistent Personal Memory:** Local SQLite storage (`data/secondself.db`) with explicit command parsing ("Remember that...", "Forget that...") and dynamic prompt context injection.
- **Browser Automation:** Local Playwright Chromium automation (`browser_open`, `browser_search`, `browser_read`, `browser_screenshot`, `browser_current_url`) with URL scheme security validation.
- **Windows Computer Control:** Controlled desktop operations (`computer_open_app`, `computer_type`, `computer_click`, `computer_move_mouse`, `computer_press_key`, `computer_hotkey`, `computer_screenshot`) with explicit UI toggle authorization, PyAutoGUI fail-safe, and strict application allowlists.
- **Multi-Tool Orchestration:** Autonomous step execution loop (max 5 iterations) with risk classification (`READ`, `SAFE_ACTION`) and task status reporting (`completed` | `partial` | `failed`).
- **Frontend Dashboard:** Dark mode glassmorphism React interface featuring live health indicator, avatar animation, Memory status modal, Browser status card, Computer Control card, Activity panel, and chat action badges.

---

## Getting Started (Windows Setup)

### Prerequisites
- **Python 3.10+**
- **Node.js v18+ & npm**

### 1. Quick Launch (Batch / PowerShell)
Run the automated launcher script from the root directory:
```cmd
run_all.bat
```
*(Or use PowerShell scripts `start_backend.ps1` and `start_frontend.ps1`)*

---

### 2. Manual Launch Instructions

#### Backend Setup
```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Install Playwright Chromium binaries (one-time setup)
python -m playwright install chromium

# Start backend server
uvicorn app.main:app --reload --port 8000
```
Backend will be live at: **http://127.0.0.1:8000**  
Health Check: **http://127.0.0.1:8000/api/health**

#### Frontend Setup
```powershell
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend will be live at: **http://127.0.0.1:5173**

---

## Directory Structure

```
SecondSelf/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application & REST API routes
│   │   ├── agent/           # Agent Core reasoning engine & prompts
│   │   ├── memory/          # SQLite memory repository & service
│   │   ├── browser/         # Playwright Chromium browser service
│   │   ├── computer/        # PyAutoGUI Windows computer control service
│   │   ├── tools/           # Native ToolRegistry & tool declarations
│   │   └── llm/             # LLM Provider abstraction (Gemini & Ollama)
│   ├── tests/               # Pytest suite (27 unit tests)
│   ├── requirements.txt     # Minimal backend dependencies
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── components/      # UI components (Header, TwinPanel, ChatPanel, etc.)
│   └── README.md
├── data/
│   ├── screenshots/         # Captured browser and computer screenshots
│   ├── secondself.db        # SQLite database
│   └── .gitkeep
├── .env.example
├── .gitignore
├── start_backend.ps1
├── start_frontend.ps1
├── run_all.bat
└── README.md
```
