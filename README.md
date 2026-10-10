# RecordHub — Microservices Interview Application

A small full-stack app built to explain microservices end to end. A user registers, logs in, saves form records and sees their own records.

| Part | Tech | Port | Owns |
|---|---|---|---|
| Frontend | React 19, Vite, Material UI 9, React Router, Axios | 5173 | – |
| **node-service** (Identity) | Node.js, Express 5, Sequelize, bcrypt, JWT, ioredis | 5000 | `users` table |
| **python-service** (Records) | Python 3.13, FastAPI, psycopg 3, PyJWT, Pydantic | 8000 | `records` table |
| Database (shared) | PostgreSQL 16 | 5432 | – |
| Rate-limit store | Redis | 6379 | – |

Everything runs **directly on the development machine. There is no Docker.**

---

## 1. Architecture

```text
                       React + Material UI  :5173
                 ┌────────────────┴─────────────────┐
     nodeApi (VITE_NODE_API_URL)        pythonApi (VITE_PYTHON_API_URL)
      register / login                   save record / fetch records
                 │                                  │  Authorization: Bearer <JWT>
                 ↓                                  ↓
       node-service :5000                 python-service :8000
       Identity Service                   Records Service
       issues the JWT ───── same JWT_SECRET ────→ verifies the JWT
          │        │                                │
          │        └── Redis :6379 (login rate limit)
          ↓                                         ↓
    ┌─────────────────────── PostgreSQL :5432 ─────────────────────┐
    │   users   (owner: node-service)  │ records (owner: python)   │
    └───────────────────────────────────────────────────────────────┘
```

### Each service owns one business area

* **node-service (Identity)** answers *"who is this user?"* It handles register and login, hashes passwords, rate-limits logins and issues JWTs.
* **python-service (Records)** answers *"what data does this user have?"* It saves and fetches form records, and only for the user named in the token.
* **The JWT is the only contract between them.** Python never calls Node and never reads the `users` table. The `userId` inside the verified token is all it needs.

### One shared database, with table ownership

The project uses **one PostgreSQL database**, but every table has exactly **one owner service**:

| Table | Owner (creates and writes it) | Other service |
|---|---|---|
| `users` | node-service (Sequelize) | never touches it |
| `records` | python-service (psycopg) | never touches it |

This is the **"shared database, table-per-service ownership"** pattern. The services stay independent in code and only share the database server. That means the database can be split later, for example by moving `records` to its own database, by changing only `python-service/.env`.

There is deliberately **no foreign key** from `records.user_id` to `users.id`. A foreign key across service boundaries would couple their schemas and force a startup order. Ownership is guaranteed by the verified JWT instead.

### Monorepo ≠ Monolith

A **monorepo** means one Git repository that holds several projects:

```text
One Git repository
    ├── node-service
    ├── python-service
    └── frontend
```

A **monolith** means one backend application that does everything:

```text
One backend application
    ├── Auth
    ├── Users
    └── Records
```

This project is **a monorepo containing independently running microservices**:

| | node-service | python-service |
|---|---|---|
| Entry point | `src/server.js` | `app/main.py` |
| Port | 5000 | 8000 |
| Dependencies | `package.json` | `requirements.txt` |
| Config | `node-service/.env` | `python-service/.env` |
| Responsibility | identity (users, login) | records (save, fetch) |
| Table | `users` | `records` |
| Start command | `npm run dev` | `uvicorn app.main:app --port 8000` |

Each service starts, stops and deploys on its own:

* If **Python** is down, register and login still work; only saving and fetching records fail.
* If **Node** is down, a user who is already logged in can still save and fetch records until their token expires, because Python verifies the token itself.

---

## 2. Folder structure

