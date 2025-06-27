#!/bin/bash

# Check if a project name was provided
if [ $# -eq 0 ]; then
  echo "Running Vercel API test without a specific project name"
  echo "Usage: $0 [project-name]"
  echo ""
  pnpm run vercel-api-test
else
  echo "Searching for project: $1"
  pnpm run vercel-api-test "$1"
fi 