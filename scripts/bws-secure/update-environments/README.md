# Update Environment Variables Script

This script is part of the **BWS-Secure** project, located under the `scripts/bws-secure/update-environments/` directory. It facilitates the management and synchronization of environment variables across **Netlify** and **Vercel** platforms, ensuring consistency and security.

## Table of Contents

1. Overview
2. Environment Management
   - Environment Mapping
   - Platform Support
   - File Structure
3. Configuration
   - Prerequisites
   - Project Configuration
   - Required Variables
4. Usage
   - Basic Usage
   - Platform-Specific Usage
5. Debugging
   - Debug Variables
   - Debugging File Mappings
   - Troubleshooting
6. Platform Details
   - Netlify
   - Vercel
   - Local Development
7. Advanced Topics
   - Token Handling
   - Error Handling
   - API Rate Limits

---

## Overview

The `updateEnvVars.js` script:

- Processes all projects configured for the detected platform
- Updates each project's variables only once (prevented by BWS_ENV_UPDATED flag)
- Supports multiple projects per platform in bwsconfig.json
- Can handle both Netlify and Vercel projects simultaneously
- Maintains separate environments (prod/dev) per project

If you are using the **BWS-Secure run wrapper**, for testing or general use, run the script using the following command:

```bash
pnpm secure-run node scripts/bws-secure/update-environments/updateEnvVars.js
```

---

## Environment Management

### Environment Mapping

The system maps Netlify deployment contexts to Bitwarden Secrets Manager (BWS) project environments:

- **Production**: Uses the BWS project ID specified in `bwsProjectIds.prod`
- **Deploy Preview**: Uses the BWS project ID from `bwsProjectIds.dev` by default
- **Branch Deploy**: Uses the BWS project ID from `bwsProjectIds.dev` by default

#### Optional Environment Customization

For more granular control, you can specify separate BWS project IDs for different Netlify contexts:

```json
{
  "platform": "netlify",
  "projectName": "your-site-name",
  "bwsProjectIds": {
    "prod": "production-bws-project-id", // BWS Project ID for production
    "dev": "development-bws-project-id", // BWS Project ID for development
    "local": "local-development-bws-id", // BWS Project ID for local dev
    "deploy_preview": "preview-bws-id", // Optional: specific BWS Project ID for deploy previews
    "branch_deploy": "branch-bws-id" // Optional: specific BWS Project ID for branch deploys
  }
}
```

- If `deploy_preview` BWS project ID is specified, it will be used for deploy previews instead of `dev`
- If `branch_deploy` BWS project ID is specified, it will be used for branch deploys instead of `dev`
- If neither is specified, the `dev` BWS project ID is used as a fallback for all non-production contexts

This allows you to:

- Use the same variables for all non-production builds (default behavior using `dev`)
- Set up separate variables for deploy previews
- Configure branch-specific variables
- Mix and match as needed

### Platform Support

The script supports both Netlify and Vercel platforms.

### File Structure

The script uses a structured approach to manage environment variables:

- **bwsconfig.json**: Defines projects and configurations.
- **requiredVars.env**: Lists mandatory variables.
- **.env**: Contains platform-specific tokens and variables.

---

## Configuration

### Prerequisites

1. **Node.js**: Ensure you have Node.js installed.
2. **Environment Variables**: Add the required tokens to your `.env` file for local testing or development:
   ```env
   NETLIFY_AUTH_TOKEN=your_netlify_token
   BWS_ACCESS_TOKEN=your_access_token
   ```
   **Note**: `BWS_ACCESS_TOKEN` is primarily for local testing. During builds, tokens are securely retrieved from Bitwarden or specific platform configurations.

### Project Configuration

Define your projects and configurations in a `bwsconfig.json` file:

```json
{
  "projects": [
    {
      "platform": "vercel",
      "projectName": "your-vercel-project-name",
      "bwsProjectIds": {
        "prod": "00000000-0000-0000-0000-000000000001", // Bitwarden Secrets Manager Project ID for production
        "dev": "00000000-0000-0000-0000-000000000002", // BWS Project ID for development
        "local": "00000000-0000-0000-0000-000000000003" // BWS Project ID for local development
      },
      "preserveVars": ["BWS_ACCESS_TOKEN"]
    },
    {
      "platform": "netlify",
      "projectName": "your-netlify-site-name",
      "bwsProjectIds": {
        "prod": "00000000-0000-0000-0000-000000000004",
        "dev": "00000000-0000-0000-0000-000000000005",
        "local": "00000000-0000-0000-0000-000000000006"
      },
      "preserveVars": ["BWS_ACCESS_TOKEN"]
    }
  ]
}
```

- **platform**: Specify either `netlify` or `vercel`.
- **projectName**: The project name in Netlify/Vercel.
- **bwsProjectIds**: Map of Bitwarden Secrets Manager Project IDs for different environments.
  - These IDs are found in your Bitwarden Secrets Manager interface.
  - Each ID corresponds to a separate BWS project containing environment variables for that context.
  - Not to be confused with Netlify/Vercel project IDs.
