---
sidebar_position: 2
title: Salesforce MCP
description: Use Salesforce MCP to interact with Salesforce CRM and database
---

# Salesforce MCP Server Documentation

## Introduction

The Salesforce MCP (Model Context Protocol) Server enables Answer Agent to interact with Salesforce data and metadata through natural language. This integration allows you to query, modify, and manage your Salesforce objects and records using conversational language.

## Setting Up Salesforce Credentials

### OAuth 2.0 Client Credentials Flow

1. **Create a Connected App in Salesforce**:

    - Navigate to **Setup** > **App Manager** > **New Connected App**
    - Fill in the required fields (Name, Email, etc.)
    - Enable OAuth Settings
    - Select "Enable OAuth Settings"
    - Set a callback URL (can be `https://localhost:8080/callback` if not using one)
    - Under "Selected OAuth Scopes", add:
        - Access and manage your data (api)
        - Access your basic information (id, profile, email, address, phone)
        - Perform requests on your behalf at any time (refresh_token, offline_access)
    - Save the application

2. **Get Client Credentials**:

    - After saving, navigate to **Manage** > **Edit Policies**
    - Set "OAuth Policies" > "Permitted Users" to "Admin approved users are pre-authorized"
    - Under "IP Relaxation", select "Relax IP restrictions"
    - Save the changes
    - Navigate to the **Manage Consumer Details** button to view your Client ID and Client Secret
    - Note down your Salesforce instance URL (e.g., `https://your-domain.my.salesforce.com`)

3. **Required Credentials**:
    - Client ID: From the connected app
    - Client Secret: From the connected app
    - Instance URL: Your exact Salesforce instance URL (e.g., `https://your-domain.my.salesforce.com`)

## Configuration in Answer Agent

Add your Salesforce credentials to Answer Agent's configuration:

### For OAuth 2.0 Client Credentials Flow:

```json
{
    "SALESFORCE_CONNECTION_TYPE": "OAuth_2.0_Client_Credentials",
    "SALESFORCE_CLIENT_ID": "your_client_id",
    "SALESFORCE_CLIENT_SECRET": "your_client_secret",
    "SALESFORCE_INSTANCE_URL": "https://your-domain.my.salesforce.com"
}
```

## Available Tools

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

### For Developers

1. **Schema Exploration**:

    ```
    "Describe the Lead object and show me all its fields"
    ```

2. **Data Querying**:

    ```
    "Find all opportunities closing this month with amount greater than $10,000"
    ```

3. **Code Analysis**:

    ```
    "Show me all Apex triggers related to the Account object"
    ```

4. **Testing New Features**:

    ```
    "Create a test Contact with first name 'John' and last name 'Doe'"
    ```

5. **Debugging**:
    ```
    "Enable finest debug logs for my user account for the next 30 minutes"
    ```

### For Publishers

1. **Documentation Research**:

    ```
    "Find all custom objects related to invoicing and describe their fields"
    ```

2. **Creating Examples**:

    ```
    "Create a simple Apex class that demonstrates how to query Accounts"
    ```

3. **Exploring Relationships**:

    ```
    "Show me how Accounts are related to Contacts and Opportunities"
    ```

4. **Finding Content Topics**:

    ```
    "What are all the picklist values for Lead Status?"
    ```

5. **Setting Up Demo Environments**:
    ```
    "Create a basic Project_Tracking__c custom object with Task__c and Status__c fields"
    ```

## Best Practices

1. **Permission Settings**: Ensure the credentials used have appropriate permissions for the operations you want to perform.

2. **Data Security**: Be cautious with DML operations (insert, update, delete) in production environments.

3. **Error Handling**: Pay attention to error messages which often contain specific details about what went wrong.

4. **Resource Usage**: Complex SOQL queries or operations on large data volumes should be monitored for performance impact.

5. **Test Environment**: When possible, use a sandbox environment for testing before executing operations in production.
