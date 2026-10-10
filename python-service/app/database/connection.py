"""PostgreSQL access for python-service.

The database is shared with node-service, but each table has ONE owner:
  users   -> node-service   (python-service never reads or writes it)
  records -> python-service (node-service never reads or writes it)
"""
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import settings

# No foreign key to users: that table belongs to node-service, and a cross-service
# FK would force a startup order. Ownership comes from the verified JWT instead.
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS records (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    age         INTEGER      NOT NULL CHECK (age BETWEEN 18 AND 100),
    department  VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS records_user_id_idx ON records (user_id);
"""


@contextmanager
def get_connection():
    # One short-lived connection per request keeps things simple and explainable.
    with psycopg.connect(settings.database_url, row_factory=dict_row, connect_timeout=5) as conn:
        yield conn


def init_schema() -> None:
    """Create the records table on startup (python-service owns it)."""
    with get_connection() as conn:
        old_layout = conn.execute(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'records' AND column_name = 'userId'"
        ).fetchone()
        if old_layout:
            raise RuntimeError(
                'Found an old "records" table created by node-service. '
                "Drop it once (DROP TABLE records;) and restart python-service."
            )
        conn.execute(SCHEMA_SQL)


def ping() -> bool:
    with get_connection() as conn:
        conn.execute("SELECT 1")
    return True
