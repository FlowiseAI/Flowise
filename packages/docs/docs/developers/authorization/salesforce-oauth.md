---
description: Complete guide to setting up Salesforce Personal OAuth for AnswerAI integrations
---

# Salesforce Personal OAuth Setup

## Overview

Salesforce Personal OAuth 2.0 enables individual users to connect their personal Salesforce accounts with AnswerAI, allowing for user-specific data access and operations. This is distinct from system-wide Salesforce API credentials and provides a more secure, user-controlled authentication method.

### Personal OAuth vs System-Wide Credentials

| **Personal OAuth**           | **System-Wide API Credentials**  |
| ---------------------------- | -------------------------------- |
| User-specific authentication | Organization-wide authentication |
| Individual refresh tokens    | Shared client credentials        |
| User grants permissions      | Admin configures permissions     |
| Secure, isolated access      | Broader system access            |
| OAuth 2.0 flow               | Client credentials flow          |

## Prerequisites

-   A Salesforce account with admin access
-   Access to Salesforce Setup menu
-   AnswerAI instance (local or deployed)
-   Basic understanding of OAuth 2.0 concepts

## Step 1: Create Salesforce Connected App

### Access Salesforce Setup

1. **Log in to Salesforce**

    - Sign in to your Salesforce org
    - Navigate to **Setup** (gear icon in top right)

2. **Navigate to App Manager**

    - In Setup, search for "App Manager"
    - Click on **App Manager** under Apps

3. **Create New Connected App**
    - Click **New Connected App**
    - Fill in the basic information:
        - **Connected App Name**: `AnswerAI Personal OAuth`
        - **API Name**: `AnswerAI_Personal_OAuth`
        - **Contact Email**: Your email address
        - **Description**: OAuth integration for personal AnswerAI access

### Configure OAuth Settings

1. **Enable OAuth Settings**

    - Check **Enable OAuth Settings**
    - **Callback URL**: Add your AnswerAI callback URL
        - For local development: `http://localhost:4000/api/v1/salesforce-auth/callback`
        - For production: `https://yourdomain.com/api/v1/salesforce-auth/callback`

2. **Select OAuth Scopes**
   Add the following scopes for comprehensive AnswerAI integration:

    ```
    Access and manage your data (api)
    Access your basic information (id, profile, email, address, phone)
    Perform requests on your behalf at any time (refresh_token, offline_access)
    ```

3. **Additional Settings**

    - **Require Secret for Web Server Flow**: Checked
    - **Require Secret for Refresh Token Flow**: Checked
    - **Enable PKCE Extension for Supported Authorization Flows**: Checked

4. **Save the Connected App**
    - Click **Save**
    - Wait for the app to be created (may take 2-10 minutes)

## Step 2: Configure Connected App Policies

### Set OAuth Policies

1. **Access Connected App**

    - Navigate back to **App Manager**
    - Find your `AnswerAI Personal OAuth` app
    - Click the dropdown arrow and select **Edit**

2. **Configure OAuth Policies**

    - **Permitted Users**: Select "Admin approved users are pre-authorized"
    - **IP Relaxation**: Select "Relax IP restrictions"
    - **Refresh Token Policy**: Select "Refresh token is valid until revoked"

3. **Save Changes**
    - Click **Save**

### Get Client Credentials

1. **View Consumer Details**

    - In the Connected App details, click **View**
    - Click **Manage Consumer Details**
    - You may need to verify your identity

2. **Record Credentials**
    - **Consumer Key (Client ID)**: Copy and store securely
    - **Consumer Secret (Client Secret)**: Copy and store securely
    - **Instance URL**: Note your org's instance URL (e.g., `https://your-domain.my.salesforce.com`)

## Step 3: Configure Environment Variables

Add the following environment variables to your AnswerAI instance:

### For Local Development

```bash
# Salesforce Personal OAuth Configuration
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com

# API Host (for callback)
API_HOST=http://localhost:4000
```

### For Production

```bash
# Salesforce Personal OAuth Configuration
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com

# API Host (for callback)
API_HOST=https://yourdomain.com
```

## Step 4: Credential Configuration in AnswerAI

### Creating Salesforce Personal OAuth Credential

1. **Navigate to Credentials**

    - In AnswerAI, go to the Credentials section
    - Click **Add Credential**

2. **Select Salesforce OAuth**

    - Choose **Salesforce OAuth** from the credential types
    - This is different from "Salesforce API" which uses client credentials

3. **Configure Credential**

    - **Credential Name**: Give it a descriptive name (e.g., "My Salesforce Account")
    - **Client ID**: Enter your Salesforce Consumer Key
    - **Client Secret**: Enter your Salesforce Consumer Secret
    - **Instance URL**: Enter your Salesforce instance URL

4. **Authorize Access**
    - Click **Authorize with Salesforce**
    - You'll be redirected to Salesforce login
    - Sign in to your Salesforce account
    - Review and approve the requested permissions
    - You'll be redirected back to AnswerAI

## End User OAuth Flow

### For End Users Connecting Their Accounts

Once administrators have set up the Salesforce Connected App, end users can connect their personal accounts:

1. **Access Credentials Section**

    - Navigate to the Credentials section in AnswerAI
    - Click **Add Credential**

2. **Select Salesforce OAuth**

    - Choose **Salesforce OAuth** from available credential types
    - Enter a descriptive name for the credential

3. **Fill Required Fields**

    - **Client ID**: Provided by admin or from Connected App
    - **Client Secret**: Provided by admin or from Connected App
    - **Instance URL**: Your organization's Salesforce URL

