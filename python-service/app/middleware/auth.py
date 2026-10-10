"""JWT verification for python-service.

Python never issues tokens. It trusts tokens signed by node-service because both
services share JWT_SECRET and JWT_ALGORITHM (HS256).
"""
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException, status

from app.config import settings


@dataclass
class CurrentUser:
    id: int
    email: str | None


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """FastAPI dependency: add `user = Depends(get_current_user)` to protect a route."""
    if not authorization:
        raise _unauthorized("Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme != "Bearer" or not token:
        raise _unauthorized("Authorization header must be: Bearer <token>")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],  # pin the algorithm
            options={"require": ["exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token expired")
    except jwt.InvalidTokenError:
        raise _unauthorized("Invalid token")

    user_id = payload.get("userId")
    if not isinstance(user_id, int):
        raise _unauthorized("Invalid token payload")

    return CurrentUser(id=user_id, email=payload.get("email"))
