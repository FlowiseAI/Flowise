---
sidebar_position: 3
title: Salesforce Personal OAuth MCP
description: Use Salesforce Personal OAuth MCP to interact with Salesforce CRM using individual user credentials
---

# Salesforce Personal OAuth MCP Server Documentation

## Introduction

The Salesforce Personal OAuth MCP (Model Context Protocol) Server enables Answer Agent to interact with Salesforce data using individual user OAuth credentials. This integration provides secure, user-specific access to Salesforce objects and records through natural language, with each user maintaining control over their own authentication tokens.

### Personal OAuth vs Client Credentials

| **Personal OAuth MCP**         | **Client Credentials MCP**        |
| ------------------------------ | --------------------------------- |
| Individual user authentication | Organization-wide authentication  |
| User-managed refresh tokens    | Shared client credentials         |
| User grants permissions        | Admin configures permissions      |
| Secure, isolated access        | Broader system access             |
| OAuth 2.0 Personal flow        | OAuth 2.0 Client Credentials flow |

## Prerequisites

Before using the Salesforce Personal OAuth MCP, ensure you have:

1. **Salesforce Connected App** configured for Personal OAuth
2. **Environment variables** set up for OAuth configuration
3. **Salesforce Personal OAuth credential** created in Answer Agent
4. **Appropriate Salesforce permissions** for the operations you want to perform

## Setting Up Salesforce Personal OAuth Credentials

### Step 1: Configure OAuth Environment Variables

Ensure your Answer Agent instance has the following environment variables configured:

```bash
# Salesforce Personal OAuth Configuration
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com

# API Host (for OAuth callbacks)
API_HOST=https://yourdomain.com
```

### Step 2: Create Personal OAuth Credential

1. **Navigate to Credentials**

    - In Answer Agent, go to the Credentials section
    - Click **Add Credential**

2. **Select Salesforce OAuth**

    - Choose **Salesforce OAuth** from the credential types
    - This is the personal OAuth credential, not the "Salesforce API" credential

3. **Configure and Authorize**
    - **Credential Name**: Give it a descriptive name
    - **Client ID**: Your Salesforce Consumer Key
    - **Client Secret**: Your Salesforce Consumer Secret
    - **Instance URL**: Your Salesforce instance URL
    - Click **Authorize with Salesforce**
    - Complete the OAuth flow to grant permissions

For detailed setup instructions, see the [Salesforce Personal OAuth Setup Guide](../../../developers/authorization/salesforce-oauth.md).

## Configuration in Answer Agent

### Adding Salesforce Personal OAuth MCP to Your Flow

1. **Add MCP Node**

    - In your chatflow or agentflow, add a new node
    - Navigate to **Tools** > **MCP Servers**
    - Select **Salesforce Personal OAuth MCP**

2. **Configure Credential**

    - In the **Connect Credential** field, select your Salesforce OAuth credential
    - The node will automatically connect to the published MCP server

3. **Select Available Actions**
    - The node will load available Salesforce operations
    - Choose the actions you want to enable for your flow
    - Available actions are dynamically loaded from the MCP server

### MCP Server Configuration

The Salesforce Personal OAuth MCP uses the published MCP server package with the following configuration:

```json
{
    "SALESFORCE_CONNECTION_TYPE": "OAuth_2.0_Personal",
    "SALESFORCE_CLIENT_ID": "from_environment_variable",
    "SALESFORCE_CLIENT_SECRET": "from_environment_variable",
    "SALESFORCE_INSTANCE_URL": "from_environment_variable",
    "SALESFORCE_REFRESH_TOKEN": "from_user_credential"
}
```

## Available Tools

The Salesforce Personal OAuth MCP provides the same comprehensive set of tools as the standard Salesforce MCP, but with user-specific authentication:

### 1. salesforce_search_objects

**Description**: Search for Salesforce standard and custom objects by name pattern.

**Schema**:

```json
{
    "searchPattern": "string" // Search pattern to find objects
}
```

**Use Cases**:

-   **Developers**: Find API names of objects to use in code
-   **Publishers**: Discover available objects for content creation

### 2. salesforce_describe_object

**Description**: Get detailed schema metadata including all fields, relationships, and field properties of any Salesforce object.

**Schema**:

```json
{
    "objectName": "string" // API name of the object (e.g., 'Account', 'Contact', 'Custom_Object__c')
}
```

**Use Cases**:

-   **Developers**: Understand field types and relationships for integration development
-   **Publishers**: Research data structures for documentation creation

### 3. salesforce_query_records

**Description**: Query records from any Salesforce object using SOQL, including relationship queries.

**Schema**:

```json
{
  "objectName": "string", // API name of the object to query
  "fields": ["string"], // List of fields to retrieve, including relationship fields
  "whereClause": "string", // Optional WHERE clause
  "orderBy": "string", // Optional ORDER BY clause
  "limit": number // Optional maximum number of records to return
}
```