```text
Microservice/
├── README.md
├── .gitignore                    # ignores every .env, node_modules, .venv
├── scripts/
│   └── smoke-test.mjs            # cross-service check against the running services
│
├── node-service/                 # IDENTITY SERVICE
│   ├── .env.example
│   ├── package.json
│   ├── tests/api.test.js         # node:test + supertest (real PostgreSQL + Redis)
│   └── src/
│       ├── server.js             # entry point: connect DB, create users table, listen
│       ├── app.js                # express app: cors, json, routes, errors, /health
│       ├── config/               # env.js, database.js (Sequelize), redis.js (ioredis)
│       ├── models/               # User.js, index.js
│       ├── routes/authRoutes.js
│       ├── middleware/           # authMiddleware, rateLimitMiddleware, errorMiddleware, validate
│       ├── validators/           # authValidators.js (Joi)
│       ├── controllers/          # authController.js — HTTP in/out only
│       ├── services/             # authService.js — bcrypt, JWT, business rules
│       └── utils/                # ApiError, jwt helpers
│
├── python-service/               # RECORDS SERVICE
│   ├── .env.example
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── tests/test_records.py     # pytest + FastAPI TestClient (real PostgreSQL)
│   └── app/
│       ├── main.py               # entry point: FastAPI app, creates records table, CORS, errors
│       ├── config.py             # env settings
│       ├── schemas.py            # Pydantic request validation
│       ├── routes/               # records.py (POST/GET /api/records), health.py
│       ├── middleware/auth.py    # JWT verification dependency
│       ├── services/record_service.py
│       └── database/connection.py
│
└── frontend/
    ├── .env.example
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, theme.js
        ├── pages/                # Login.jsx, Dashboard.jsx (the only two pages)
        ├── services/             # nodeApi.js, pythonApi.js, interceptors.js, authApi.js, recordApi.js
        ├── context/              # AuthContext.jsx, NotificationContext.jsx
        ├── routes/               # ProtectedRoute.jsx
        ├── hooks/                # useAuth, useNotify
        ├── components/           # RecordForm, EmptyState
        └── utils/                # authStorage, errors, validation
```

---

## 3. Database schema

```text
users   (created by node-service / Sequelize)     records (created by python-service on startup)
──────────────────────────────────────────        ─────────────────────────────────────────────
id          SERIAL PK                             id           SERIAL PK
name        VARCHAR(100) NOT NULL                 user_id      INTEGER NOT NULL  (indexed; from JWT)
email       VARCHAR(255) UNIQUE NOT NULL          name         VARCHAR(100) NOT NULL
password    VARCHAR(255) NOT NULL (bcrypt hash)   email        VARCHAR(255) NOT NULL
createdAt   TIMESTAMPTZ                           age          INTEGER NOT NULL CHECK (18–100)
updatedAt   TIMESTAMPTZ                           department   VARCHAR(100) NOT NULL
                                                  description  TEXT NOT NULL DEFAULT ''
                                                  created_at   TIMESTAMPTZ DEFAULT now()
```

Each table follows the naming style of the service that owns it: camelCase from Sequelize, snake_case in Python.

---

## 4. API list

All responses use one shape: success `{ "success": true, "data": ... }`, error `{ "success": false, "message": "..." }`.

### node-service — `http://localhost:5000`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Checks PostgreSQL + Redis |
| POST | `/api/auth/register` | – | `{ name, email, password }` → 201 + token |
| POST | `/api/auth/login` | – (rate limited) | `{ email, password }` → `{ success, message, token, data.user }` |

### python-service — `http://localhost:8000`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Checks PostgreSQL |
| POST | `/api/records` | JWT | Save a record: `{ name, email, age, department, description? }` → 201 |
| GET | `/api/records` | JWT | Fetch **your own** records, newest first |
| GET | `/docs` | – | FastAPI's built-in Swagger UI |

Status codes: `400` bad input · `401` missing, invalid or expired token · `404` unknown route · `409` email already registered · `429` too many logins · `500` server error.

### Logout

**Logout has no API call.** A JWT is stateless: the server keeps no session, so logging out means the frontend deletes the token from `localStorage` and redirects to `/login`. See Known limitations for how to revoke tokens on the server.

---

## 5. Request flows

### Register / Login → Node

