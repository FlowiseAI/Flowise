# Check Vars

## Environment Variable Scanner

This directory contains tools for scanning and validating environment variables in your JavaScript/TypeScript projects. It ensures all required variables are available and injected into the environment before builds.

## Main Components

- **`requiredRuntimeVars.js`**: Scans the codebase for `process.env.*` references and generates a report of required variables.
- **`check-vars-availability.sh`**: Validates the presence of required variables and injects missing ones into supported platforms (Netlify, Vercel) or during local development.

## Features

### 🔍 **Smart Variable Detection**

- Automatically scans your codebase for `process.env.*` references.
- Supports various file types:
  - JavaScript, TypeScript, JSX, TSX
  - Vue, HTML, JSON, TOML, GraphQL
- Handles nested directories and various project structures.
- Recognizes variables in functions, API, and custom directories.

### 📊 **Variable Reporting**

- Generates a detailed `requiredVars.env` file containing all discovered variables.
- Groups variables by project sections for better organization.
- Tracks variables by their directory of occurrence.
- Provides clear visibility into environment requirements.

### ✅ **Runtime Validation**

- Ensures all required variables are present during builds.
- Offers verbose logging for detailed debugging.
- Allows testing in local environments with a `Test Mode` feature.

### 🔄 **Automatic Build Management**

- Automatically detects missing variables during Netlify/Vercel builds.
- Injects missing variables from secure sources.
- Triggers new builds after successful variable injection.
- Prevents failed deployments due to missing variables.

## Adding Commands to Your Project

To integrate the scanning and validation commands into your package.json, follow these steps:

### Example `package.json` Configuration

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "scan": "node ./scripts/bws-secure/check-vars/requiredRuntimeVars.js",
    "check:env": "bash ./scripts/bws-secure/check-vars/check-vars-availability.sh",
    "check:env:test": "bash ./scripts/bws-secure/check-vars/check-vars-availability.sh -t",
    "check:env:verbose": "bash ./scripts/bws-secure/check-vars/check-vars-availability.sh -v",
    "check:env:dry": "bash ./scripts/bws-secure/check-vars/check-vars-availability.sh -d"
  }
}
```

### Explanation of Commands

- **`scan`**: Scans your codebase for `process.env.*` references and generates `requiredVars.env`.
- **`check:env`**: Validates the presence of all required environment variables listed in `requiredVars.env`.
- **`check:env:test`**: Runs in test mode to validate variables locally, optionally loading them from `.env`.
- **`check:env:verbose`**: Provides detailed logging during the variable validation process.
- **`check:env:dry`**: Runs a dry run to preview the validation process without making changes.

### Configuring `bwsconfig.json`

Add a `bwsconfig.json` file in the root directory to manage variable exclusions and project-specific configurations. Example:

```json
{
  "projects": [
    {
      "platform": "netlify",
      "projectName": "my-netlify-project",
      "preserveVars": ["NODE_ENV", "DEPLOY_URL"],
      "excludeVars": ["DEBUG"]
    }
  ]
}
```

- **`preserveVars`**: Variables that should always be present.
- **`excludeVars`**: Variables to exclude during validation.

## How It Works

### 1. **Variable Discovery**

- Scans the codebase for `process.env.*` references.
- Generates a `requiredVars.env` file listing all found variables.
- Organizes variables by their location in the project structure.
- Acts as the bridge between `requiredRuntimeVars.js` and platform-specific uploads in `updateEnvVars.js`.

### 2. **Build-time Validation**

- Validates environment variables before deployment.
- Provides detailed error messages for missing variables.
- Ensures platform-specific contexts (like Netlify `deploy-preview` or Vercel `preview`) have the correct variables.

### 3. **Automatic Recovery**

- **Netlify**:
  - Detects missing variables during builds.
  - Fetches and injects missing variables from secure sources.
  - Triggers new builds after successful variable injection.
- **Vercel**:
  - Similar process as Netlify, including CLI-based updates to `production` and `preview` environments.

## Common Errors and Resolutions

### Missing `requiredVars.env`

- **Cause**: The scan step was skipped.
- **Solution**: Run `pnpm scan` to regenerate the file.

### Missing Authentication Tokens

- **Cause**: `NETLIFY_AUTH_TOKEN` or `VERCEL_AUTH_TOKEN` not defined.
- **Solution**: Add the required tokens to your `.env` file or environment.

### Invalid Environment Variable Formats

- **Cause**: Variables contain unsupported characters or formats.
- **Solution**: Validate your `.env` or `bwsconfig.json` files and fix any formatting issues.

## Integration with CI/CD

### GitHub Actions

```yaml
name: Validate Environment Variables

on:
  push:
    branches:
      - main

jobs:
  check-env-vars:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install dependencies
        run: pnpm install

      - name: Scan for environment variables
        run: pnpm scan

      - name: Validate environment variables
        run: pnpm check:env
```

### Netlify Build Command

```bash
pnpm scan && pnpm check:env
```

## Files in This Directory

### `requiredRuntimeVars.js`

This script scans specified directories (or default ones) for references to `process.env.*` and outputs the discovered variables in `requiredVars.env`. Key features include:

- Supports directory-specific or wildcard scans.
- Uses `.gitignore` patterns to skip unnecessary files.
- Scans for environment variables across a wide range of file types.
- Provides verbose logging for deeper insights during the scan.

#### Usage Examples

```bash
# Scan default directories
pnpm scan

# Scan specific directories
pnpm scan "functions,api"

# Scan using wildcards
pnpm scan "my-next-app/**/*.js"
```

### `check-vars-availability.sh`

This script validates the availability of variables listed in `requiredVars.env` and injects missing variables when possible. It supports:

- Validation for Netlify and Vercel environments.
- Test mode for local development.
- Excluding variables based on `bwsconfig.json`.
- Verbose and dry-run modes.

#### Usage Examples

```bash
# Run variable availability checks
bash check-vars-availability.sh

# Enable verbose logging
bash check-vars-availability.sh -v

# Test locally with secrets auto-loaded from .env
bash check-vars-availability.sh -t

# Preview actions without making changes
bash check-vars-availability.sh -d
```

## Project Structure

```
scripts/bws-secure/
├── check-vars/
│   ├── requiredVars.env             # Generated list of required variables
│   ├── requiredRuntimeVars.js       # Variable scanning logic
│   └── check-vars-availability.sh   # Main validation script
```

## Development

To contribute or modify:

1. Clone the repository.
2. Install dependencies with `pnpm install`.
3. Run tests with `pnpm check:env:test`.

## Notes

- The `requiredVars.env` file is used by `updateEnvVars.js` to synchronize environment variables with platforms like Netlify and Vercel.
- Variables can be excluded or preserved using `bwsconfig.json` for precise control.
- This module is integral to the larger **BWS-Secure** workflow, ensuring secure, accurate environment variable management.
