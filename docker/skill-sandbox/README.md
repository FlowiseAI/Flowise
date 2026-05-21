# Flowise Skill Sandbox — base image

This image is the runtime the `DockerBackend` spawns one container from
per Skill node. Every LLM-issued bash invocation runs inside a fresh,
sealed container so the host filesystem is never modified.

## What's in the image

-   Debian 12 (bookworm) slim base.
-   Python 3.11 (Debian default; build-time pinned).
-   Node 20 (via NodeSource).
-   POSIX coreutils + bash, jq, ripgrep, poppler (pdftotext, pdfgrep),
    unzip, tree, file, less.
-   Non-root user `user` (uid 1000, gid 1000), home `/home/user`.

## Build

```sh
./scripts/build-skill-sandbox.sh
```

Or directly:

```sh
docker build --tag flowise-skill-sandbox:dev docker/skill-sandbox/
```

The Dockerfile is architecture-agnostic — your local Docker builds
a native image for your host (arm64 on M-series Macs, amd64 on x86).

## How the runtime uses it

`DockerBackend.initialize()` creates one container with these defaults:

| Constraint          | Default                     | Env override                   |
| ------------------- | --------------------------- | ------------------------------ |
| Memory              | 512 MiB                     | `SKILL_DOCKER_MEMORY_MB`       |
| CPU                 | 1.0                         | `SKILL_DOCKER_CPUS`            |
| PID limit           | 128                         | `SKILL_DOCKER_PIDS_LIMIT`      |
| Network             | `none`                      | `SKILL_DOCKER_NETWORK`         |
| Image               | `flowise-skill-sandbox:dev` | `SKILL_DOCKER_IMAGE`           |
| Lifetime ceiling    | 15 min                      | `SKILL_V2_SANDBOX_LIFETIME_MS` |
| Idle reaper         | 5 min                       | `SKILL_V2_SANDBOX_IDLE_MS`     |
| Per-command timeout | 15s                         | `SKILL_EXEC_TIMEOUT_MS`        |

Hardening that is **not** configurable:

-   `ReadonlyRootfs: true` everywhere except the anonymous volume mounted
    at `/home/user`.
-   `CapDrop: ['ALL']`, `no-new-privileges:true`, default seccomp profile.
-   `User: '1000:1000'`. Skill code runs as a non-root user.
-   `Env: []`. No host environment variables are forwarded into the
    container; skills materialise their inputs via `uploadFiles`.

The container's PID 1 is `sleep infinity` — every shell command goes
through `docker exec`, never `docker run`.