**Use Cases**:

-   **Developers**: Test queries and validate data access patterns
-   **Publishers**: Extract real data examples for documentation

### 4. salesforce_dml_records

**Description**: Perform data manipulation operations on Salesforce records (insert, update, delete, upsert).

**Schema**:

```json
{
    "operation": "string", // "insert", "update", "delete", or "upsert"
    "objectName": "string", // API name of the object
    "records": [{}], // Array of records to process
    "externalIdField": "string" // Optional external ID field name for upsert operations
}
```

**Use Cases**:

-   **Developers**: Test data manipulation operations and validate business logic
-   **Publishers**: Create sample data for demos or documentation

### 5. salesforce_manage_object

**Description**: Create new custom objects or modify existing ones in Salesforce.

**Schema**:

```json
{
    "operation": "string", // "create" or "update"
    "objectName": "string", // API name for the object (without __c suffix)
    "label": "string", // Label for the object
    "pluralLabel": "string", // Plural label for the object
    "description": "string", // Optional description
    "nameFieldLabel": "string", // Optional label for the name field
    "nameFieldType": "string", // Optional type of the name field ("Text" or "AutoNumber")
    "nameFieldFormat": "string", // Optional display format for AutoNumber field
    "sharingModel": "string" // Optional sharing model ("ReadWrite", "Read", "Private", "ControlledByParent")
}
```

**Use Cases**:

-   **Developers**: Create custom objects for application development
-   **Publishers**: Set up demonstration environments for tutorials

### 6. salesforce_manage_field

**Description**: Create new custom fields or modify existing fields on any Salesforce object.

**Schema**:

```json
{
  "operation": "string", // "create" or "update"
  "objectName": "string", // API name of the object to add/modify the field
  "fieldName": "string", // API name for the field (without __c suffix)
  "label": "string", // Optional label for the field
  "type": "string", // Field type (required for create)
  "required": boolean, // Optional whether the field is required
  "unique": boolean, // Optional whether the field value must be unique
  "externalId": boolean, // Optional whether the field is an external ID
  "length": number, // Optional length for text fields
  "precision": number, // Optional precision for numeric fields
  "scale": number, // Optional scale for numeric fields
  "referenceTo": "string", // Optional API name of the object to reference
  "relationshipLabel": "string", // Optional label for the relationship
  "relationshipName": "string", // Optional API name for the relationship
  "deleteConstraint": "string", // Optional delete constraint for Lookup fields
  "picklistValues": [{ "label": "string", "isDefault": boolean }], // Optional values for Picklist fields
  "description": "string" // Optional description of the field
}
```

**Use Cases**:

-   **Developers**: Add custom fields to objects for application functionality
-   **Publishers**: Create demo fields for tutorial environments

### 7. salesforce_search_all

**Description**: Search across multiple Salesforce objects using SOSL (Salesforce Object Search Language).

**Schema**:

```json
{
  "searchTerm": "string", // Text to search for (supports wildcards * and ?)
  "searchIn": "string", // Optional which fields to search in
  "objects": [{
    "name": "string", // API name of the object
    "fields": ["string"], // Fields to return for this object
    "where": "string", // Optional WHERE clause for this object
    "orderBy": "string", // Optional ORDER BY clause for this object
    "limit": number // Optional maximum number of records to return
  }],
  "withClauses": [{
    "type": "string", // WITH clause type
    "value": "string", // Optional value for the WITH clause
    "fields": ["string"] // Optional fields for SNIPPET clause
  }],
  "updateable": boolean, // Optional return only updateable records
  "viewable": boolean // Optional return only viewable records
}
```

**Use Cases**:

-   **Developers**: Find records across multiple objects for integration testing
-   **Publishers**: Gather comprehensive data examples across the platform

### 8. salesforce_read_apex

**Description**: Read Apex classes from Salesforce.

**Schema**:

```json
{
  "className": "string", // Optional name of a specific Apex class to read
  "namePattern": "string", // Optional pattern to match Apex class names
  "includeMetadata": boolean // Optional whether to include metadata about the Apex classes
}
```

**Use Cases**:

-   **Developers**: Review existing code for debugging or enhancement
-   **Publishers**: Extract code examples for documentation

### 9. salesforce_write_apex

**Description**: Create or update Apex classes in Salesforce.

**Schema**:

```json
{
    "operation": "string", // "create" or "update"
    "className": "string", // Name of the Apex class to create or update
    "apiVersion": "string", // Optional API version for the Apex class
    "body": "string" // Full body of the Apex class
}
```

**Use Cases**:

-   **Developers**: Deploy code changes or create new classes
-   **Publishers**: Create example implementations for tutorials

### 10. salesforce_read_apex_trigger

**Description**: Read Apex triggers from Salesforce.

