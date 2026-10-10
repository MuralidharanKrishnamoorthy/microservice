"""Business logic for records. Every query is scoped to the user from the JWT."""
from app.database.connection import get_connection
from app.schemas import RecordCreate

# Aliases give the API camelCase keys, matching node-service's JSON style.
COLUMNS = """
    id, user_id AS "userId", name, email, age, department, description,
    created_at AS "createdAt"
"""


def create_record(user_id: int, data: RecordCreate) -> dict:
    # user_id comes from the verified token, never from the request body.
    # Parameterized query (%s) — user input is never formatted into SQL.
    sql = f"""
        INSERT INTO records (user_id, name, email, age, department, description)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING {COLUMNS}
    """
    with get_connection() as conn:
        return conn.execute(
            sql, (user_id, data.name, data.email, data.age, data.department, data.description)
        ).fetchone()


def list_records(user_id: int) -> list[dict]:
    sql = f"SELECT {COLUMNS} FROM records WHERE user_id = %s ORDER BY created_at DESC, id DESC"
    with get_connection() as conn:
        return conn.execute(sql, (user_id,)).fetchall()
