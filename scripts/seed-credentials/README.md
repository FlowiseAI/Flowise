# Credential Seeding Script

This script automatically seeds default credentials from environment variables into the Flowise database. It detects all `AAI_DEFAULT_*` environment variables and creates encrypted credentials for various AI and third-party services with enhanced safety features and interactive database connection recovery.

## Overview

The credential seeding script provides:

-   **Automatic Detection**: Scans for all `AAI_DEFAULT_*` environment variables
-   **Multiple Credential Types**: Supports both single API key and multi-field credential configurations
-   **Auto-Discovery**: Attempts to detect unmapped credentials by matching them to credential files
-   **Database Integration**: Directly inserts encrypted credentials into the Flowise database
-   **Secure Encryption**: Uses the same encryption method as the Flowise server
-   **Interactive Database Recovery**: Prompts for PostgreSQL URL when connection fails
-   **SSL Auto-Detection**: Automatically applies SSL for cloud database providers
-   **User/Organization Verification**: Verifies credentials will be assigned to valid users/organizations
-   **Enhanced Safety**: Test mode shows what would be changed before making modifications
-   **Robust Environment Loading**: Multiple fallback paths for .env file loading

## Usage

> **⚠️ Default is Safe: `pnpm seed-credentials` now runs in TEST MODE (dry-run, no writes).**
> To actually write credentials to the database, you must use `pnpm seed-credentials:write`.

```bash
# Test mode (shows what would be done without making changes)
pnpm seed-credentials
# OR
pnpm run seed-credentials

# Production mode (actually creates/updates credentials)
pnpm seed-credentials:write
# OR
pnpm run seed-credentials:write

# Debug mode (shows detailed environment variable loading)
pnpm seed-credentials -- --debug

# Combined test and debug mode
pnpm seed-credentials -- --debug

# Direct node usage (advanced)
node scripts/seed-credentials/seed-credentials.js --test
node scripts/seed-credentials/seed-credentials.js --debug
node scripts/seed-credentials/seed-credentials.js --test --debug
node scripts/seed-credentials/seed-credentials.js           # (production, not recommended)
```

## Database Configuration

### Interactive Database Connection Recovery

If the initial database connection fails, the script will automatically:

1. **Check for `DATABASE_SECURE_EXTERNAL_URL`**: First looks for this environment variable containing a full PostgreSQL connection URL
2. **Interactive Prompt**: If not found, prompts you to enter a PostgreSQL URL manually
3. **Automatic Parsing**: Parses the URL and extracts all connection parameters
4. **SSL Auto-Detection**: Automatically enables SSL for cloud providers (Render, Railway, AWS, Google Cloud)
5. **Retry Connection**: Attempts to connect with the parsed configuration

**Supported PostgreSQL URL Format:**

```
postgresql://username:password@host:port/database
postgres://username:password@host:port/database
```

**Example:**

```
postgresql://admin:mypassword@dpg-abc123.oregon-postgres.render.com/mydatabase
```

### Environment Variables

#### Required Database Configuration

| Variable            | Default     | Description                                   |
| ------------------- | ----------- | --------------------------------------------- |
| `DATABASE_TYPE`     | `postgres`  | Database type (currently supports PostgreSQL) |
| `DATABASE_HOST`     | `localhost` | Database host address                         |
| `DATABASE_PORT`     | `5432`      | Database port number                          |
| `DATABASE_USER`     | `postgres`  | Database username                             |
| `DATABASE_PASSWORD` | `postgres`  | Database password                             |
| `DATABASE_NAME`     | `flowise`   | Database name                                 |

#### Database Connection Recovery

| Variable                       | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| `DATABASE_SECURE_EXTERNAL_URL` | Full PostgreSQL URL (used if primary connection fails) |
| `DATABASE_SSL`                 | Enable SSL connection (`true`/`false`)                 |

#### Security & Ownership

| Variable                      | Default                  | Description                                                         |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `FLOWISE_SECRETKEY_OVERWRITE` | `theanswerencryptionkey` | Encryption key for credential data                                  |
| `DATABASE_SEED_USER_ID`       | `null`                   | **REQUIRED** UUID of the user to associate credentials with         |
| `DATABASE_SEED_ORG_ID`        | `null`                   | **REQUIRED** UUID of the organization to associate credentials with |

