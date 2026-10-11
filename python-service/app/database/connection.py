"""PostgreSQL access for python-service.

The database is shared with node-service, but each table has ONE owner:
  users   -> node-service   (python-service only references users.id via a foreign key)
  records -> python-service (node-service never reads or writes it)
"""
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS records (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    age         INTEGER      NOT NULL CHECK (age BETWEEN 18 AND 100),
    department  VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS records_user_id_idx ON records (user_id);
"""


ADD_FK_SQL = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'records'::regclass AND contype = 'f'
    ) THEN
        ALTER TABLE records ADD CONSTRAINT records_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
"""


@contextmanager
def get_connection():
    # One short-lived connection per request keeps things simple and explainable.
    with psycopg.connect(settings.database_url, row_factory=dict_row, connect_timeout=5) as conn:
        yield conn


def init_schema() -> None:
    """Create the records table on startup (python-service owns it)."""
    with get_connection() as conn:
        users_table = conn.execute("SELECT to_regclass('users') AS t").fetchone()["t"]
        if users_table is None:
            raise RuntimeError(
                'Table "users" not found. Start node-service first (it creates users), '
                "then restart python-service."
            )
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
        conn.execute(ADD_FK_SQL)


def ping() -> bool:
    with get_connection() as conn:
        conn.execute("SELECT 1")
    return True