**Schema**:

```json
{
  "triggerName": "string", // Optional name of a specific Apex trigger to read
  "namePattern": "string", // Optional pattern to match Apex trigger names
  "includeMetadata": boolean // Optional whether to include metadata about the Apex triggers
}
```

**Use Cases**:

-   **Developers**: Analyze existing triggers for debugging or enhancement
-   **Publishers**: Extract trigger examples for documentation

### 11. salesforce_write_apex_trigger

**Description**: Create or update Apex triggers in Salesforce.

**Schema**:

```json
{
    "operation": "string", // "create" or "update"
    "triggerName": "string", // Name of the Apex trigger to create or update
    "objectName": "string", // Optional name of the Salesforce object the trigger is for
    "apiVersion": "string", // Optional API version for the Apex trigger
    "body": "string" // Full body of the Apex trigger
}
```

**Use Cases**:

-   **Developers**: Deploy trigger changes or create new triggers
-   **Publishers**: Create example trigger implementations for tutorials

### 12. salesforce_execute_anonymous

**Description**: Execute anonymous Apex code in Salesforce.

**Schema**:

```json
{
    "apexCode": "string", // Apex code to execute anonymously
    "logLevel": "string" // Optional log level for debug logs
}
```

**Use Cases**:

-   **Developers**: Test code snippets without deploying
-   **Publishers**: Demonstrate code functionality in real-time

### 13. salesforce_manage_debug_logs

**Description**: Manage debug logs for Salesforce users.

**Schema**:

```json
{
  "operation": "string", // "enable", "disable", or "retrieve"
  "username": "string", // Username of the Salesforce user
  "logLevel": "string", // Optional log level for debug logs
  "expirationTime": number, // Optional minutes until expiration
  "limit": number, // Optional maximum number of logs to retrieve
  "logId": "string", // Optional ID of a specific log to retrieve
  "includeBody": boolean // Optional whether to include the full log content
}
```

**Use Cases**:

-   **Developers**: Set up and monitor debugging sessions
-   **Publishers**: Capture detailed system behavior for documentation

## Common Use Case Examples

### For Developers Using Personal OAuth

1. **Personal Data Exploration**:

    ```
    "Show me all my personal contacts with their email addresses"
    ```

2. **User-Specific Querying**:

    ```
    "Find all opportunities I own that are closing this month"
    ```

3. **Personal Workspace Setup**:

    ```
    "Create a custom object for my personal project tracking"
    ```

4. **Individual Testing**:

    ```
    "Execute anonymous code to test my new validation logic"
    ```

5. **Personal Debugging**:
    ```
    "Enable debug logs for my user account and show recent API calls"
    ```

### For Publishers Using Personal OAuth

1. **Content Research with Personal Access**:

    ```
    "Find all custom objects I have access to and describe their fields"
    ```

2. **Real User Examples**:

    ```
    "Show me examples of how Accounts relate to my accessible Contacts"
    ```

3. **Personal Demo Environment**:

    ```
    "Create a demo Project__c object in my personal developer org"
    ```

4. **User-Specific Documentation**:

    ```
    "What picklist values do I have access to for Lead Status?"
    ```

5. **Personal Workflow Examples**:
    ```
    "Create example Apex code that works with my current user permissions"
    ```

## Personal OAuth Advantages

### Security Benefits

1. **Individual Access Control**

    - Each user controls their own authentication
    - No shared credentials between users
    - Users can revoke access at any time

2. **Granular Permissions**

    - Access limited to user's Salesforce permissions
    - No over-privileged system access
    - Audit trails tied to individual users

3. **Token Security**
    - Refresh tokens stored encrypted per user
    - Automatic token refresh handling
    - Secure token revocation process

### User Experience Benefits

1. **Personalized Access**

    - Users see only their accessible data
    - Operations respect user permissions
    - Natural user-specific workflows

2. **Easy Onboarding**

    - Standard OAuth flow familiar to users
    - No admin intervention required for user setup
    - Self-service credential management

3. **Flexible Usage**
    - Users can connect multiple Salesforce orgs
    - Different users can have different access levels
    - Individual customization of integrations

## Best Practices for Personal OAuth

### For Administrators

1. **Connected App Configuration**

    - Set appropriate OAuth scopes for your use case
    - Configure IP restrictions if needed
    - Monitor OAuth usage and patterns

2. **User Education**

    - Provide clear documentation for end users
    - Explain what permissions are being requested
    - Set up support processes for OAuth issues

3. **Security Monitoring**
    - Monitor OAuth token usage
    - Set up alerts for unusual activity
    - Regularly review Connected App settings

### For End Users

1. **Permission Awareness**

    - Understand what permissions you're granting
    - Regularly review connected applications
    - Revoke access when no longer needed

