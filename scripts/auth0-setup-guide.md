# Auth0 Machine-to-Machine Application Setup Guide

This guide walks you through setting up the required Auth0 Machine-to-Machine application for the user export script.

## Step 1: Create Machine-to-Machine Application

1. **Login to Auth0 Dashboard**

    - Go to [manage.auth0.com](https://manage.auth0.com)
    - Select your tenant

2. **Navigate to Applications**

    - Click **Applications** in the left sidebar
    - Click **Applications** again (not APIs)

3. **Create New Application**
    - Click **Create Application** button
    - **Name**: `User Export Script` (or your preferred name)
    - **Application Type**: Select **Machine to Machine Applications**
    - Click **Create**

## Step 2: Configure API Authorization

1. **Select the Auth0 Management API**

    - After creating the app, you'll see a list of APIs
    - Find and select **Auth0 Management API**
    - Click **Authorize**

2. **Grant Required Scopes**
   Select the following scopes (check the boxes):

    **Required Scopes:**

    - ✅ `read:organizations` - Read organization information
    - ✅ `read:organization_members` - Read organization members
    - ✅ `read:organization_member_roles` - Read roles assigned to organization members

    **Optional Scopes:**

    - ✅ `read:users` - Read user profiles (for additional user details)
    - ✅ `read:roles` - Read role definitions (for role descriptions)

3. **Save Configuration**
    - Click **Authorize** to save the scope selection

## Step 3: Get Application Credentials

1. **Navigate to Application Settings**

    - Go back to **Applications** → **Applications**
    - Click on your newly created "User Export Script" application
    - Go to the **Settings** tab

2. **Copy Credentials**
   You'll need these values for your environment variables:

    ```bash
    # Copy these from the Settings tab:
    AUTH0_CLIENT_ID=your_client_id_here
    AUTH0_CLIENT_SECRET=your_client_secret_here

    # Your domain (from the top of the Settings page):
    AUTH0_DOMAIN=your-tenant.auth0.com
    # OR if you prefer the full URL format:
    AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
    ```

## Step 4: Get Organization ID(s)

1. **Navigate to Organizations**

    - Click **Organizations** in the left sidebar
    - Click **Organizations** (not Settings)

2. **Find Your Organization**

    - Click on the organization you want to export users from
    - The **Organization ID** is displayed at the top of the page
    - Copy this ID for your environment variables

3. **For Multiple Organizations**
    - Repeat for each organization
    - Combine IDs with commas: `org_abc123,org_def456,org_ghi789`

## Step 5: Update Environment Variables

Add the following to your environment configuration:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_m2m_client_id
AUTH0_CLIENT_SECRET=your_m2m_client_secret
AUTH0_ORGANIZATION_ID=org_your_org_id

# If you have multiple organizations:
AUTH0_ORGANIZATION_ID=org_abc123,org_def456,org_ghi789
```

### Environment Variable Options

Your project supports multiple ways to configure these:

1. **Local Development** - Add to `.env` file in project root
2. **Production** - Use your deployment platform's environment variable system
3. **Secure Run** - Use the project's BWS secure environment system

## Step 6: Test the Setup

1. **Install Dependencies**

    ```bash
    # From project root
    pnpm install --filter scripts
    ```

2. **Test with Help Command**

    ```bash
    # This should show help without errors
    node scripts/export-auth0-users.js --help
    ```

3. **Test Configuration**
    ```bash
    # This will validate your environment variables
    pnpm export-auth0-users --verbose
    ```

## Verification Checklist

Before running the export, verify:

-   ✅ **Machine-to-Machine app created** with correct name
-   ✅ **Auth0 Management API authorized** for the app
-   ✅ **Required scopes granted**:
    -   `read:organizations`
    -   `read:organization_members`
    -   `read:organization_member_roles`
-   ✅ **Environment variables set**:
    -   `AUTH0_DOMAIN` or `AUTH0_ISSUER_BASE_URL`
    -   `AUTH0_CLIENT_ID`
    -   `AUTH0_CLIENT_SECRET`
    -   `AUTH0_ORGANIZATION_ID`
-   ✅ **Dependencies installed** in scripts directory
-   ✅ **Help command works** without errors

## Troubleshooting

### "unauthorized_client" Error

-   **Cause**: Invalid client credentials
-   **Solution**: Double-check `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`

### "access_denied" Error

-   **Cause**: Missing API authorization or scopes
-   **Solution**: Ensure the app is authorized for Auth0 Management API with required scopes

### "forbidden" Error on Organization

-   **Cause**: App doesn't have access to the organization
-   **Solution**: Verify the organization ID and that the app has appropriate permissions

### "Invalid Organization ID" Error

-   **Cause**: Organization ID not found or access denied
-   **Solution**:
    -   Check the organization ID format (should start with `org_`)
    -   Ensure your Auth0 user has access to the organization
    -   Verify the organization exists and is active

## Security Best Practices

1. **Limit Scope Permissions**

    - Only grant the minimum required scopes
    - Regularly audit and review granted permissions

2. **Secure Credential Storage**

    - Never commit credentials to version control
    - Use secure environment variable management
    - Consider secret rotation policies

3. **Monitor Usage**

    - Check Auth0 logs for API usage
    - Set up alerts for unusual activity
    - Regularly review M2M application logs

4. **Application Naming**
    - Use descriptive names for easy identification
    - Include purpose and owner information
    - Keep naming consistent across environments

## Additional Resources

-   [Auth0 Machine-to-Machine Applications](https://auth0.com/docs/get-started/auth0-overview/create-applications/machine-to-machine-apps)
-   [Auth0 Management API v2](https://auth0.com/docs/api/management/v2)
-   [Auth0 Organizations](https://auth0.com/docs/manage-users/organizations)
-   [Auth0 Scopes and Claims](https://auth0.com/docs/get-started/apis/scopes)