#### Script Control

| Variable     | Description                          |
| ------------ | ------------------------------------ |
| `TEST_MODE`  | Set to `true` to run in test mode    |
| `DEBUG_MODE` | Set to `true` to enable debug output |

**Important**: `DATABASE_SEED_USER_ID` and `DATABASE_SEED_ORG_ID` must be valid UUIDs that exist in your database. The script will verify these exist and show you the associated user/organization details for safety.

> **Note:** By default, `pnpm seed-credentials` runs in test mode. Use `pnpm seed-credentials:write` to actually write to the database.

## Supported Credential Types

### Direct API Key Mappings

These credentials require a single environment variable:

| Environment Variable         | Credential Name     | Description         |
| ---------------------------- | ------------------- | ------------------- |
| `AAI_DEFAULT_OPENAI_API_KEY` | `openai-default`    | OpenAI API key      |
| `AAI_DEFAULT_ANTHROPHIC`     | `anthropic-default` | Anthropic API key   |
| `AAI_DEFAULT_GROQ`           | `groq-default`      | Groq API key        |
| `AAI_DEFAULT_DEEPSEEK`       | `deepseek-default`  | DeepSeek API key    |
| `AAI_DEFAULT_EXASEARCH`      | `exasearch-default` | ExaSearch API key   |
| `AAI_DEFAULT_REPLICATE`      | `replicate-default` | Replicate API key   |
| `AAI_DEFAULT_SERPAPI`        | `serpapi-default`   | SerpAPI key         |
| `AAI_DEFAULT_PINCONE`        | `pinecone-default`  | Pinecone API key    |
| `AAI_DEFAULT_GITHUB_TOKEN`   | `github-default`    | GitHub access token |

### Multi-Field Credential Mappings

These credentials require multiple environment variables:

#### AWS Bedrock

-   **Base**: `AAI_DEFAULT_AWS_BEDROCK`
-   **Required Variables**:
    -   `AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY` - AWS Access Key
    -   `AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY` - AWS Secret Key
-   **Optional Variables**:
    -   `AAI_DEFAULT_AWS_BEDROCK_SESSION_TOKEN` - AWS Session Token

#### Supabase

-   **Base**: `AAI_DEFAULT_SUPABASE`
-   **Required Variables**:
    -   `AAI_DEFAULT_SUPABASE_URL` - Supabase project URL
    -   `AAI_DEFAULT_SUPABASE_API` - Supabase API key

#### Google Custom Search

-   **Base**: `AAI_DEFAULT_GOOGLE_SEARCH_API`
-   **Required Variables**:
    -   `AAI_DEFAULT_GOOGLE_SEARCH_API` - Google API key
    -   `AAI_DEFAULT_GOOGLE_SEARCH_API_ENGINE_ID` - Custom Search Engine ID

#### Redis Cache

-   **Base**: `AAI_DEFAULT_REDIS`
-   **Optional Variables** (all have defaults):
    -   `AAI_DEFAULT_REDIS_HOST` (default: `localhost`)
    -   `AAI_DEFAULT_REDIS_PORT` (default: `6379`)
    -   `AAI_DEFAULT_REDIS_USERNAME` (default: `default`)
    -   `AAI_DEFAULT_REDIS_PASSWORD` (default: empty)

## Auto-Detection Feature

The script can automatically detect unmapped `AAI_DEFAULT_*` variables by:

1. Scanning the `components/credentials/` directory for credential files
2. Matching environment variable names to credential file names
3. Creating basic API key mappings for detected services

This feature is useful for adding new services without modifying the script configuration.

## Enhanced Safety Features

### User & Organization Verification

Before processing credentials, the script:

1. **Validates USER_ID and ORG_ID**: Ensures they are properly formatted UUIDs
2. **Database Verification**: Checks that the user and organization actually exist in the database
3. **Identity Display**: Shows the actual user email/name and organization name for confirmation
4. **Safety Warnings**: Alerts if credentials would be orphaned (no valid user/org assignment)

### Test Mode Features

