#!/bin/sh
# Flowise Skill Sandbox — PID 1.
#
# We never `docker run` a real command. The Node-side `DockerBackend`
# calls `docker exec` for each LLM-issued bash invocation. This script
# exists solely to keep the container's namespace alive between execs.
exec sleep infinity
