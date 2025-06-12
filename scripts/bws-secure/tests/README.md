# BWS Secure Tests

This directory contains various test scripts for the BWS Secure environment management system.

## Available Tests

### Vercel API Test

Tests connectivity with the Vercel API and helps diagnose issues with project detection by searching across all teams and personal projects.

**Usage with npm script:**

```bash
# List all projects
pnpm run vercel-api-test

# Search for a specific project
pnpm run vercel-api-test <project-name>
```

**Usage with shell script:**

```bash
# List all projects
./scripts/bws-secure/tests/test-vercel-api.sh

# Search for a specific project
./scripts/bws-secure/tests/test-vercel-api.sh <project-name>
```

### Vercel Upload Test

Tests the upload functionality to Vercel environments.

```bash
pnpm run test:vercel
```

### Netlify Upload Test

Tests the upload functionality to Netlify environments.

```bash
pnpm run test:netlify
```

## Requirements

Before running tests, ensure you have:

1. Proper authentication tokens set in your `.env` file:

   - `VERCEL_AUTH_TOKEN` for Vercel tests
   - `NETLIFY_AUTH_TOKEN` for Netlify tests

2. Required dependencies installed:
   ```bash
   pnpm install
   ```

## Troubleshooting Vercel Projects

If you're having trouble with Vercel projects not being found, the most common issue is that the project exists in a different team than the script is checking. You can run the API test to identify where the project is located:

```bash
./scripts/bws-secure/tests/test-vercel-api.sh your-project-name
```

The script will search across all teams and personal projects to help you locate your project.
