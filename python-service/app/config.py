"""Reads environment variables once; the rest of the service imports `settings`."""
import os

from dotenv import load_dotenv

load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class Settings:
    port: int = int(os.getenv("PORT", "8000"))
    database_url: str = _required("DATABASE_URL")
    # Must be the same secret + algorithm node-service signs tokens with.
    jwt_secret: str = _required("JWT_SECRET")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")


settings = Settings()
