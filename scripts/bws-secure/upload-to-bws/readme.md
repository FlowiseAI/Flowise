# BWS Secure Transfer

A streamlined tool for managing Bitwarden Secrets Manager (BWS) secrets across multiple projects and environments. The `upload-secrets.js` script automates the process of uploading secrets to your BWS project(s), eliminating the need for manual secret management.

## Quick Start

Prerequisites:

- Node.js installed
- pnpm/npm/yarn installed
- BWS account with project(s) created
- BWS access token with write permissions

1. **Create your secret files:**

   ```bash
   # .env.bws.<project-id>
   echo "MY_SECRET=value" > .env.bws.12345678-1234-1234-1234-123456789abc
   ```

2. **Set your token:**

   ```bash
   # In .env file
   echo "BWS_ACCESS_TOKEN=your_token_here" > .env
   ```

3. **Upload secrets:**

   ```bash
   # Upload only
   pnpm secure-run --upload-secrets

   # Or clear existing first (either format works)
   pnpm secure-run --upload-secrets --clearvars
   pnpm secure-run --upload-secrets --clear-vars
   ```

## Important Notes

- Use `secureRun.js` wrapper (recommended) instead of calling upload-secrets.js directly
- Project IDs in examples are for illustration - use your own BWS project IDs
- Token can be in root `.env` or local `.env` (root takes precedence)

Example `.env.bws.*` file:

```env
# Production Environment (.env.bws.467a446c-bd75-46bd-9a35-b2740186e3a1)
CONTENTFUL_SPACE_ID=your_space_id
API_KEY=your_api_key
DATABASE_URL=your_db_url

# Comments and empty lines are ok
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Table of Contents

- [BWS Secure Transfer](#bws-secure-transfer)
  - [Quick Start](#quick-start)
  - [Important Notes](#important-notes)
  - [Table of Contents](#table-of-contents)
  - [Installation \& Setup](#installation--setup)
  - [Basic Usage](#basic-usage)
  - [Advanced Features](#advanced-features)
    - [Multiple Projects](#multiple-projects)
    - [Clear Vars Mode](#clear-vars-mode)
    - [Debug Mode](#debug-mode)
  - [Security \& Permissions](#security--permissions)
  - [Environment Variables](#environment-variables)
  - [CI/CD Integration](#cicd-integration)
  - [Troubleshooting](#troubleshooting)
  - [Reference](#reference)
    - [BWS CLI Commands](#bws-cli-commands)
    - [Organization ID](#organization-id)
    - [File Structure](#file-structure)
  - [Related Documentation](#related-documentation)

## Installation & Setup

1. **Install Dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure BWS Token:**

   ```env
   # In .env
   BWS_ACCESS_TOKEN=your_token_here
   BWS_ORG_ID=optional_org_id  # Defaults to Last Rev's
   ```

3. **Create Secret Files:**

   ```bash
   # Production secrets
   .env.bws.467a446c-bd75-46bd-9a35-b2740186e3a1

   # Development secrets
   .env.bws.713fd3cf-d0fc-4111-b68d-b2740186d218
   ```

## Basic Usage

Upload secrets using any package manager:

```bash
# Using pnpm (recommended)
pnpm secure-run --upload-secrets

# Using npm
npm run secure-run --upload-secrets

# Using yarn
yarn secure-run --upload-secrets

# Direct node execution
node ./scripts/bws-secure/upload-to-bws/upload-secrets.js
```

## Advanced Features

### Multiple Projects

Manage multiple projects with separate files:

```bash
.env.bws.467a446c-bd75-46bd-9a35-b2740186e3a1  # Production
.env.bws.713fd3cf-d0fc-4111-b68d-b2740186d218  # Development
```

The script:

- Processes each file sequentially
- Shows progress per project
- Provides verification links
- Handles rate limiting

### Clear Vars Mode

Clear existing secrets before upload:

```bash
pnpm secure-run --upload-secrets --clearvars
```

Process:

1. Lists existing secrets
2. Deletes them one by one
3. Pauses for verification
4. Uploads new secrets

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true pnpm secure-run --upload-secrets
```

Shows:

- API commands
- Rate limiting info
- Error details
- Progress updates

## Security & Permissions

File Permissions:

```bash
# Secure env files
chmod 600 .env .env.bws.*

# BWS CLI permissions
chmod +x ./node_modules/.bin/bws
```

Security Features:

- Secure API transmission
- Local-only file reading
- No secret logging
- Verification pauses
- Permission checks

## Environment Variables

Required:

- `BWS_ACCESS_TOKEN`: BWS access token
- `BWS_ORG_ID`: Your Bitwarden organization ID

Optional:

- `DEBUG`: Enable detailed logging
- `NO_COLOR`: Disable colors
- `FORCE_COLOR`: Force disable colors

## CI/CD Integration

GitHub Actions:

```yaml
name: Upload Secrets
on:
  push:
    branches: [main]

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2

      - name: Upload
        env:
          BWS_ACCESS_TOKEN: ${{ secrets.BWS_ACCESS_TOKEN }}
        run: pnpm secure-run --upload-secrets
```

GitLab CI:

```yaml
upload_secrets:
  script:
    - pnpm secure-run --upload-secrets
  variables:
    BWS_ACCESS_TOKEN: $BWS_ACCESS_TOKEN
```

## Troubleshooting

Common Issues:

1. **404 Errors:**

   - Verify project ID
   - Check token permissions
   - Confirm project exists

2. **Rate Limiting:**

   - Script handles automatically
   - Adds delays between requests
   - Shows warning messages

3. **Permission Issues:**

   - Check token access
   - Verify file permissions
   - Confirm CLI access

4. **Empty Variables:**
   - Check file contents
   - Verify variable resolution
   - Use debug mode

## Reference

### BWS CLI Commands

List secrets:

```bash
bws secret list -o json <project-id>
```

Create secret:

```bash
bws secret create <key> <value> <project-id>
```

Delete secret:

```bash
bws secret delete <secret-id>
```

### Organization ID

Set your organization ID:

```env
BWS_ORG_ID=your-org-id-here
```

If not set, you'll see placeholder messages prompting you to configure BWS_ORG_ID.

### File Structure

```
scripts/bws-secure/
├── upload-to-bws/
│   ├── upload-secrets.js     # Main script
│   ├── readme.md            # This file
│   └── .env                 # Local config
├── secureRun.js            # Runner script
└── README.md               # Parent docs
```

## Related Documentation

- [Main BWS Secure Documentation](../README.md)
- [Bitwarden Secrets Manager Docs](https://bitwarden.com/help/secrets-manager-overview/)
- [BWS CLI Reference](https://bitwarden.com/help/secrets-manager-cli/)
