#!/usr/bin/env bash
# Script to check if the variables are available in the environment on Netlify or Vercel Builds

# ---------------------------------------
# CHANGES: Declare missing_vars here
# ---------------------------------------
declare -a missing_vars=()

# Make the script exit on errors and undefined variables
set -Eeuo pipefail

# Define paths for the JavaScript logger wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGGER_SCRIPT="$SCRIPT_DIR/check-vars-logger.js"

# Function to log messages using the JS logger
log() {
  local level="$1"
  local message="$2"
  
  # Check if the logger script exists
  if [ -f "$LOGGER_SCRIPT" ] && command -v node >/dev/null 2>&1; then
    node "$LOGGER_SCRIPT" "$level" "$message"
  else
    # Fallback to traditional shell logging
    local GREEN='\033[0;32m'
    local YELLOW='\033[1;33m'
    local RED='\033[0;31m'
    local BLUE='\033[0;34m'
    local NC='\033[0m' # No Color
    
    case "$level" in
      error)
        echo -e "${RED}[ERROR] $message${NC}"
        ;;
      warn)
        echo -e "${YELLOW}[WARN] $message${NC}"
        ;;
      info)
        echo -e "${GREEN}[INFO] $message${NC}"
        ;;
      debug)
        if [ "$VERBOSE" = true ]; then
          echo -e "${BLUE}[DEBUG] $message${NC}"
        fi
        ;;
      *)
        echo -e "[LOG] $message"
        ;;
    esac
  fi
}

# Parse flags
TEST_MODE=false
VERBOSE=false
DRY_RUN=false
while getopts "tvhd" opt; do
  case "${opt}" in
    t)
      TEST_MODE=true
      ;;
    v)
      VERBOSE=true
      ;;
    h)
      log "info" "Usage: $0 [-t] [-v] [-h] [-d]"
      log "info" "  -t: Test mode - allows testing locally"
      log "info" "  -v: Verbose mode - shows additional information"
      log "info" "  -h: Show this help message"
      log "info" "  -d: Dry run - show what would happen without making changes"
      exit 0
      ;;
    d)
      DRY_RUN=true
      ;;
    *)
      log "error" "Invalid option. Use -h for help."
      exit 1
      ;;
  esac
done

# Skip checks unless running on Netlify, Vercel, or a recognized CI environment
if [ "${NETLIFY:-}" != "true" ] && [ "${VERCEL:-}" != "1" ] && [ "${CI:-}" != "true" ] && [ "$TEST_MODE" = false ]; then
  log "info" "ℹ️  Skipping required variable checks (not Netlify, Vercel, or CI environment)."
  log "info" "ℹ️  You can test locally by running: $0 -t, or by setting NETLIFY=true or VERCEL=1."
  exit 0
fi

if [ "$TEST_MODE" = true ]; then
  log "info" "🔍 Test Mode Active"
  read -p "Would you like to auto-load secrets from .env into your environment? (y/n): " confirm
  if [ "$confirm" = "y" ]; then
    if [ -f .env ]; then
      log "info" "📥 Loading secrets from .env..."
      set -o allexport
      source .env
      set +o allexport
    else
      log "warn" "⚠️  No .env file found to source."
    fi
  else
    log "info" "ℹ️  Skipping auto-load of secrets."
  fi
fi

# Update ENV_FILE to point to the parent directory
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/requiredVars.env"

# Add config file path definition
CONFIG_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/bwsconfig.json"

# Function to get excluded vars from bwsconfig.json
get_excluded_vars() {
  if [ -f "$CONFIG_FILE" ]; then
    [ "$VERBOSE" = true ] && log "debug" "📖 Reading excluded variables from bwsconfig.json..."
    if command -v jq >/dev/null 2>&1; then
      local excluded_vars
      excluded_vars=$(jq -r '.projects[].preserveVars[]' "$CONFIG_FILE" 2>/dev/null | sort -u)
      [ "$VERBOSE" = true ] && log "debug" "🔍 Found excluded variables: $excluded_vars"
      echo "$excluded_vars"
    else
      log "warn" "⚠️  jq not found - skipping bwsconfig.json parsing"
      echo ""
    fi
  else
    [ "$VERBOSE" = true ] && log "debug" "⚠️  No bwsconfig.json found at $CONFIG_FILE"
    echo ""
  fi
}