4. **Authorization Process**

    - Click **Authorize with Salesforce**
    - You'll be redirected to Salesforce's authorization page
    - Sign in with your Salesforce credentials

5. **Grant Permissions**

    - Review the requested permissions:
        - Access and manage your data
        - Access your basic information
        - Perform requests on your behalf
    - Click **Allow** to grant access

6. **Confirmation**

    - You'll be redirected back to AnswerAI
    - Your personal Salesforce account is now connected
    - The refresh token is securely stored

7. **Using the Credential**
    - Select your Salesforce OAuth credential when configuring:
        - Salesforce Personal OAuth MCP Server
        - Other Salesforce-integrated nodes

## Security Best Practices

### Environment Variables

1. **Never Expose Secrets**

    - Keep client secrets in environment variables only
    - Never commit secrets to version control
    - Use secure environment variable management

2. **Callback URL Security**
    - Use HTTPS in production
    - Validate callback URLs match exactly
    - Consider using state parameters for additional security

### Token Management

1. **Refresh Token Handling**

    - AnswerAI automatically handles token refresh
    - Refresh tokens are stored encrypted
    - Tokens can be revoked by users at any time

2. **Access Control**
    - Users control their own OAuth permissions
    - Tokens are scoped to individual users
    - No shared credentials between users

### Production Considerations

1. **Domain Verification**

    - Verify your domain in Salesforce for production use
    - This removes "unverified app" warnings
    - Provides better user experience

2. **Monitoring**
    - Monitor OAuth usage in Salesforce Setup
    - Track token refresh patterns
    - Set up alerts for unusual activity

## Testing Your Setup

### Verify Connected App Configuration

1. **Check OAuth Settings**

    - Verify callback URL matches your AnswerAI instance
    - Confirm all required scopes are enabled
    - Test the OAuth flow in a sandbox first

2. **Test Token Flow**
    - Create a test Salesforce OAuth credential
    - Verify authorization redirects work correctly
    - Confirm tokens are stored and refresh properly

### Integration Testing

1. **Create Test Credential**

    - Follow the end user flow to create a credential
    - Verify the OAuth popup works correctly
    - Check that refresh tokens are stored

2. **Test MCP Integration**
    - Use the credential with Salesforce Personal OAuth MCP
    - Verify data access works as expected
    - Test token refresh functionality

## Troubleshooting

### Common Setup Issues

1. **"Error 400: redirect_uri_mismatch"**

    - **Cause**: Callback URL in Connected App doesn't match AnswerAI
    - **Solution**: Verify `API_HOST` environment variable and Connected App callback URL match exactly

2. **"Error 400: invalid_client_id"**

    - **Cause**: Incorrect Consumer Key or app not properly saved
    - **Solution**: Double-check Consumer Key and wait for Connected App to propagate (up to 10 minutes)

3. **"Access Denied" during authorization**
    - **Cause**: User doesn't have permission or app not approved
    - **Solution**: Check Connected App policies and user permissions

### OAuth Flow Issues

1. **Popup Blocked**

    - **Cause**: Browser blocking OAuth popup
    - **Solution**: Allow popups for AnswerAI domain

2. **Token Not Saving**

    - **Cause**: Callback not reaching AnswerAI properly
    - **Solution**: Check network connectivity and callback URL configuration

3. **Refresh Token Issues**
    - **Cause**: Token revoked or expired
    - **Solution**: Re-authorize the credential through the OAuth flow

### Permission Issues

1. **Insufficient Permissions**

    - **Cause**: User doesn't have required Salesforce permissions
    - **Solution**: Grant user appropriate permissions in Salesforce

2. **Scope Limitations**
    - **Cause**: Connected App scopes too restrictive
    - **Solution**: Add required scopes to Connected App configuration

## Advanced Configuration

### Custom Scopes

If you need additional Salesforce API access:

1. **Add Scopes to Connected App**

    - Edit the Connected App in Salesforce
    - Add required OAuth scopes
    - Save and wait for propagation

2. **Update Documentation**
    - Document any additional scopes for your users
    - Provide clear explanations of why scopes are needed

### Multi-Environment Setup

For multiple environments (dev, staging, production):

1. **Separate Connected Apps**

    - Create separate Connected Apps for each environment
    - Use different callback URLs for each environment
    - Maintain separate client credentials

2. **Environment-Specific Variables**
    - Use different environment variables per environment
    - Ensure callback URLs match the deployed environment

### Enterprise Considerations

1. **User Management**

    - Consider user onboarding process
    - Provide clear documentation for end users
    - Set up support processes for OAuth issues

2. **Compliance**
    - Ensure OAuth setup meets organizational security requirements
    - Consider audit logging for OAuth activities
    - Document data access patterns for compliance

## Getting Help

### Salesforce Resources

-   [Salesforce OAuth Documentation](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
-   [Connected App Setup Guide](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm)
-   [OAuth Troubleshooting](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_troubleshoot.htm)

### AnswerAI Support

-   Check AnswerAI application logs for OAuth errors
-   Verify environment variables are correctly set
-   Test in a development environment first

---

**Next Steps:** Once OAuth is configured, you can set up specific Salesforce integrations:

-   [Salesforce Personal OAuth MCP Server](../../sidekick-studio/chatflows/tools-mcp/salesforce-personal-oauth-mcp.md)
-   [Salesforce API Credentials](../../sidekick-studio/credentials/README.md)
