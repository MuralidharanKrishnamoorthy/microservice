from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.database.connection import ping

router = APIRouter()


@router.get("/health")
def health():
    try:
        ping()
        database = "up"
    except Exception:
        database = "down"
    healthy = database == "up"
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={"success": healthy, "service": "python-service", "data": {"database": database}},
    )