- **preserveVars**: List of variables to retain unchanged.
- **exclusions**: List of variables to ignore during synchronization.

### Required Variables

Define mandatory variables in the `requiredVars.env` file:

```env
API_KEY=your_api_key
DATABASE_URL=your_database_url
SECRET_KEY=example_secret_key
ANOTHER_VAR=another_value
```

---

## Usage

### Basic Usage

The script is typically run through the secure-run wrapper during platform builds:

```bash
# For Netlify:
NETLIFY=true pnpm secure-run your-command

# For Vercel:
VERCEL=1 pnpm secure-run your-command
```

When run this way:

1. Platform is detected automatically
2. All matching projects are processed
3. Each project is updated only once
4. Variables are synchronized with the platform

### Platform-Specific Usage

- **Netlify**:

  - Retrieves existing environment variables for a site.
  - Updates variables with new values.
  - Excludes or preserves variables as specified in `bwsconfig.json`.

- **Vercel**:
  - Uses `vercel env ls --json` to list variables.
  - Updates variables with `vercel env add`.

### Options

- `--platform, -p`: Specify the deployment platform (Netlify or Vercel).
- `--help, -h`: Show help information.
- `--validateRequiredVars`: Validate the `requiredVars.env` file.

---

## Debugging

### Debug Variables

The environment mapping system supports several debug flags:

```bash
# Environment Variables
DEBUG=true              # Enable debug logging
SHOW_DECRYPTED=true    # Show decrypted environment contents
BWS_ENV=local|dev|prod # Specify environment
BWS_PROJECT=name       # Specify project name
VERBOSE=true           # Enable verbose logging
```

### Debugging File Mappings

The system creates symlinks from project ID based files to named environment files:

```
.env.secure.<project-id> -> .env.secure.<project-name>.<environment>
```

To debug these mappings:

```bash
# Show all mappings
DEBUG=true pnpm secure-run

# Show mappings and decrypted contents
DEBUG=true SHOW_DECRYPTED=true pnpm secure-run

# Debug specific environment mapping
DEBUG=true SHOW_DECRYPTED=true BWS_ENV=dev pnpm secure-run
```

### Debugging File Contents

When using `DEBUG=true SHOW_DECRYPTED=true`, the system will:

- Only decrypt and display the current environment's file
- Show contents in a formatted blue box
- Maintain all necessary symlinks for platform deployments
- Keep sensitive data secure in other environments

### Troubleshooting

1. Check file existence and mappings:

```bash
DEBUG=true pnpm secure-run
```

2. Verify file contents:

```bash
DEBUG=true SHOW_DECRYPTED=true pnpm secure-run
```

3. Debug specific project/environment:

```bash
DEBUG=true SHOW_DECRYPTED=true BWS_PROJECT=my-project BWS_ENV=dev pnpm secure-run
```

4. Full debug output:

```bash
DEBUG=true VERBOSE=true SHOW_DECRYPTED=true pnpm secure-run
```

The system will show:

- Which files are being created
- Symlink mappings
- Decrypted contents (if SHOW_DECRYPTED=true)
- Any errors or warnings during the process

---

## Platform Details

### Netlify

#### Environment Variables Management

- Retrieves existing environment variables for a site.
- Updates variables with new values.
- Excludes or preserves variables as specified in `bwsconfig.json`.

#### Testing

To test locally:

```bash
node updateEnvVars.js --netlifyTest --netlifySiteId your-site-id --netlifyToken your-netlify-token --netlifyKey TEST_VAR
```

### Vercel

#### Environment Variables Management

- Uses `vercel env ls --json` to list variables.
- Updates variables with `vercel env add`.

#### Status

Work in progress. Similar to Netlify, but with minor differences in API handling.

### Local Development

Local development defaults to:

- Uses `local` BWS project ID
- Can be overridden with `BWS_ENV` environment variable

---

## Advanced Topics

### Token Handling

Tokens such as `NETLIFY_AUTH_TOKEN` are required for API operations. The `getBuildOrAuthToken` function prioritizes tokens from environment variables and ensures their validity.

If a token is missing, the script will terminate with an error message. During testing, you can use `.env` files for token storage.

### Error Handling

Errors are logged and optionally terminate the script. Examples:

- **Fatal Errors**: Halt execution with detailed stack traces (in development mode).
- **Warnings**: Non-critical issues logged for user review.

You can control the termination behavior of errors by passing the `fatal` parameter to the `handleError` function.

### API Rate Limits

Both Netlify and Vercel impose rate limits on API requests. The script includes basic error handling to detect and log rate limit errors. For high-frequency operations, consider:

- Batching updates where possible.
- Avoiding excessive retries.
- Implementing delays or exponential backoff for retries.
