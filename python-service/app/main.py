"""python-service: records microservice (FastAPI, port 8000)."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database.connection import init_schema
from app.routes import health, records

logger = logging.getLogger("python-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_schema()  # creates the records table this service owns
    yield


app = FastAPI(title="python-service", description="Records microservice", lifespan=lifespan)

# Only the configured frontend origin may call this service from a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


# Same error shape as node-service: { "success": false, "message": "..." }
@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        field = ".".join(str(part) for part in err["loc"] if part != "body")
        messages.append(f"{field}: {err['msg']}" if field else err["msg"])
    return JSONResponse(status_code=400, content={"success": False, "message": "; ".join(messages)})


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    logger.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error"})


app.include_router(health.router)
app.include_router(records.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.port, reload=True)