When running with `--test` or `--dry-run`:

-   **Read-Only Analysis**: No changes are made to the database
-   **Credential Preview**: Shows which credentials would be created or updated
-   **UUID Preservation**: Displays existing credential UUIDs that would be preserved
-   **User/Org Lookup**: Shows available users and organizations if verification fails
-   **Comprehensive Summary**: Details exactly what would happen in production mode

### Environment Variable Loading

The script uses a robust loading system with multiple fallback paths:

1. **Project Root**: `../../.env` (primary)
2. **Project Root Local**: `../../.env.local`
3. **Scripts Directory**: `../.env` (fallback)
4. **Current Working Directory**: `./.env`
5. **System Environment**: Direct `process.env` variables (highest priority)

## Example Environment File

```env
# Database Configuration (Primary)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=flowise

# Database Connection Recovery (Fallback)
DATABASE_SECURE_EXTERNAL_URL=postgresql://user:pass@host.render.com/database
DATABASE_SSL=true

# Security
FLOWISE_SECRETKEY_OVERWRITE=your-secret-encryption-key

# REQUIRED: User/Org Association (must exist in database)
DATABASE_SEED_USER_ID=123e4567-e89b-12d3-a456-426614174000
DATABASE_SEED_ORG_ID=987fcdeb-51c2-43d1-9f4a-123456789abc

# Script Control
TEST_MODE=false
DEBUG_MODE=false

# Direct API Keys
AAI_DEFAULT_OPENAI_API_KEY=sk-your-openai-key
AAI_DEFAULT_ANTHROPHIC=your-anthropic-key
AAI_DEFAULT_GROQ=your-groq-key
AAI_DEFAULT_DEEPSEEK=your-deepseek-key
AAI_DEFAULT_EXASEARCH=your-exasearch-key
AAI_DEFAULT_REPLICATE=your-replicate-key
AAI_DEFAULT_SERPAPI=your-serpapi-key
AAI_DEFAULT_PINECONE=your-pinecone-key
AAI_DEFAULT_GITHUB_TOKEN=your-github-token
AAI_DEFAULT_BRAVE_SEARCH=your-brave-search-key

# Multi-field Credentials
AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY=your-aws-access-key
AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY=your-aws-secret-key
AAI_DEFAULT_AWS_BEDROCK_SESSION_TOKEN=your-aws-session-token

AAI_DEFAULT_SUPABASE_URL=https://your-project.supabase.co
AAI_DEFAULT_SUPABASE_API=your-supabase-key

AAI_DEFAULT_GOOGLE_SEARCH_API=your-google-api-key
AAI_DEFAULT_GOOGLE_SEARCH_API_ENGINE_ID=your-search-engine-id

# Optional Redis Configuration
AAI_DEFAULT_REDIS_HOST=redis.example.com
AAI_DEFAULT_REDIS_PORT=6380
AAI_DEFAULT_REDIS_USERNAME=your-redis-user
AAI_DEFAULT_REDIS_PASSWORD=your-redis-password
```

## Script Behavior

### Execution Flow

1. **Environment Loading**: Loads environment variables with multiple fallback paths
2. **Debug Output** (if `--debug`): Shows environment variable loading details
3. **Environment Scanning**: Finds all `AAI_DEFAULT_*` variables
4. **Credential Mapping**: Groups related variables and maps them to credential configurations
5. **Auto-Detection**: Attempts to detect unmapped credentials
6. **Database Connection**: Connects with automatic retry and recovery:
    - Attempts connection with configured settings
    - On failure, checks `DATABASE_SECURE_EXTERNAL_URL`
    - If not found, prompts for PostgreSQL URL interactively
    - Parses URL and enables SSL for cloud providers
7. **User/Organization Verification**: Validates and displays user/org details
8. **Safety Checks**: Ensures USER_ID and ORG_ID exist in database
9. **Table Verification**: Ensures the credential table exists
10. **Credential Processing**: For each credential:
    - **Test Mode**: Shows what would be done without making changes
    - **Production Mode**: Updates existing or creates new credentials
    - Preserves existing UUIDs when updating
    - Encrypts credential data using Flowise encryption
11. **Summary Report**: Displays comprehensive results