```text
Login page ─POST /api/auth/login─→ node-service
                                     ├─ rateLimitMiddleware (Redis)        → 429 if over limit
                                     ├─ Joi validation                     → 400
                                     ├─ User.findOne({ where: { email } })  (PostgreSQL: users)
                                     ├─ bcrypt.compare(password, hash)     → 401 if wrong
                                     └─ jwt.sign({ userId, email }, JWT_SECRET, HS256, 4h)
React ←── { token } ─────────────────┘   saved in localStorage
```

### Save / Fetch records → Python

```text
Dashboard ─POST /api/records + Bearer JWT─→ python-service
                                              ├─ get_current_user: verify signature + exp (same secret)
                                              ├─ Pydantic validation                → 400
                                              └─ INSERT INTO records (user_id = token.userId, ...)
Dashboard ─GET  /api/records + Bearer JWT─→   SELECT ... WHERE user_id = token.userId
```

### How the frontend picks a service

Two Axios clients read their base URL from `frontend/.env`. Each API file imports the client for the service that owns that feature:

| File | Client | Service |
|---|---|---|
| `services/authApi.js` | `nodeApi` | Identity, `:5000` |
| `services/recordApi.js` | `pythonApi` | Records, `:8000` |

`services/interceptors.js` adds `Authorization: Bearer <JWT>` to **both** clients. On any 401 it clears the token, and `AuthContext` sends the user back to `/login`.

To deploy, change only `frontend/.env`:

```env
VITE_NODE_API_URL=https://identity.example.com
VITE_PYTHON_API_URL=https://records.example.com
```

---

## 6. Security

| Concern | Mechanism |
|---|---|
| Authentication | JWT (HS256, 4h expiry) issued by Node and verified independently by Node and Python |
| Password storage | bcrypt hashes (10 rounds). The hash is never returned by the API |
| Authorization | Python sets `user_id` from the token, never from the request body. Fetch is filtered by `user_id` |
| Brute force | Redis login rate limit (5 per minute per IP) |
| Input validation | Joi (Node) and Pydantic (Python) in the backend. The browser also checks input so users get errors immediately |
| SQL injection | Sequelize parameter binding and psycopg `%s` parameters |
| CORS | Both APIs allow only `CORS_ORIGIN` (`http://localhost:5173`) |
| Secrets | `.env` files are git-ignored. Only `.env.example` is committed |
| User enumeration | Unknown email and wrong password return the same 401 and take the same time |
| Transport | HTTP is fine locally. **Production must use HTTPS** |

### Redis rate limiting

> **Redis is an in-memory data store** used for caching, rate limiting, sessions, queues and other fast, short-lived data. **It is not an authentication system.**
> JWT handles authentication. bcrypt protects passwords. Redis counts login and register attempts.

`node-service/src/middleware/rateLimitMiddleware.js` runs before every login and register (separate counter for each):

```text
key = rate_limit:<route>:<IP>      e.g. rate_limit:/login:127.0.0.1
attempts = INCR key
if attempts == 1:  EXPIRE key 60      ← the counter deletes itself after the window
if attempts > 5:   429 Too Many Requests + Retry-After: <seconds left>
```

Node connects to Redis using only `.env` values:

```js
new Redis({ host: env.redisHost, port: env.redisPort }); // REDIS_HOST / REDIS_PORT
```

To use another port, set `REDIS_PORT=6380` in `node-service/.env`. No code change is needed.

---

## 7. Running the project (Windows, no Docker)

### Prerequisites (one-time)

| Tool | Install |
|---|---|
| Node.js ≥ 20 | https://nodejs.org |
| Python ≥ 3.11 | https://python.org or Microsoft Store |
| PostgreSQL 16 | `winget install PostgreSQL.PostgreSQL.16` |
| Redis | `winget install Redis.Redis` |

Both PostgreSQL and Redis install as Windows services that start automatically. Check them:

```powershell
Get-Service Redis, postgresql-x64-16                      # both should be Running
& "C:\Program Files\Redis\redis-cli.exe" ping             # → PONG
```

