"""
SecondSelf Backend Package
"""
from pathlib import Path
from dotenv import load_dotenv

# Automatically load .env configuration from backend/.env or root .env
env_backend = Path(__file__).parent.parent / ".env"
env_root = Path(__file__).parent.parent.parent / ".env"

if env_backend.exists():
    load_dotenv(dotenv_path=env_backend)
elif env_root.exists():
    load_dotenv(dotenv_path=env_root)
else:
    load_dotenv()
