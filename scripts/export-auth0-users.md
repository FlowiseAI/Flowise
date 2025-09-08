# Auth0 Users Export Script

This script exports users from an Auth0 organization along with their roles to a CSV file using the Auth0 Management API v2.

## Features

-   ✅ Exports users and roles from Auth0 organizations
-   ✅ Supports multiple organizations (comma-separated)
-   ✅ Handles pagination for large organizations
-   ✅ Comprehensive error handling and logging
-   ✅ Integrates with project's existing Auth0 configuration
-   ✅ Secure environment variable management
-   ✅ CSV output with detailed user information and roles

## Prerequisites

### 1. Auth0 Machine-to-Machine Application

You need to create a Machine-to-Machine (M2M) application in your Auth0 Dashboard:

1. **Navigate to Auth0 Dashboard** → Applications → Applications
2. **Create Application** → Choose "Machine to Machine Applications"
3. **Name your application** (e.g., "User Export Script")
4. **Select the Auth0 Management API**
5. **Grant the following scopes:**
    - `read:organizations`
    - `read:organization_members`
    - `read:organization_member_roles`
    - `read:users` (optional, for additional user details)

### 2. Environment Variables

The script uses the following environment variables (most should already be configured in your project):

```bash
# Required - Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
# OR
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com

# Machine-to-Machine Application Credentials
AUTH0_CLIENT_ID=your_m2m_client_id
AUTH0_CLIENT_SECRET=your_m2m_client_secret

# Target Organization(s) - can be comma-separated for multiple orgs
AUTH0_ORGANIZATION_ID=org_abc123,org_def456
```

### 3. Install Dependencies

From the scripts directory:

```bash
cd scripts
npm install
```

Or from the project root using pnpm (recommended for this project):

```bash
pnpm install --filter scripts
```

## Usage

### Basic Usage

```bash
# From project root
node scripts/export-auth0-users.js

# From scripts directory
npm run export-auth0-users
```

### Advanced Usage

```bash
# Specify output file
node scripts/export-auth0-users.js --output my-users.csv

# Target specific organization (overrides env var)
node scripts/export-auth0-users.js --org org_specific123

# Enable verbose logging
node scripts/export-auth0-users.js --verbose

# Combine options
node scripts/export-auth0-users.js --output team-export.csv --verbose --org org_abc123
```

### Using with Project's Secure Run

If your project uses the secure environment wrapper:

```bash
# From project root
pnpm secure-run "node scripts/export-auth0-users.js --verbose"
```

### Command Line Options

| Option            | Description                                  | Default                      |
| ----------------- | -------------------------------------------- | ---------------------------- |
| `--output <file>` | Output CSV file path                         | `auth0-users-export.csv`     |
| `--org <org_id>`  | Specific organization ID (overrides env var) | Uses `AUTH0_ORGANIZATION_ID` |
| `--verbose`       | Enable detailed logging                      | `false`                      |
| `--help`          | Show help message                            | -                            |

## Output Format

The script generates a CSV file with the following columns:

| Column               | Description                           |
| -------------------- | ------------------------------------- |
| `organization_id`    | Auth0 Organization ID                 |
| `user_id`            | Unique user identifier                |
| `email`              | User's email address                  |
| `name`               | User's display name                   |
| `picture`            | User's profile picture URL            |
| `roles_count`        | Number of roles assigned              |
| `roles_names`        | Semicolon-separated role names        |
| `roles_descriptions` | Semicolon-separated role descriptions |
| `created_at`         | User creation timestamp               |
| `updated_at`         | Last update timestamp                 |
| `last_login`         | Last login timestamp                  |

## Example Output

```csv
organization_id,user_id,email,name,picture,roles_count,roles_names,roles_descriptions,created_at,updated_at,last_login
org_abc123,auth0|user123,john@example.com,John Doe,https://...,2,Admin; User,Administrator role; Standard user,2024-01-15T10:30:00.000Z,2024-01-20T15:45:00.000Z,2024-01-22T09:15:00.000Z
```

## Error Handling

The script includes comprehensive error handling:

-   **Configuration validation** - Checks for required environment variables
-   **API authentication** - Validates Auth0 credentials
-   **Rate limiting** - Handles Auth0 API rate limits gracefully
-   **Network errors** - Retries on temporary network issues
-   **Permission errors** - Clear messages for insufficient permissions

## Common Issues and Solutions

### 1. "Missing required environment variables"

**Solution**: Ensure all required Auth0 environment variables are set. Check your `.env` file or environment configuration.

### 2. "Error obtaining access token: unauthorized_client"

**Solution**:

-   Verify your `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` are correct
-   Ensure the M2M application is authorized for the Auth0 Management API
-   Check that the application has the required scopes

### 3. "Error fetching organization members: Insufficient scope"

**Solution**: Add the missing scopes to your M2M application:

-   `read:organizations`
-   `read:organization_members`
-   `read:organization_member_roles`

### 4. "Could not fetch roles for user: forbidden"

**Solution**: The user might not have roles assigned, or your application lacks the `read:organization_member_roles` scope.

## Security Considerations

-   **Never commit credentials** - Use environment variables or secure secret management
-   **Limit scope permissions** - Only grant the minimum required scopes
-   **Secure the output file** - The CSV contains sensitive user data
-   **Use secure networks** - Run the script from secure, trusted networks
-   **Audit access** - Monitor usage of the M2M application in Auth0 logs

## Integration with Project

This script is designed to integrate seamlessly with your TheAnswer project:

-   **Uses existing Auth0 configuration** from your environment variables
-   **Follows project patterns** for error handling and logging
-   **Compatible with secure-run** wrapper for environment management
-   **Matches project dependencies** and uses existing packages where possible

## Support

For issues related to:

-   **Auth0 API**: Check [Auth0 Documentation](https://auth0.com/docs/api/management/v2)
-   **This script**: Review the error messages and logs with `--verbose` flag
-   **Project integration**: Ensure your Auth0 environment variables are properly configured

## Examples

### Export all users from multiple organizations with verbose logging:

```bash
node scripts/export-auth0-users.js --verbose --output full-export.csv
```

### Export users from a specific organization:

```bash
node scripts/export-auth0-users.js --org org_production123 --output prod-users.csv
```

### Quick export with default settings:

```bash
npm run export-auth0-users
```
