---
sidebar_position: 7
title: PostgreSQL MCP
description: Use PostgreSQL MCP to execute SQL queries against PostgreSQL databases
---

# PostgreSQL MCP for Answer Agent

This documentation outlines how to use the PostgreSQL Model Context Protocol (MCP) integration with Answer Agent. The MCP allows Answer Agent to interact with PostgreSQL databases, enabling query execution, data manipulation, and schema operations through natural language.

## Setting Up Credentials

To use the PostgreSQL MCP, you'll need to configure the following credentials:

### Obtaining Credentials

1. **Database Connection Details**:
    - PostgreSQL host (e.g., `localhost` or database server address)
    - Port (default: 5432)
    - Database name
    - Username
    - Password
    - SSL configuration (if needed)

### Configuration

You can provide these credentials in one of two ways:

1. **During conversation**: Answer Agent will prompt you for your credentials if not already configured.

2. **Via configuration file**: You can set up a permanent configuration by creating a file with:
    ```
    POSTGRES_HOST=your_host
    POSTGRES_PORT=5432
    POSTGRES_DB=your_database
    POSTGRES_USER=your_username
    POSTGRES_PASSWORD=your_password
    POSTGRES_SSL=true_or_false
    ```

> ⚠️ **Warning**: These credentials provide direct access to your database. Use a dedicated user with appropriate permissions for this integration, and never use a superuser account.

## Available Tools

The PostgreSQL MCP provides the following tools:

### query

Executes read-only SQL queries against the connected database.

-   **Input**: `sql` (string) - The SQL query to execute
-   **Security**: All queries are executed within a READ ONLY transaction

Example:

```sql
SELECT * FROM users WHERE active = true LIMIT 10;
```

## Resources

The PostgreSQL MCP server automatically provides schema information for each table in the database:

-   **Table Schemas** (`postgres://<host>/<table>/schema`)
    -   JSON schema information for each table
    -   Includes column names and data types
    -   Automatically discovered from database metadata

## Common Workflows

1. **Exploring Database Structure**:

    - Query the available tables and their schemas
    - Examine column types and relationships

2. **Data Analysis**:

    - Execute complex queries for data exploration
    - Join tables to create reports
    - Filter data based on specific conditions

3. **Troubleshooting**:
    - Identify data inconsistencies
    - Validate data integrity across tables

> **Note**: The PostgreSQL MCP provides read-only access to your database. For operations that modify data, you'll need to use a different solution.
