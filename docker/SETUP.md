# Flowise — Docker Setup Guide

Local deployment of [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise) using Docker Compose with SQLite storage.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- `openssl` available in your shell (for generating secrets)

## 1. Clone and enter the docker directory

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise/docker
```

## 2. Create and configure the `.env` file

```bash
cp .env.example .env
```

The `.env.example` ships with safe defaults pre-filled for a local Docker deployment. The only values you **must** replace are the four secret tokens — generate them with:

```bash
openssl rand -hex 32   # run once per secret
```

Fill in these four variables in `.env`:

| Variable | Purpose |
|---|---|
| `JWT_AUTH_TOKEN_SECRET` | Signs access tokens |
| `JWT_REFRESH_TOKEN_SECRET` | Signs refresh tokens |
| `EXPRESS_SESSION_SECRET` | Secures session cookies |
| `TOKEN_HASH_SECRET` | Hashes stored API tokens |

All path variables (`DATABASE_PATH`, `LOG_PATH`, etc.) are pre-set to `/root/.flowise`, which maps to `~/.flowise` on the host via the volume defined in `docker-compose.yml`:

```yaml
volumes:
  - ~/.flowise:/root/.flowise
```

### Root cause of startup failures

Flowise will crash-loop with `ENOENT: no such file or directory, mkdir ''` if any path variable is passed as an empty string. The pre-filled values in `.env.example` prevent this.

### Optional: use PostgreSQL instead of SQLite

Uncomment and fill in the `DATABASE_*` block, then set:

```env
DATABASE_TYPE=postgres
DATABASE_HOST=host.docker.internal  # reach the host from inside the container
DATABASE_PORT=5432
DATABASE_NAME=flowise
DATABASE_USER=<your-pg-user>
DATABASE_PASSWORD=<your-pg-password>
```

## 3. Start the container

```bash
docker compose up -d
```

Verify it started cleanly:

```bash
docker compose logs --tail=30
# Should end with: "Flowise Server is listening at :3000"

curl http://localhost:3000/api/v1/ping
# → pong
```

## 4. Create the first admin account

On a fresh install the database is empty. Register via the API (the `/register` endpoint is public on the first run):

```bash
curl -X POST http://localhost:3000/api/v1/account/register \
  -H 'Content-Type: application/json' \
  -d '{
    "user": {"name": "Admin", "email": "you@example.com", "credential": "YourPassword1!"},
    "organization": {},
    "workspace": {}
  }'
```

Then open **http://localhost:3000** and log in with those credentials.

> Registration is only accepted once. Subsequent calls return `400 You can only have one organization`.

## 5. Stop / restart

```bash
docker compose down          # stop (data persisted in ~/.flowise)
docker compose up -d         # restart

# Pick up .env changes without rebuilding the image:
docker compose up -d --force-recreate
```

## 6. Build a real LLM flow (quick start)

1. Open **http://localhost:3000** → **Chatflows** → **+ Add New**
2. Choose a template (e.g. *Conversation Chain*) or drag nodes manually
3. Add a **ChatOpenAI** node → click the key icon → add your OpenAI API key as a credential
4. Connect **ChatOpenAI** → **Conversation Chain** → **Save**
5. Click the chat bubble (bottom-right) and send a message

## Data persistence

All application data lives in `~/.flowise` on the host:

```
~/.flowise/
├── database.sqlite       # chatflows, credentials, API keys, users
├── encryption.key        # key used to encrypt stored credentials
├── logs/                 # server and audit logs
└── storage/              # uploaded files and blob storage
```

Back up this directory to preserve your data across host migrations.

## Environment variables reference

See `.env.example` for the full list with inline comments.
The table below covers the variables that differ from Flowise upstream defaults:

| Variable | Set to | Why |
|---|---|---|
| `DATABASE_PATH` | `/root/.flowise` | Must match the container-side volume path |
| `SECRETKEY_PATH` | `/root/.flowise` | Must match the container-side volume path |
| `LOG_PATH` | `/root/.flowise/logs` | Must match the container-side volume path |
| `BLOB_STORAGE_PATH` | `/root/.flowise/storage` | Must match the container-side volume path |
| `SECRETKEY_STORAGE_TYPE` | `local` | Use local filesystem (not AWS Secrets Manager) |
| `STORAGE_TYPE` | `local` | Use local filesystem (not S3/GCS/Azure) |
| `LOG_LEVEL` | `info` | Reasonable verbosity for development |
| `DISABLE_FLOWISE_TELEMETRY` | `true` | Opt out of usage analytics |
| `APP_URL` | `http://localhost:3000` | Required for auth redirects and email links |
