#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   CLIENT_DOMAIN=abc.theanswer.ai bash copilot/scripts/copilot-switch-app.sh
#   CLIENT_DOMAIN=staging.abc.theanswer.ai bash copilot/scripts/copilot-switch-app.sh
#   or: bash copilot/scripts/copilot-switch-app.sh abc.theanswer.ai

ARG_DOMAIN="${1:-}"
RESOLVED_DOMAIN="${ARG_DOMAIN:-${CLIENT_DOMAIN:-}}"

# Check for and fail on HTTP/HTTPS protocols
if [[ "${RESOLVED_DOMAIN}" =~ ^https?:// ]]; then
  echo "ERROR: HTTP/HTTPS protocol detected in domain!" >&2
  echo "Please fix your CLIENT_DOMAIN variable - no protocols should be present." >&2
  echo "Expected format: staging.client.theanswer.ai or client.theanswer.ai" >&2
  echo "Found: ${RESOLVED_DOMAIN}" >&2
  echo "" >&2
  echo "Please update your environment variable to remove the protocol:" >&2
  echo "  CLIENT_DOMAIN=client.theanswer.ai" >&2
  echo "  OR" >&2
  echo "  CLIENT_DOMAIN=staging.client.theanswer.ai" >&2
  echo "" >&2
  exit 1
fi

# Default to "aai" if no domain provided
if [[ -z "${RESOLVED_DOMAIN}" ]]; then
  echo "WARNING: No domain provided, defaulting to 'aai' for the application name." >&2
  echo "This should typically be set to your client's domain (e.g., abc.theanswer.ai)" >&2
  echo "" >&2
  echo "For proper usage:" >&2
  echo "  CLIENT_DOMAIN=abc.theanswer.ai bash $0" >&2
  echo "  CLIENT_DOMAIN=staging.abc.theanswer.ai bash $0" >&2
  echo "  bash $0 abc.theanswer.ai" >&2
  echo "" >&2
  echo "Note: This script can be used manually or called by the auto-deploy script." >&2
  echo "For complete automated deployment, use: pnpm copilot:auto" >&2
  echo "" >&2
  RESOLVED_DOMAIN="aai"
fi

# Handle special cases where domain is already "aai" or "aai.theanswer.ai"
if [[ "${RESOLVED_DOMAIN}" == "aai" || "${RESOLVED_DOMAIN}" == "aai.theanswer.ai" ]]; then
  APP_NAME="aai"
else
  # Strip .theanswer.ai suffix, replace periods with hyphens
  # This preserves all parts of the domain including staging prefixes
  # Also ensure the app name doesn't start with a dash
  PROCESSED_DOMAIN=$(echo "${RESOLVED_DOMAIN}" | sed 's/\.theanswer\.ai$//' | sed 's/\./-/g')
  
  # Remove leading dashes if any
  PROCESSED_DOMAIN=$(echo "${PROCESSED_DOMAIN}" | sed 's/^-*//')
  
  # If the processed domain is empty after removing dashes, use "aai"
  if [[ -z "${PROCESSED_DOMAIN}" ]]; then
    APP_NAME="aai"
  else
    # Check if the processed domain already ends with -aai to avoid duplication
    if [[ "${PROCESSED_DOMAIN}" == *"-aai" ]]; then
      APP_NAME="${PROCESSED_DOMAIN}"
    else
      APP_NAME="${PROCESSED_DOMAIN}-aai"
    fi
  fi
fi

TARGET_DIR="copilot"
TARGET_FILE="${TARGET_DIR}/.workspace"

mkdir -p "${TARGET_DIR}"

printf "application: %s\n" "${APP_NAME}" > "${TARGET_FILE}"

echo "Wrote ${TARGET_FILE} with application: ${APP_NAME}"