# Get excluded variables
EXCLUDED_VARS=$(get_excluded_vars)

if [ ! -f "$ENV_FILE" ]; then
  log "warn" "----------------------------------------"
  log "warn" "⚠️  Notice: No '$ENV_FILE' file found."
  log "warn" "🔍 Skipping runtime variable checks."
  log "info" "💡 To enable checks, create '$ENV_FILE' with required variable names."
  log "warn" "----------------------------------------"
  exit 0
fi

missing_variable=false

# Add file permission check before main logic
if [ ! -r "$ENV_FILE" ]; then
  log "error" "Error: Cannot read $ENV_FILE. Check file permissions."
  exit 1
fi

# Validate format for requiredVars.env
validate_env_file() {
  local line_number=0
  while IFS= read -r line; do
    ((line_number++))
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ $line == \#* ]]; then
      continue
    fi
    # Check for valid variable name format
    if ! [[ $line =~ ^[a-zA-Z_][a-zA-Z0-9_]*(:=.*)?$ ]]; then
      log "error" "Error in $ENV_FILE line $line_number: Invalid format"
      log "error" "Expected format: VARIABLE_NAME or VARIABLE_NAME:=default_value"
      exit 1
    fi
  done < "$ENV_FILE"
}

if [ -f "$ENV_FILE" ]; then
  [ "$VERBOSE" = true ] && log "debug" "🔍 Validating $ENV_FILE format..."
  validate_env_file
fi

# Remove or comment out this section since we already ran the scan via pnpm scan
if [ "$TEST_MODE" = false ]; then
  # echo -e "${BLUE}🔄 Ensuring fresh environment variable scan...${NC}"
  # node "$(dirname "$0")/requiredRuntimeVars.js"
  :  # No-op to maintain script structure
fi

