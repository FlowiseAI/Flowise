# JIRA Tool

The JIRA Tool allows you to interact with JIRA's REST API for managing issues, comments, and users directly from your Flowise workflows.

## Features

- **Issue Management**: Create, read, update, delete, assign, and transition issues
- **Comment Management**: Add, view, update, and delete comments on issues
- **User Management**: Search, view, and manage JIRA users
- **Flexible Authentication**: Supports both Basic Auth and Bearer Token authentication
- **SSL Certificate Support**: Connect to self-hosted JIRA instances with custom SSL certificates

---

## Authentication Options

### 1. Basic Authentication (Default)

Use this for **Atlassian Cloud** (e.g., `yourcompany.atlassian.net`) or self-hosted instances that support Basic Auth.

| Field | Description |
|-------|-------------|
| `Email` | Your JIRA account email address |
| `API Token` | API token generated from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens) |

**Example Configuration:**
```json
{
  "baseUrl": "https://yourcompany.atlassian.net",
  "email": "user@yourcompany.com",
  "apiToken": "YOUR_API_TOKEN"
}
```

### 2. Bearer Token Authentication (Enterprise/Self-Hosted)

Use this for **enterprise or self-hosted JIRA instances** that require Bearer token authentication (e.g., JIRA Data Center, JIRA Server with OAuth).

| Field | Description |
|-------|-------------|
| `Bearer Token` | Personal Access Token (PAT) or OAuth access token |

**Example Configuration:**
```json
{
  "baseUrl": "https://jira.mycompany.com",
  "bearerToken": "YOUR_BEARER_TOKEN"
}
```

> **Note:** When `bearerToken` is provided and `authType` is set to `bearerToken`, Basic Auth credentials are ignored.

---

## SSL Certificate Support

For self-hosted JIRA instances using custom SSL certificates (self-signed or internal CA), you can configure SSL certificate paths.

### Configuration Options

| Field | Description |
|-------|-------------|
| `SSL Certificate Path` | Path to the SSL certificate file (`.pem`, `.crt`) |
| `SSL Key Path` | Path to the private key file (optional, for mutual TLS) |
| `Verify SSL Certificates` | Enable/disable SSL certificate verification (default: `true`) |

### Usage Scenarios

#### Scenario 1: Custom CA Certificate

When your JIRA instance uses a certificate signed by an internal Certificate Authority:

```json
{
  "baseUrl": "https://jira.mycompany.com",
  "bearerToken": "YOUR_BEARER_TOKEN",
  "sslCertPath": "/path/to/ca-cert.pem"
}
```

#### Scenario 2: Client Certificate (Mutual TLS)

When your JIRA instance requires client certificate authentication:

```json
{
  "baseUrl": "https://jira.mycompany.com",
  "bearerToken": "YOUR_BEARER_TOKEN",
  "sslCertPath": "/path/to/client-cert.pem",
  "sslKeyPath": "/path/to/client-key.pem"
}
```

#### Scenario 3: Self-Signed Certificate (Development Only)

⚠️ **Not recommended for production!** Disable SSL verification for testing purposes:

```json
{
  "baseUrl": "https://jira.dev.local",
  "bearerToken": "YOUR_BEARER_TOKEN",
  "verifySslCerts": false
}
```

---

## Backward Compatibility

### Existing Basic Auth Users

**No changes required!** If you're currently using Basic Auth (email + API token), your configuration will continue to work without modification.

| Scenario | Behavior |
|----------|----------|
| `bearerToken` not provided | Falls back to Basic Auth using `email` + `apiToken` |
| `authType` set to `basicAuth` | Uses Basic Auth regardless of other fields |
| `authType` set to `bearerToken` | Uses Bearer Token authentication |

### Migration Guide

To migrate from Basic Auth to Bearer Token:

1. Generate a Personal Access Token (PAT) in your JIRA instance
2. Update your credential configuration:
   - Set `authType` to `bearerToken`
   - Add your `bearerToken` value
3. (Optional) Add SSL certificate paths if required
4. Test the connection before deploying

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid credentials | Verify your API token or Bearer token is correct |
| `403 Forbidden` | Insufficient permissions | Check your JIRA user permissions |
| `Failed to load SSL certificate` | Certificate file not found | Verify the certificate path and file permissions |
| `CERT_HAS_EXPIRED` | SSL certificate expired | Renew your SSL certificate |
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Self-signed certificate | Add the CA cert to `sslCertPath` or set `verifySslCerts: false` |

### SSL Certificate Troubleshooting

1. **File Permissions**: Ensure the certificate files are readable by the Flowise process
   ```bash
   chmod 644 /path/to/cert.pem
   chmod 600 /path/to/key.pem  # Private key should be more restricted
   ```

2. **Certificate Format**: Use PEM format for certificates
   ```bash
   # Convert from DER to PEM if needed
   openssl x509 -inform DER -in cert.der -out cert.pem
   ```

3. **Certificate Chain**: If using intermediate CAs, include the full chain in your certificate file

---

## Testing

### Pre-Deployment Checklist

1. ✅ **Verify Connectivity**: Test that your JIRA instance is reachable from the Flowise server
2. ✅ **Validate Credentials**: Ensure your Bearer token or API token is valid and not expired
3. ✅ **Check SSL Configuration**: If using custom certificates, verify they are correctly configured
4. ✅ **Test Operations**: Run a simple read operation (e.g., `Get Issue`) before deploying

### Regression Testing for Basic Auth

If you've updated to the new version with Bearer Token support, verify that Basic Auth still works:

```javascript
// Test Basic Auth configuration
const config = {
  baseUrl: "https://yourcompany.atlassian.net",
  authType: "basicAuth",
  email: "user@yourcompany.com",
  apiToken: "YOUR_API_TOKEN"
};

// Verify issue retrieval works
// GET /rest/api/3/issue/PROJ-123
```

### Testing Bearer Token

```javascript
// Test Bearer Token configuration
const config = {
  baseUrl: "https://jira.mycompany.com",
  authType: "bearerToken",
  bearerToken: "YOUR_BEARER_TOKEN",
  sslCertPath: "/path/to/cert.pem"
};

// Verify issue retrieval works
// GET /rest/api/3/issue/PROJ-123
```

---

## Available Actions

### Issue Actions
- `List Issues` - Query issues using JQL
- `Create Issue` - Create a new issue
- `Get Issue` - Retrieve issue details
- `Update Issue` - Modify issue fields
- `Delete Issue` - Remove an issue
- `Assign Issue` - Assign issue to a user
- `Transition Issue` - Change issue status

### Comment Actions
- `List Comments` - Get all comments on an issue
- `Create Comment` - Add a comment to an issue
- `Get Comment` - Retrieve a specific comment
- `Update Comment` - Edit a comment
- `Delete Comment` - Remove a comment

### User Actions
- `Search Users` - Find users by query
- `Get User` - Retrieve user details
- `Create User` - Create a new user

---

## API Reference

This tool uses the JIRA REST API v3. For detailed API documentation, see:
- [Atlassian JIRA REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [JIRA Server/Data Center REST API](https://docs.atlassian.com/software/jira/docs/api/REST/latest/)

---

## Changelog

### v2.0 (Current)
- ✨ Added Bearer Token authentication support
- ✨ Added SSL certificate configuration options
- ✨ Added `verifySslCerts` option for development environments
- 🔄 Backward compatible with existing Basic Auth configurations

### v1.0
- Initial release with Basic Auth support
- Issue, Comment, and User management operations
