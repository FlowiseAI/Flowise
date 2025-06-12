# BWS Secure Environment Manager

A secure environment variable manager for Vercel and Netlify deployments using Bitwarden Secrets
Manager.

## Table of Contents

- [BWS Secure Environment Manager](#bws-secure-environment-manager)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [Installation](#installation)
      - [Option 1: Using SSH (Recommended for Private Repositories)](#option-1-using-ssh-recommended-for-private-repositories)
      - [Option 2: Using HTTPS (Universal)](#option-2-using-https-universal)
      - [Option 3: Manual Installation](#option-3-manual-installation)
      - [Option 4: Update/Replace Existing Installation](#option-4-updatereplace-existing-installation)
    - [Basic Setup](#basic-setup)
    - [Platform Setup](#platform-setup)
      - [Vercel](#vercel)
      - [Netlify](#netlify)
  - [Configuration](#configuration)
    - [bwsconfig.json](#bwsconfigjson)
    - [Environment Variables](#environment-variables)
    - [Platform-Specific Setup](#platform-specific-setup)
      - [Vercel Configuration](#vercel-configuration)
      - [Netlify Configuration](#netlify-configuration)
  - [Usage](#usage)
    - [Basic Commands](#basic-commands)
    - [Development Workflow](#development-workflow)
    - [CI/CD Integration](#cicd-integration)
  - [Features](#features)
  - [Advanced Usage](#advanced-usage)
    - [Variable Scanning](#variable-scanning)
    - [Environment Mapping](#environment-mapping)
    - [Security Features](#security-features)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
  - [Support](#support)
  - [Machine Account Tokens](#machine-account-tokens)
  - [Directory Structure](#directory-structure)
    - [Links to README and Scripts](#links-to-readme-and-scripts)
  - [Debugging](#debugging)
    - [Environment Variables for Debugging](#environment-variables-for-debugging)
    - [Debug Output Explained](#debug-output-explained)
    - [Examples](#examples)
  - [Multi-Platform \& Environment Management](#multi-platform--environment-management)
    - [Why Multiple Environments?](#why-multiple-environments)
    - [Why Debugging Features?](#why-debugging-features)
    - [Environment File Structure](#environment-file-structure)
  - [Secret Management](#secret-management)
    - [Upload to BWS](#upload-to-bws)
  - [ESM Support](#esm-support)

## Quick Start

### Installation

#### Option 1: Using SSH (Recommended for Private Repositories)

```bash
git clone git@github.com:last-rev-llc/bws-secure.git scripts/bws-secure && rm -rf scripts/bws-secure/.git && bash scripts/bws-secure/install.sh
```

#### Option 2: Using HTTPS (Universal)

```bash
git clone https://github.com/last-rev-llc/bws-secure.git scripts/bws-secure && rm -rf scripts/bws-secure/.git && bash scripts/bws-secure/install.sh
```

#### Option 3: Manual Installation

```bash
git clone https://github.com/last-rev-llc/bws-secure.git scripts/bws-secure
rm -rf scripts/bws-secure/.git
bash scripts/bws-secure/install.sh
```

#### Option 4: Update/Replace Existing Installation

To update an existing installation to the latest version:

```bash
rm -rf scripts/bws-secure && git clone git@github.com:last-rev-llc/bws-secure.git scripts/bws-secure && rm -rf scripts/bws-secure/.git && bash scripts/bws-secure/install.sh
```

### Basic Setup

1. **Add BWS token to `.env`:**

   ```bash
   BWS_ACCESS_TOKEN=your_token_here
   ```

2. **Add a project-specific variable to `.env`:**

   ```bash
   BWS_PROJECT=your_project_name
   ```

3. **Update your `package.json` build scripts:**

   ```json
   {
     "scripts": {
       "dev": "npm secure-run next dev",
       "build": "npm secure-run next build",
       "start": "npm secure-run next start"
     }
   }
   ```

4. **Run the secure-run setup:**
   ```bash
   pnpm bws-deps
   ```

### Platform Setup

#### Vercel

```bash
# Add to .env
VERCEL_AUTH_TOKEN=your_token_here
```

#### Netlify

```bash
# Add to .env
NETLIFY_AUTH_TOKEN=your_token_here
```

## Configuration

### bwsconfig.json

Create or update bwsconfig.json in your project root:

```json
{
  "projects": [
    {
      "platform": "vercel", // or "netlify"
      "projectName": "your-project-name",
      "bwsProjectIds": {
        "prod": "your-prod-project-id",
        "dev": "your-dev-project-id",
        "local": "your-local-project-id"
      },
      "preserveVars": ["BWS_ACCESS_TOKEN"],
      "excludeVars": ["NODE_ENV", "VERCEL_URL", "VERCEL_ENV", "DEPLOY_URL"]
    }
  ]
}
```

### Environment Variables

Required environment variables:

- `BWS_ACCESS_TOKEN`: Your Bitwarden Secrets Manager access token
- `VERCEL_AUTH_TOKEN` or `NETLIFY_AUTH_TOKEN`: Platform-specific tokens

Optional variables:

- `DEBUG=true`: Enable detailed logging
- `VERBOSE=true`: Show additional debug information
- `BWS_ENV`: Force specific environment (prod/dev/local)

### Platform-Specific Setup

#### Vercel Configuration

- Automatically maps environments:
  - Production → prod BWS project
  - Preview → dev BWS project
  - Development → local BWS project
- Handles preview deployments automatically
- Preserves platform-specific variables

#### Netlify Configuration

- Context-based environment mapping:
  - production → prod BWS project
  - deploy-preview → dev BWS project
  - branch-deploy → dev BWS project
  - development → local BWS project
- Supports deploy previews and branch deploys
- Maintains Netlify-specific variables

## Usage

### Basic Commands

```bash
# Development
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# List available projects
pnpm list-projects

# Verify BWS installation
pnpm bws-deps
```

### Development Workflow

1. Local Development:

```bash
# Start development server
pnpm dev

# Test specific environment
BWS_ENV=dev pnpm dev

# Debug mode
DEBUG=true pnpm dev
```

2. Testing Platform Builds:

```bash
# Test Vercel build
VERCEL=1 pnpm build

# Test Netlify build
NETLIFY=true pnpm build
```

### CI/CD Integration

BWS Secure automatically:

- 🔍 Scans for required variables
- 📋 Validates variable availability
- 🔄 Syncs with deployment platform
- 🔒 Manages secure environment files
- 🧹 Cleans up after builds

## Features

- 🔐 Secure variable management
- 🌍 Multi-environment support
- 🚀 Platform integration
- 🔄 Auto-sync with BWS
- 📝 Variable validation
- 🛡️ Encrypted files
- 🧹 Auto-cleanup
- 🔍 Variable scanning

## Advanced Usage

### Variable Scanning

BWS Secure automatically scans:

- `api/` and `functions/` directories
- Detects `process.env.*` references
- Creates `requiredVars.env` manifest
- Validates availability during builds

### Environment Mapping

- **Production**: Uses prod BWS project

  ```bash
  # Vercel
  VERCEL_ENV=production
  # Netlify
  CONTEXT=production
  ```

- **Development**: Uses dev BWS project

  ```bash
  # Vercel
  VERCEL_ENV=preview
  # Netlify
  CONTEXT=deploy-preview
  ```

- **Local**: Uses local BWS project
  ```bash
  # Force local environment
  BWS_ENV=local pnpm dev
  ```

### Security Features

- 🔒 Environment files are encrypted
- 🧹 Automatic cleanup of secure files
- 🛡️ Secrets never logged
- ✅ Platform token validation
- 🔐 Ephemeral encryption keys

## Troubleshooting

### Common Issues

1. **Missing BWS Token**

   ```bash
   # Verify token
   echo $BWS_ACCESS_TOKEN
   # Test BWS CLI
   ./node_modules/.bin/bws secret list
   ```

2. **Platform Detection**

   ```bash
   # Test Vercel
   VERCEL=1 pnpm build
   # Test Netlify
   NETLIFY=true pnpm build
   ```

3. **Debug Mode**
   ```bash
   # Full debug output
   DEBUG=true VERBOSE=true pnpm build
   ```

## Support

- 📚 [Full Documentation](https://github.com/last-rev-llc/bws-secure)
- 🐛 [Issue Tracker](https://github.com/last-rev-llc/bws-secure/issues)
- 💬 [Discussions](https://github.com/last-rev-llc/bws-secure/discussions)

## Machine Account Tokens

To securely manage sensitive platform tokens (like `NETLIFY_AUTH_TOKEN` or `VERCEL_AUTH_TOKEN`), we
recommend using a **Machine Account** within Bitwarden Secrets Manager (BWS). This setup allows
tokens to be securely retrieved at build time, avoiding exposure in environment logs or
configuration files.

1. Log in to your BWS dashboard.
2. Open your Machine Account's vault or project scope.
3. If the secret (`NETLIFY_AUTH_TOKEN` or `VERCEL_AUTH_TOKEN`) does not already exist:
   - Create the secret using the appropriate token value for the specific Netlify or Vercel
     account/team.
4. If the secret already exists and you're confident it works for the intended Netlify/Vercel
   account/team:
   - Apply the existing secret to the Machine Account.
   - This approach allows multiple repositories, clients, or projects to share the same credentials
     when the token scope is appropriately configured.
5. During a build, `secureRun.js` will automatically fetch these tokens using your
   `BWS_ACCESS_TOKEN`, making them available for Netlify or Vercel commands.

By centralizing these tokens in a Machine Account:

- You avoid managing them per environment (e.g., production, development, local) since the same
  token can be reused across relevant builds.
- A single token can serve multiple repositories or teams, provided the token's scope supports the
  intended use case.
- You minimize the risk of token exposure, enhancing security and simplifying credential management.

## Directory Structure

The project structure is as follows:

```
/scripts/bws-secure
├── .gitignore
├── README.md
├── bws-dotenv.js
├── bws-installer.sh
├── check-vars
│   ├── .gitignore
│   ├── README.md
│   ├── check-vars-availability.sh
│   └── requiredRuntimeVars.js
├── config.json
├── env_validator.js
├── generate-env-debug.js
├── install.sh
├── list-projects.js
├── logger.js
├── secureRun.js
├── test-netlify-upload.js
├── test-vercel-upload.js
├── update-environments
│   ├── .gitignore
│   ├── README.md
│   ├── netlify.js
│   ├── updateEnvVars.js
│   ├── utils.js
│   └── vercel.js
└── upload-to-bws
    ├── readme.md
    └── upload-secrets.js
```

### Links to README and Scripts

For additional details, see:

- [Main README.md](scripts/bws-secure/README.md)
- [Check Vars README.md](scripts/bws-secure/check-vars/README.md)
- [Update Environments README.md](scripts/bws-secure/update-environments/README.md)
- [Upload to BWS README.md](scripts/bws-secure/upload-to-bws/readme.md)

Scripts:

- [bws-dotenv.js](scripts/bws-secure/bws-dotenv.js)
- [secureRun.js](scripts/bws-secure/secureRun.js)
- [test-netlify-upload.js](scripts/bws-secure/test-netlify-upload.js)
- [test-vercel-upload.js](scripts/bws-secure/test-vercel-upload.js)

## Debugging

### Environment Variables for Debugging

The following environment variables can be used for debugging:

```bash
# Basic debugging
DEBUG=true pnpm secure-run           # Shows debug logs
VERBOSE=true pnpm secure-run         # Shows more detailed logs

# View decrypted environment contents
DEBUG=true SHOW_DECRYPTED=true pnpm secure-run

# Debug specific project/environment
DEBUG=true SHOW_DECRYPTED=true BWS_PROJECT=my-project BWS_ENV=dev pnpm secure-run

# Common combinations
# Local development debugging
DEBUG=true SHOW_DECRYPTED=true BWS_ENV=local pnpm secure-run

# Production environment check
DEBUG=true SHOW_DECRYPTED=true BWS_ENV=prod pnpm secure-run

# Development environment with specific project
DEBUG=true SHOW_DECRYPTED=true BWS_PROJECT=my-project BWS_ENV=dev pnpm secure-run
```

### Debug Output Explained

- `DEBUG=true`: Enables basic debug logging

  - Shows environment variable status
  - Shows file operations
  - Shows project processing steps

- `SHOW_DECRYPTED=true`: Shows decrypted contents of environment files

  - Only works when `DEBUG=true` is also set
  - Shows contents in a formatted box
  - Only shows current environment's contents

- `BWS_PROJECT`: Specifies which project to process

  - Must match a project name in bwsconfig.json
  - Defaults to first project if not specified

- `BWS_ENV`: Specifies which environment to use
  - Values: 'local', 'dev', 'prod'
  - Defaults to 'local' if not specified

### Examples

1. Debug local development setup:

```bash
DEBUG=true SHOW_DECRYPTED=true pnpm secure-run next dev
```

2. Check production environment variables:

```bash
DEBUG=true SHOW_DECRYPTED=true BWS_ENV=prod pnpm secure-run
```

3. Debug specific project's development environment:

```bash
DEBUG=true SHOW_DECRYPTED=true BWS_PROJECT=my-project BWS_ENV=dev pnpm secure-run
```

4. Full debug output for platform builds:

```bash
DEBUG=true VERBOSE=true SHOW_DECRYPTED=true pnpm secure-run
```

## Multi-Platform & Environment Management

### Why Multiple Environments?

The system supports multiple platforms (Netlify/Vercel) and environments (prod/dev/local) because:

1. **Development Workflow**

   - Local development needs different variables than production
   - Preview deployments may need specific configurations
   - Production builds require strict security settings

2. **Platform Requirements**

   - Netlify and Vercel handle environments differently
   - Each platform needs its own token management
   - Build contexts vary between platforms

3. **Project Isolation**
   - Multiple projects can share the same BWS instance
   - Each project gets its own secure environment files
   - Variables are isolated between projects and environments

### Why Debugging Features?

The debugging capabilities (`DEBUG=true`, `SHOW_DECRYPTED=true`) are essential for:

1. **Troubleshooting**

   - Verify correct variables are loaded
   - Check environment file mappings
   - Validate platform detection

2. **Development**

   - See decrypted contents during local development
   - Confirm environment switching works
   - Debug platform-specific issues

3. **Deployment**
   - Validate production variables before deployment
   - Check platform token availability
   - Verify environment detection

Example workflow:

```bash
# Local development
DEBUG=true SHOW_DECRYPTED=true BWS_ENV=local pnpm secure-run next dev

# Test production variables
DEBUG=true SHOW_DECRYPTED=true BWS_ENV=prod pnpm secure-run

# Debug platform deployment
DEBUG=true SHOW_DECRYPTED=true NETLIFY=true CONTEXT=deploy-preview pnpm secure-run
```

### Environment File Structure

The system creates several types of environment files:

1. **Project ID Based**

   ```
   .env.secure.<project-id>
   ```

   - Direct from BWS
   - Encrypted contents
   - Used as source files

2. **Named Environment Files**

   ```
   .env.secure.<project-name>.<environment>
   ```

   - Symlinked from project ID files
   - Used by platform builds
   - Environment specific (prod/dev/local)

3. **Platform Files**
   ```
   .env.secure
   ```
   - Global platform tokens
   - Shared across projects
   - Platform-specific settings

## Secret Management

### Upload to BWS

The `upload-to-bws` module provides a secure way to manage secrets across your BWS projects:

```bash
# Upload secrets
pnpm secure-run --upload-secrets

# Clear existing secrets first, then upload (either format works)
pnpm secure-run --upload-secrets --clearvars
pnpm secure-run --upload-secrets --clear-vars
```

Key features:

- Manage multiple projects with `.env.bws.<project-id>` files
- Clear and verify existing secrets
- Secure token handling
- Rate limit protection
- CI/CD ready

For detailed usage, see [Upload to BWS Documentation](./upload-to-bws/readme.md)

## ESM Support

As of the latest update, this package now uses ES Modules (ESM) instead of CommonJS. This means:

1. All imports use the `import` syntax instead of `require()`
2. The package has `"type": "module"` in its package.json
3. When importing local files, you must include the `.js` extension
4. Node.js version 14.16.0 or higher is required

Example usage:

```javascript
import { loadBwsSecrets } from './bws-dotenv.js';
```

If you need to dynamically import a file:

```javascript
const module = await import('./some-file.js');
```