### Test Mode vs Production Mode

#### Test Mode (`pnpm seed-credentials`, `--test` or `--dry-run`)

-   **Read-Only**: No database modifications
-   **Analysis**: Shows existing credentials and what would be created/updated
-   **Safety**: Displays available users/orgs if verification fails
-   **Preview**: Shows exact UUIDs that would be preserved
-   **Summary**: Detailed breakdown of planned changes

#### Production Mode (`pnpm seed-credentials:write`)

-   **Write Operations**: Actually creates/updates credentials in database
-   **UUID Preservation**: Updates existing credentials without changing UUIDs
-   **New Credentials**: Creates new credentials with fresh UUIDs
-   **Encryption**: Uses Flowise-compatible encryption for all credential data

### Output Information

The script provides comprehensive logging including:

#### Always Displayed

-   Environment variable loading source
-   Database connection information with credential ownership details
-   User and organization verification results
-   Number of AAI_DEFAULT variables found
-   Credential mapping and auto-detection results

#### Test Mode Specific

-   Detailed analysis of each credential (existing vs new)
-   Existing credential UUIDs and timestamps
-   Field counts and names for each credential
-   Available users and organizations (if verification fails)

#### Production Mode Specific

-   Real-time credential creation/update status
-   New credential UUIDs
-   Success/failure counts with detailed summaries

#### Debug Mode (`--debug`)

-   Environment variable loading paths attempted
-   Database configuration values (passwords masked)
-   Complete list of AAI_DEFAULT variables found

### Enhanced Error Handling

-   **Database Connection**: Intelligent recovery with URL prompting
-   **SSL Requirements**: Automatic SSL detection for cloud providers
-   **User/Org Validation**: Comprehensive verification with helpful error messages
-   **Invalid UUIDs**: Clear error messages with correction guidance
-   **Missing Required Variables**: Detailed warnings with field information
-   **Credential Conflicts**: Safe updating that preserves existing UUIDs
-   **Auto-Detection Failures**: Graceful handling with detailed logging
-   **Environment Loading**: Multiple fallback paths with clear status reporting

## Security Considerations

1. **Encryption**: All credential data is encrypted using the same method as the Flowise server
2. **Environment Variables**: Store sensitive data in environment variables, not in code
3. **Database Access**: Ensure database credentials are properly secured
4. **Credential Visibility**: All created credentials default to 'Private' visibility

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

    **Solution**: The script now handles this automatically!

    - First checks for `DATABASE_SECURE_EXTERNAL_URL` environment variable
    - If not found, prompts you to enter a PostgreSQL URL interactively
    - Automatically detects and enables SSL for cloud providers
    - Example URL: `postgresql://user:pass@host.render.com/database`

2. **SSL/TLS Required Errors**

    **Automatic Resolution**: The script detects cloud providers and enables SSL automatically

    - Render: `*.render.com` domains get SSL automatically
    - Railway: `*.railway.app` domains get SSL automatically
    - AWS: `*.aws.com` domains get SSL automatically
    - Manual override: Set `DATABASE_SSL=true` environment variable

3. **USER_ID/ORG_ID Validation Errors**

    **Enhanced Error Messages**: The script now provides detailed guidance

    - Validates UUID format automatically
    - Checks that user/organization exists in database
    - Shows actual user email/name and organization details
    - In test mode: Displays available users/organizations to choose from

    **Example Fix**:

    ```bash
    # Run in test mode to see available options
    node scripts/seed-credentials/seed-credentials.js --test

    # Copy the correct UUIDs from the output
    export DATABASE_SEED_USER_ID="valid-uuid-from-database"
    export DATABASE_SEED_ORG_ID="valid-uuid-from-database"
    ```

4. **Missing Credentials/Environment Variables**

    **Enhanced Detection**:

    - Run with `--debug` to see exactly which variables are loaded
    - Shows loading source (which .env file was used)
    - Lists all AAI_DEFAULT variables found
    - Displays field mappings for each credential type

5. **Permission Errors**

    - Ensure database user has CREATE/INSERT/UPDATE permissions
    - Verify database user can access the `credential`, `user`, and `organization` tables
    - Check that the user can create tables if the credential table doesn't exist

