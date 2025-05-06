#!/bin/bash

# Update API Docs Workflow Script
# This script runs the complete workflow for updating API documentation

# Change to the docs directory
cd "$(dirname "$0")/.." || exit

# Display help message
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "Usage: ./devscripts/update-api-docs.sh [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help              Show this help message"
  echo "  -p, --port PORT         Specify localhost port (default: 4000)"
  echo "  -a, --auth METHOD       Specify authentication method (bearer or apikey)"
  echo "  -s, --skip-build        Skip building the documentation"
  echo "  -r, --serve             Serve the documentation after building"
  echo ""
  echo "Example:"
  echo "  ./devscripts/update-api-docs.sh --port 3000 --auth bearer --serve"
  exit 0
fi

# Default values
PORT="4000"
AUTH=""
SKIP_BUILD=false
SERVE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -a|--auth)
      AUTH="$2"
      shift 2
      ;;
    -s|--skip-build)
      SKIP_BUILD=true
      shift
      ;;
    -r|--serve)
      SERVE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Add localhost server
echo "Adding localhost server on port $PORT..."
node devscripts/add-localhost-server.js "$PORT"

# Set authentication method if specified
if [ -n "$AUTH" ]; then
  echo "Setting authentication method to $AUTH..."
  node devscripts/switch-auth-method.js "$AUTH"
fi

# Regenerate API docs
echo "Regenerating API documentation..."
node generate-api-docs.js

# Build documentation if not skipped
if [ "$SKIP_BUILD" = false ]; then
  echo "Building documentation site..."
  npm run build
fi

# Serve documentation if requested
if [ "$SERVE" = true ]; then
  echo "Starting documentation server..."
  npm run serve
fi

echo "API documentation update complete!" 