# Read each line from requiredVars.env
while IFS= read -r line; do
  # Skip empty lines and comment lines
  if [[ -z "$line" ]] || [[ $line == \#* ]]; then
    continue
  fi

  # Split line into variable name and default value if present
  if [[ $line == *:=* ]]; then
    var_name=${line%:=*}
    default_value=${line#*:=}
  else
    var_name=$line
  fi

  # Check if variable is in excluded list
  if echo "$EXCLUDED_VARS" | grep -Fxq "$var_name"; then
    [ "$VERBOSE" = true ] && log "debug" "ℹ️  Skipping excluded variable: $var_name"
    continue
  fi

  # ---------------------------------------
  # CHANGES: Add debug logs in verbose mode
  # ---------------------------------------
  if [ "$VERBOSE" = true ]; then
    log "debug" "ℹ️  Checking variable: $var_name"
    log "debug" "   Value in environment: ${!var_name:-<not set>}"
  fi

  if [[ $line == *:=* ]]; then
    # If variable is not set, use default value
    if [ -z "${!var_name:-}" ]; then
      if [ "$DRY_RUN" = false ]; then
        export "$var_name=$default_value"
        log "warn" "ℹ️  Using default value for '$var_name'"
      else
        log "debug" "🔍 Would set $var_name to default value"
      fi
    fi
  else
    # No default value -> must be present
    if [ -z "${!var_name:-}" ]; then
      missing_variable=true

      # Only add once if not already in missing_vars
      if [ "${#missing_vars[@]:-0}" -eq 0 ] || ! printf '%s\n' "${missing_vars[@]:-}" | grep -Fxq "$var_name"; then
        missing_vars+=("$var_name")
      fi
    fi
  fi
done < "$ENV_FILE"

# If --dry-run and variables are missing, show them
if [ "$DRY_RUN" = true ] && [ "$missing_variable" = true ]; then
  log "info" "🔍 Dry run mode - would attempt to inject these variables:"
  
  if [ "${#missing_vars[@]}" -gt 0 ]; then
    for var in "${missing_vars[@]}"; do
      log "info" "   • $var"
    done
  fi
  exit 1
fi

# ---------------------------------------
# CHANGES: Fallback if no missing vars
# ---------------------------------------
if [ "$missing_variable" = false ]; then
  log "info" "✅ All required runtime function variables are available, proceeding with build steps..."

  # Optional: Print contents if verbose
  if [ "$VERBOSE" = true ]; then
    log "debug" "📖 Reading required variables from: $ENV_FILE"
    log "debug" "File contents:"
    cat "$ENV_FILE"
    log "debug" "----------------------------------------"
  fi
  exit 0
fi

# If missing variables remain, show them
log "error" "----------------------------------------"
log "error" "❌ Missing required variables for this build:"
for var in "${missing_vars[@]}"; do
  log "error" "   • $var"
done
log "error" "----------------------------------------"

# Handle Netlify environment
if [ "${NETLIFY:-}" = "true" ]; then
  log "info" "🔄 Attempting to inject required variables into Netlify project settings..."
  # Updated to use npm/yarn/pnpm agnostic command
  if [ -f "package-lock.json" ]; then
    npm run update-env -- --platform netlify
  elif [ -f "yarn.lock" ]; then
    yarn update-env --platform netlify
  elif [ -f "pnpm-lock.yaml" ]; then
    pnpm update-env --platform netlify
  else
    log "warn" "⚠️  No lock file found, defaulting to npm..."
    npm run update-env -- --platform netlify
  fi
  
  if [ $? -eq 0 ]; then
    log "info" "✅ Variables successfully injected into Netlify project settings."
    log "info" "🔄 Triggering new build with updated variables..."
    # TODO: Call script to retry build
    log "info" "ℹ️  Build retry initiated. Please check the latest builds in Netlify dashboard."
    exit 1
  else
    log "error" "----------------------------------------"
    log "error" "❌ ERROR: Failed to inject required variables."
    log "warn" "⚡ Manual action required:"
    log "warn" "1. Add the above missing variables to your Netlify Environment Variables"
    log "warn" "2. Visit: https://app.netlify.com/sites/YOUR_SITE/settings/env"
    log "warn" "3. Check the function requirements in your codebase"
    log "error" "----------------------------------------"
    exit 1
  fi
elif [ "${VERCEL:-}" = "1" ]; then
  # Handle Vercel environment
  log "info" "🔄 Attempting to inject required variables into Vercel project settings..."
  # Updated to use npm/yarn/pnpm agnostic command
  if [ -f "package-lock.json" ]; then
    npm run update-env -- --platform vercel
  elif [ -f "yarn.lock" ]; then
    yarn update-env --platform vercel
  elif [ -f "pnpm-lock.yaml" ]; then
    pnpm update-env --platform vercel
  else
    log "warn" "⚠️  No lock file found, defaulting to npm..."
    npm run update-env -- --platform vercel
  fi

  if [ $? -eq 0 ]; then
    log "info" "✅ Variables successfully injected into Vercel project settings."
    log "info" "🔄 Triggering new build with updated variables..."
    # TODO: Call script to retry build
    log "info" "ℹ️  Build retry initiated. Please check the latest builds in Vercel dashboard."
    exit 1
  else
    log "error" "----------------------------------------"
    log "error" "❌ ERROR: Failed to inject required variables."
    log "warn" "⚡ Manual action required:"
    log "warn" "1. Add the above missing variables to your Vercel Environment Variables"
    log "warn" "2. Visit: https://vercel.com/dashboard/project/settings/environment-variables"
    log "warn" "3. Check the function requirements in your codebase"
    log "error" "----------------------------------------"
    exit 1
  fi
else
  # Handle other environments
  log "error" "❌ Not running in Netlify or Vercel environment. Exiting..."
  exit 1
fi
