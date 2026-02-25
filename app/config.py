from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "breakout_scanner.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
]
