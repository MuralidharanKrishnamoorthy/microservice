"""Integration tests for python-service against the real shared PostgreSQL.

Tokens are signed here with the same JWT_SECRET node-service uses, so these
tests don't need node-service running.  Run:  pytest -v
"""
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.database.connection import get_connection, init_schema
from app.main import app

# Fake user ids far away from real ones; rows are cleaned up afterwards.
USER_A = 900_000_000 + int(time.time()) % 1_000_000
USER_B = USER_A + 1

RECORD = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "age": 29,
    "department": "Engineering",
    "description": "Backend developer",
}


def make_token(user_id: int, expires_in: int = 3600, secret: str | None = None) -> str:
    payload = {"userId": user_id, "email": f"u{user_id}@example.com", "exp": int(time.time()) + expires_in}
    return jwt.encode(payload, secret or settings.jwt_secret, algorithm=settings.jwt_algorithm)


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def client():
    init_schema()
    yield TestClient(app)
    with get_connection() as conn:
        conn.execute("DELETE FROM records WHERE user_id IN (%s, %s)", (USER_A, USER_B))


# ---------- health ----------

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["data"]["database"] == "up"


# ---------- JWT checks ----------

def test_missing_token_401(client):
    res = client.get("/api/records")
    assert res.status_code == 401
    assert res.json() == {"success": False, "message": "Missing Authorization header"}


def test_non_bearer_401(client):
    assert client.get("/api/records", headers={"Authorization": "Basic abc"}).status_code == 401


def test_invalid_signature_401(client):
    bad = make_token(USER_A, secret="wrong-secret-wrong-secret-wrong-secret")
    res = client.get("/api/records", headers=auth(bad))
    assert res.status_code == 401
    assert res.json()["message"] == "Invalid token"


def test_expired_token_401(client):
    res = client.get("/api/records", headers=auth(make_token(USER_A, expires_in=-60)))
    assert res.status_code == 401
    assert res.json()["message"] == "Token expired"


def test_unsigned_alg_none_token_401(client):
    unsigned = jwt.encode({"userId": USER_A, "exp": int(time.time()) + 60}, None, algorithm="none")
    assert client.get("/api/records", headers=auth(unsigned)).status_code == 401


def test_missing_token_on_create_401(client):
    assert client.post("/api/records", json=RECORD).status_code == 401


# ---------- create + fetch ----------

def test_create_record_201(client):
    res = client.post("/api/records", json=RECORD, headers=auth(make_token(USER_A)))
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    assert body["data"]["userId"] == USER_A
    assert body["data"]["name"] == "Jane Doe"
    assert "createdAt" in body["data"]


def test_client_supplied_user_id_is_ignored(client):
    res = client.post("/api/records", json={**RECORD, "userId": USER_B}, headers=auth(make_token(USER_A)))
    assert res.status_code == 201
    assert res.json()["data"]["userId"] == USER_A


def test_whitespace_is_trimmed(client):
    res = client.post("/api/records", json={**RECORD, "name": "  Ravi  "}, headers=auth(make_token(USER_A)))
    assert res.json()["data"]["name"] == "Ravi"


def test_list_returns_own_records_newest_first(client):
    res = client.get("/api/records", headers=auth(make_token(USER_A)))
    assert res.status_code == 200
    names = [r["name"] for r in res.json()["data"]]
    assert names == ["Ravi", "Jane Doe", "Jane Doe"]


def test_other_user_cannot_see_records(client):
    res = client.get("/api/records", headers=auth(make_token(USER_B)))
    assert res.status_code == 200
    assert res.json()["data"] == []


# ---------- validation ----------

@pytest.mark.parametrize(
    "override",
    [
        {"name": "A"},
        {"email": "not-an-email"},
        {"age": 10},
        {"age": "abc"},
        {"department": ""},
        {"description": "x" * 1001},
    ],
)
def test_invalid_body_400(client, override):
    res = client.post("/api/records", json={**RECORD, **override}, headers=auth(make_token(USER_A)))
    assert res.status_code == 400
    assert res.json()["success"] is False


def test_missing_fields_400(client):
    res = client.post("/api/records", json={}, headers=auth(make_token(USER_A)))
    assert res.status_code == 400