6. **Credential Conflicts or Duplicates**

    **Safe Handling**: The script now handles this intelligently

    - Preserves existing credential UUIDs when updating
    - Shows what would be updated vs created in test mode
    - Maintains compatibility with existing Flowise flows

### Debug and Test Modes

#### Test Mode (`pnpm seed-credentials`, `--test` or `--dry-run`)

```bash
# See what would be changed without making modifications
pnpm seed-credentials
# OR
node scripts/seed-credentials/seed-credentials.js --test

# Shows:
# - Which credentials would be created vs updated
# - Existing credential UUIDs that would be preserved
# - User/organization verification results
# - Available users/orgs if verification fails
```

#### Debug Mode (`--debug`)

```bash
# See detailed environment variable loading
pnpm seed-credentials -- --debug
# OR
node scripts/seed-credentials/seed-credentials.js --debug

# Shows:
# - Which .env file was loaded (or if using system env vars)
# - All database configuration values (passwords masked)
# - Complete list of AAI_DEFAULT variables found
# - Environment variable loading attempts and results
```

#### Combined Mode

```bash
# Get maximum visibility into what's happening
pnpm seed-credentials -- --debug
# OR
node scripts/seed-credentials/seed-credentials.js --test --debug
```

### Environment Variable Loading Issues

The script uses multiple fallback paths for .env files:

1. **Project Root**: `<project-root>/.env` (primary)
2. **Project Root Local**: `<project-root>/.env.local`
3. **Scripts Directory**: `<project-root>/scripts/.env` (legacy fallback)
4. **Current Directory**: `./.env`
5. **System Environment**: Direct environment variables (highest priority)

**Check Loading**:

```bash
# See which .env file is being used
node scripts/seed-credentials/seed-credentials.js --debug | grep "Loading environment"
```

### Database URL Format Issues

**Supported Formats**:

```
postgresql://username:password@host:port/database
postgres://username:password@host:port/database
```

**Common Mistakes**:

-   Missing protocol: Should start with `postgresql://` or `postgres://`
-   URL encoding: Special characters in passwords may need URL encoding
-   Port specification: Include port even if it's the default (5432)

**Testing Your URL**:

```bash
# Set the URL and test the connection
export DATABASE_SECURE_EXTERNAL_URL="postgresql://user:pass@host:port/db"
node scripts/seed-credentials/seed-credentials.js --test
```

## Extending the Script

### Adding New Direct Mappings

To add support for a new single API key service:

```javascript
AAI_DEFAULT_YOUR_SERVICE: {
    name: 'your-service-default',
    credentialName: 'yourServiceApi',
    mapFn: (value) => ({ yourServiceApiKey: value })
}
```

### Adding New Multi-Field Mappings

For services requiring multiple configuration values:

```javascript
AAI_DEFAULT_YOUR_SERVICE: {
    name: 'your-service-default',
    credentialName: 'yourServiceApi',
    requiredVars: ['FIELD1', 'FIELD2'],
    optionalVars: ['OPTIONAL_FIELD'],
    mapFn: (vars) => ({
        yourServiceField1: vars['FIELD1'],
        yourServiceField2: vars['FIELD2'],
        yourServiceOptional: vars['OPTIONAL_FIELD']
    })
}
```

## Dependencies

The script requires the following npm packages:

-   `typeorm` - Database ORM for PostgreSQL connections
-   `dotenv` - Environment variable loading with fallback support
-   `crypto-js` - Encryption functionality (Flowise-compatible)
-   `node:path`, `node:fs`, `node:crypto`, `node:readline` - Node.js built-in modules

**Built-in Node.js modules used:**

-   `node:readline` - Interactive user prompts for database URL recovery
-   `node:path` - File path resolution for .env file fallbacks
-   `node:fs` - File system access for credential auto-detection
-   `node:crypto` - Additional cryptographic operations

Make sure the npm packages are installed in your project:

```bash
# Install required dependencies
npm install typeorm dotenv crypto-js

# Or with pnpm
pnpm install typeorm dotenv crypto-js
```

**Note**: Node.js built-in modules don't need to be installed separately.
