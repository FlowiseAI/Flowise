---
description: Complete guide to setting up Google OAuth for AnswerAgentAI integrations
---

# Google OAuth Setup

## Overview

Google OAuth 2.0 is required for integrating Google services with AnswerAgentAI, including Gmail, Google Drive, and Google Calendar. This guide covers the complete setup process from creating a Google Cloud Console project to configuring OAuth in your AnswerAgentAI instance.

## Prerequisites

-   A Google account
-   Access to Google Cloud Console
-   AnswerAgentAI instance (local or deployed)

## Step 1: Create Google Cloud Console Project

1. **Access Google Cloud Console**

    - Visit [Google Cloud Console](https://console.cloud.google.com/)
    - Sign in with your Google account

2. **Create a New Project**

    - Click on the project dropdown at the top of the page
    - Click "New Project"
    - Enter a project name (e.g., "AnswerAgentAI Integration")
    - Click "Create"

3. **Select Your Project**
    - Ensure your newly created project is selected in the project dropdown

## Step 2: Enable Required APIs

Navigate to **APIs & Services > Library** and enable the following APIs:

### Required APIs for AnswerAgentAI Integrations:

-   **Gmail API** - For Gmail document loader
-   **Google Drive API** - For Google Drive document loader
-   **Google Calendar API** - For calendar event tools
-   **Google Sheets API** - For spreadsheet integration (if using Drive)

For each API:

1. Search for the API name
2. Click on the API
3. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen**

    - Go to **APIs & Services > OAuth consent screen**

2. **Choose User Type**

    - Select "External" (unless you're using Google Workspace)
    - Click "Create"

3. **App Information**

    - App name: `AnswerAgentAI` (or your custom name)
    - User support email: Your email address
    - Developer contact information: Your email address

4. **App Domain (Optional but Recommended)**

    - Homepage URL: Your AnswerAgentAI instance URL
    - Privacy policy URL: Your privacy policy URL
    - Terms of service URL: Your terms of service URL

5. **Authorized Domains**

    - Add your domain (e.g., `yourdomain.com`)
    - For local development, you can skip this

6. **Save and Continue**

## Step 4: Add Required Scopes

1. **Click "Add or Remove Scopes"**

2. **Add the following scopes for AnswerAgentAI integrations:**

    ```
    https://www.googleapis.com/auth/gmail.readonly
    https://www.googleapis.com/auth/gmail.modify
    https://www.googleapis.com/auth/drive.readonly
    https://www.googleapis.com/auth/drive.file
    https://www.googleapis.com/auth/calendar
    https://www.googleapis.com/auth/calendar.events
    https://www.googleapis.com/auth/userinfo.email
    https://www.googleapis.com/auth/userinfo.profile
    ```

### Scope Descriptions:

| Scope              | Purpose                                     | Used By                      |
| ------------------ | ------------------------------------------- | ---------------------------- |
| `gmail.readonly`   | Read Gmail messages and labels              | Gmail Document Loader        |
| `gmail.modify`     | Modify Gmail messages (for marking as read) | Gmail Document Loader        |
| `drive.readonly`   | Read Google Drive files                     | Google Drive Document Loader |
| `drive.file`       | Access files created by the app             | Google Drive Document Loader |
| `calendar`         | Full calendar access                        | Calendar Tools               |
| `calendar.events`  | Manage calendar events                      | Calendar Tools               |
| `userinfo.email`   | Access user's email address                 | All integrations             |
| `userinfo.profile` | Access user's profile information           | All integrations             |

3. **Save and Continue**

## Step 5: Create OAuth 2.0 Credentials

1. **Navigate to Credentials**

    - Go to **APIs & Services > Credentials**

2. **Create Credentials**

    - Click "Create Credentials"
    - Select "OAuth 2.0 Client IDs"

3. **Configure OAuth Client**

    - Application type: "Web application"
    - Name: `AnswerAgentAI OAuth Client`

4. **Authorized Redirect URIs**
   Add the following URIs based on your setup:

    **For Local Development:**

    ```
    http://localhost:3000/api/v1/callback/googleoauth
    ```

    **For Production:**

    ```
    https://yourdomain.com/api/v1/callback/googleoauth
    ```

5. **Create and Download**
    - Click "Create"
    - Download the JSON file with your credentials
    - **Important:** Keep this file secure and never commit it to version control

## Step 6: Configure Environment Variables

Add the following environment variables to your AnswerAgentAI instance:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/callback/googleoauth

# For production, use your domain:
# GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/callback/googleoauth
```

## Step 7: Credential Configuration in AnswerAgentAI

### Creating Google OAuth Credential

1. **Navigate to Credentials**

    - In AnswerAgentAI, go to the Credentials section
    - Click "Add Credential"

2. **Select Google OAuth**

    - Choose "Google OAuth" from the credential types

3. **Configure Credential**

    - **Credential Name:** Give it a descriptive name (e.g., "My Google Account")
    - The system will redirect you to Google for authorization

4. **Authorize Access**
    - Sign in to your Google account
    - Review and accept the requested permissions
    - You'll be redirected back to AnswerAgentAI

## End User OAuth Flow

### For End Users Connecting Their Accounts

Once developers have set up the Google OAuth application, end users can connect their Google accounts through the following process:

1. **Access Credentials Section**

    - Navigate to the Credentials section in AnswerAgentAI
    - Click "Add Credential"

2. **Select Google OAuth**

    - Choose "Google OAuth" from the available credential types

3. **Authorization Process**

    - Click the authorization button
    - You'll be redirected to Google's authorization page
    - Sign in with your Google account if not already signed in

4. **Grant Permissions**

    - Review the requested permissions
    - These permissions allow AnswerAgentAI to access specific Google services
    - Click "Allow" to grant access

5. **Confirmation**

    - You'll be redirected back to AnswerAgentAI
    - Your Google account is now connected and ready to use

6. **Using the Credential**
    - Select your Google OAuth credential when configuring:
        - Gmail Document Loader
        - Google Drive Document Loader
        - Google Calendar Tools

### Troubleshooting User Authorization

**Common Issues:**

1. **"Error 400: redirect_uri_mismatch"**

    - Ensure the redirect URI in Google Console matches your AnswerAgentAI instance URL
    - Check that GOOGLE_CALLBACK_URL environment variable is correct

2. **"Access Blocked: This app's request is invalid"**

    - Verify all required scopes are added in Google Console
    - Ensure OAuth consent screen is properly configured

3. **"Refresh Token Issues"**
    - Tokens automatically refresh, but if issues persist:
    - Re-authorize the credential
    - Check token expiration in credential settings

## Security Best Practices

1. **Environment Variables**

    - Never expose client secrets in frontend code
    - Use environment variables for all sensitive configuration

2. **Scope Minimization**

    - Only request the minimum scopes required for your use case
    - Regularly review and remove unused scopes

3. **Token Management**

    - AnswerAgentAI automatically handles token refresh
    - Monitor token usage and expiration

4. **Domain Verification**
    - For production, verify your domain in Google Console
    - This removes the "unverified app" warning for users

## Testing Your Setup

1. **Create a Test Credential**

    - Follow the end user flow to create a Google OAuth credential

2. **Test Integration**

    - Try using Gmail Document Loader with your credential
    - Verify Google Drive access works
    - Test calendar event creation

3. **Check Permissions**
    - Ensure all required scopes are working
    - Verify data is loading correctly

## Advanced Configuration

### Custom Scopes

If you need additional Google API access, add the required scopes to your OAuth consent screen and update your application accordingly.

### Multi-Domain Setup

For multiple domains, add all authorized redirect URIs to your OAuth client configuration.

### Workspace Integration

For Google Workspace customers, you can use "Internal" user type for enhanced security and reduced approval requirements.

## Troubleshooting

### Common Setup Issues

1. **APIs Not Enabled**

    - Verify all required APIs are enabled in Google Console
    - Check API quotas and limits

2. **Incorrect Redirect URI**

    - Ensure redirect URIs match exactly (including http/https and trailing slashes)
    - Check environment variable configuration

3. **Scope Issues**

    - Verify all required scopes are added to OAuth consent screen
    - Some scopes may require Google verification for production use

4. **Token Expiration**
    - AnswerAgentAI handles automatic token refresh
    - If issues persist, re-authorize the credential

### Getting Help

-   Check Google Cloud Console error logs
-   Review AnswerAgentAI application logs
-   Ensure environment variables are correctly set
-   Verify network connectivity to Google APIs

---

**Next Steps:** Once OAuth is configured, you can set up specific Google integrations:

-   [Gmail Document Loader](../../sidekick-studio/chatflows/document-loaders/gmail.md)
-   [Google Drive Document Loader](../../sidekick-studio/chatflows/document-loaders/google-drive.md)
-   [Google Calendar Tools](../../sidekick-studio/chatflows/tools/google-calendar.md)
