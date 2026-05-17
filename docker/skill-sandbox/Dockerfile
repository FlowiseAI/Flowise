# syntax=docker/dockerfile:1
#
# Flowise Skill Sandbox — base image for `DockerBackend`.
#
# Every Skill bash invocation runs inside a fresh, sealed container
# spawned from this image. The Dockerfile is arch-agnostic and works
# on both linux/amd64 and linux/arm64 — your local `docker build`
# produces a native-arch image without any buildx orchestration.
#
# Hardening notes:
#   - Non-root `user` (uid 1000, gid 1000) matching the E2B layout.
#   - Default WORKDIR is `/home/user`, matching the path layout Skill
#     code assumes.
#   - PID 1 is `sleep infinity`. We never `docker run` a real command;
#     `DockerBackend` calls `docker exec` for each LLM-issued shell
#     invocation. The container exists to provide a long-lived
#     namespace, nothing more.
#
# Target footprint: ~800 MB final, ~5 minutes warm-cache build.

FROM debian:12-slim

# Core toolchain — `BaseSandbox`'s shell snippets rely on POSIX
# coreutils + bash; everything else is for skill authors.
RUN apt-get update && apt-get install -y --no-install-recommends \
        bash coreutils findutils grep sed gawk \
        ca-certificates curl gnupg \
        python3 python3-pip python3-venv \
        jq ripgrep \
        poppler-utils pdfgrep \
        unzip xz-utils gzip bzip2 \
        file less tree \
    && rm -rf /var/lib/apt/lists/*

# Node 20 via NodeSource (Debian's default `nodejs` package is older
# than the floor Skill authors can rely on).
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version

# Sanity-check the Python version at build time so we fail loudly
# if Debian ever bumps the default past 3.11.
RUN python3 --version | grep -q '^Python 3\.11\.' \
    || (echo "ERROR: expected Python 3.11.x, got $(python3 --version)" && exit 1)

# Non-root user matching the path layout E2B and the Skill code use.
RUN groupadd -g 1000 user && useradd -m -u 1000 -g 1000 -s /bin/bash user

COPY entrypoint.sh /usr/local/bin/skill-entrypoint.sh
RUN chmod +x /usr/local/bin/skill-entrypoint.sh

USER user
WORKDIR /home/user
RUN mkdir -p /home/user/skills /home/user/output

ENTRYPOINT ["/usr/local/bin/skill-entrypoint.sh"]