Create the database once:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE interview_app;"
```

### Environment files

```bash
cp node-service/.env.example   node-service/.env
cp python-service/.env.example python-service/.env
cp frontend/.env.example       frontend/.env
```

Set **the same long random `JWT_SECRET`** in `node-service/.env` and `python-service/.env`. You can generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Update `DATABASE_URL` if your postgres password is different.

### Start each service in its own terminal

```powershell
# Terminal 1 — Identity service → http://localhost:5000
cd node-service
npm install
npm run dev
```

```powershell
# Terminal 2 — Records service → http://localhost:8000
cd python-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```powershell
# Terminal 3 — Frontend → http://localhost:5173
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**, click **Register**, create an account, fill the form and press **Save**. The record appears in the list below the form.

### Tests

```powershell
cd node-service;   npm test                 # register, login, JWT, Redis rate limit
cd python-service; .venv\Scripts\pytest -v  # JWT checks, save, fetch, ownership, validation
node scripts/smoke-test.mjs                 # all services running: Node token works on Python
```

---

## 8. Interview Q&A

**Why microservices?**
Identity and records are different business areas that change for different reasons. Splitting them lets each run, scale and deploy on its own, and a failure in one doesn't take down the other.

**Why is Node the identity service?**
Auth is security-critical and changes rarely. Keeping it small and isolated reduces risk, and Express, bcrypt, JWT and Redis are a mature stack for it.

**Why is Python the records service?**
Records are the product data that evolves most. Python suits data-heavy features that might be added later, such as reporting, imports or analytics, and they can be added without touching auth.

**How can it be microservices with one shared database?**
Each table has a single owner service, and no service reads or writes another service's table. The services share only the database server, not their data, so splitting into separate databases later is just a config change.

**How do the services communicate?**
Only through the JWT. Node signs it, and Python verifies it with the same secret and a pinned algorithm. Python never calls Node, so there is no runtime coupling between them.

**Why no foreign key from records to users?**
A foreign key across a service boundary couples the schemas and forces a startup order. Ownership is enforced by the verified token. The trade-off is that deleting a user would need an event to clean up their records; see Known limitations.

**How does logout work?**
The JWT is stateless, so the frontend deletes it. For instant server-side revocation, I would add a Redis blocklist of token IDs that both services check.

**Why the same repository?**
A monorepo makes development, review and versioning easier: one clone, and one PR can span services. The repository layout doesn't decide whether something is a microservice; runtime independence does.

**How does the frontend choose a service?**
`nodeApi` and `pythonApi` read their base URLs from environment variables, and each feature's API file imports the client for the service that owns it.

**Why Redis?**
For fast, auto-expiring counters used in login rate limiting. It is not used for authentication.

**Why Sequelize and psycopg?**
Sequelize is the ORM for Node's `users` model. Python's needs are two simple queries, so plain parameterized SQL with psycopg is clearer than adding an ORM.

---

## 9. Known limitations (deliberately kept simple)

* **Shared database server.** The ownership rules prevent coupling through the data, but both services still depend on one PostgreSQL instance. Production could give each service its own database.
* **Orphaned records.** No foreign key and no user-deletion feature exist. If user deletion is added, Node should publish a "user deleted" event that Python handles.
* **Schema creation on startup.** Sequelize `sync()` and Python's `CREATE TABLE IF NOT EXISTS` are used. Production needs versioned migrations.
* **Shared HS256 secret.** Any service that can verify tokens could also forge them. RS256 (Node signs with a private key, Python verifies with the public key) removes that risk.
* **Token handling.** The JWT is stored in `localStorage`, where XSS could read it; an httpOnly cookie is safer. There are no refresh tokens and no server-side revocation, so a token stays valid until it expires (4h).
* **Rate limiter fails open.** If Redis is down, logins are allowed and the problem is logged, so an outage doesn't lock everyone out.
* **Per-IP fixed window.** Users behind one NAT share a limit. Behind a reverse proxy, `app.set('trust proxy', …)` is needed.
* **Windows Redis build.** `winget install Redis.Redis` ships Redis 3.0, an old but working port. The app uses only `INCR`, `EXPIRE` and `TTL`, so any version works.
* **No pagination** on the records list. **No edit or delete** of records, by design for this scope.
* **Python opens a new database connection per request.** It is simple; a connection pool is the production choice.