2. **Credential Management**

    - Use descriptive names for your credentials
    - Keep track of which orgs are connected
    - Re-authorize if you encounter issues

3. **Data Security**
    - Be cautious with data modification operations
    - Test in sandbox environments when possible
    - Monitor your Salesforce audit logs

### For Developers

1. **Error Handling**

    - Handle OAuth token expiration gracefully
    - Provide clear error messages to users
    - Implement retry logic for token refresh

2. **Testing**

    - Test with different user permission levels
    - Verify OAuth flow works correctly
    - Test token refresh scenarios

3. **Documentation**
    - Document required Salesforce permissions
    - Provide troubleshooting guides
    - Keep OAuth setup instructions current

## Troubleshooting Personal OAuth Issues

### Common User Issues

1. **Authorization Failures**

    - **Symptom**: OAuth popup fails or shows errors
    - **Solutions**:
        - Check browser popup blockers
        - Verify Connected App configuration
        - Ensure environment variables are correct

2. **Permission Denied Errors**

    - **Symptom**: MCP operations fail with permission errors
    - **Solutions**:
        - Verify user has required Salesforce permissions
        - Check Connected App OAuth scopes
        - Ensure user is in correct Salesforce org

3. **Token Refresh Problems**
    - **Symptom**: Authentication works initially but fails later
    - **Solutions**:
        - Re-authorize the credential
        - Check refresh token policy in Connected App
        - Verify token hasn't been revoked

### Technical Troubleshooting

1. **Environment Variable Issues**

    - **Symptom**: OAuth flow fails to start
    - **Solutions**:
        - Verify all required environment variables are set
        - Check API_HOST matches your deployment
        - Ensure SALESFORCE_INSTANCE_URL is correct

2. **Callback URL Problems**

    - **Symptom**: OAuth flow completes but doesn't return to Answer Agent
    - **Solutions**:
        - Verify callback URL in Connected App
        - Check network connectivity
        - Ensure API_HOST is accessible

3. **MCP Server Connection Issues**
    - **Symptom**: MCP actions don't load or fail to execute
    - **Solutions**:
        - Check MCP server logs
        - Verify Salesforce connectivity
        - Test with basic MCP operations first

## Advanced Configuration

### Multi-Org Support

Users can connect to multiple Salesforce organizations:

1. **Create Separate Credentials**

    - Create different OAuth credentials for each org
    - Use descriptive names (e.g., "Production Org", "Sandbox Org")
    - Configure appropriate Connected Apps in each org

2. **Org-Specific Workflows**
    - Create separate flows for different orgs
    - Use org-specific credentials in each flow
    - Document which org each flow connects to

### Custom Scopes and Permissions

For specialized use cases:

1. **Additional OAuth Scopes**

    - Add custom scopes to Connected App
    - Update user documentation
    - Test with new permissions

2. **Permission Set Management**
    - Create specific permission sets for Answer Agent users
    - Assign appropriate object and field permissions
    - Document required permissions for different use cases

### Integration with Other Systems

1. **Workflow Automation**

    - Combine with other MCP servers
    - Create multi-system workflows
    - Maintain user authentication across systems

2. **Data Synchronization**
    - Use personal OAuth for user-specific data sync
    - Respect user permissions in sync operations
    - Maintain audit trails for data changes

## Migration from Client Credentials

If migrating from the standard Salesforce MCP to Personal OAuth:

### For Administrators

1. **Gradual Migration**

    - Set up Personal OAuth alongside existing system
    - Test with select users first
    - Gradually migrate workflows

2. **User Training**
    - Provide migration documentation
    - Offer training sessions
    - Set up support channels

### For Users

1. **Credential Replacement**

    - Create new Personal OAuth credentials
    - Update existing workflows to use new credentials
    - Test thoroughly before removing old credentials

2. **Permission Verification**
    - Verify you have necessary Salesforce permissions
    - Test all required operations
    - Document any permission changes needed

## Getting Help

### Documentation Resources

-   [Salesforce Personal OAuth Setup Guide](../../../developers/authorization/salesforce-oauth.md)
-   [Salesforce OAuth Documentation](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
-   [Answer Agent Credentials Guide](../../credentials/README.md)

### Support Channels

-   Check Answer Agent application logs for OAuth errors
-   Review Salesforce Setup Audit Trail for OAuth activities
-   Test OAuth flow in Salesforce sandbox environment

### Community Resources

-   [Salesforce Developer Community](https://developer.salesforce.com/forums)
-   [OAuth Best Practices](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_best_practices.htm)
-   [MCP Server Documentation](https://github.com/tsmztech/mcp-server-salesforce)

---

The Salesforce Personal OAuth MCP Server provides a secure, user-controlled way to integrate Salesforce data with Answer Agent. By using individual OAuth credentials, users maintain control over their data access while benefiting from the full power of Salesforce integration through natural language interactions.
