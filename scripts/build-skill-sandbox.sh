#!/usr/bin/env bash
#
# Build the Flowise Skill Sandbox base image.
#
# This is a one-time setup step for contributors and self-host operators
# who want to use the local `DockerBackend`. The image is never pulled
# from a registry — each machine builds its own native-arch copy from the
# Dockerfile in `docker/skill-sandbox/`.
#
# Expected runtime: 3-5 minutes on a warm apt cache, longer on first run.
#
# Override the tag by setting SKILL_DOCKER_IMAGE before running:
#
#   SKILL_DOCKER_IMAGE=my-skill-image:latest ./scripts/build-skill-sandbox.sh

set -euo pipefail

IMAGE_TAG="${SKILL_DOCKER_IMAGE:-flowise-skill-sandbox:dev}"

# Resolve the repo-root path independently of the caller's cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTEXT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)/docker/skill-sandbox"

if [ ! -f "${CONTEXT_DIR}/Dockerfile" ]; then
    echo "ERROR: Dockerfile not found at ${CONTEXT_DIR}/Dockerfile" >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: 'docker' was not found on PATH." >&2
    echo "Install Docker Desktop (macOS/Windows) or docker.io (Linux) and retry." >&2
    exit 1
fi

echo "Building ${IMAGE_TAG} (3-5 minutes on first run)..."
echo "  context: ${CONTEXT_DIR}"
echo

docker build --tag "${IMAGE_TAG}" "${CONTEXT_DIR}"

echo
echo "Image built: ${IMAGE_TAG}"
if [ "${IMAGE_TAG}" != "flowise-skill-sandbox:dev" ]; then
    echo "Set SKILL_DOCKER_IMAGE=${IMAGE_TAG} in your .env so the runtime picks up this tag."
fi
