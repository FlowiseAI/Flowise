#!/bin/bash

# Change to the script directory
cd "$(dirname "$0")/scripts" || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the sync script
npm run sync-openapi

echo "OpenAPI synchronization completed!" 