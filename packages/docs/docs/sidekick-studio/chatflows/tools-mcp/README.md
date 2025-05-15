---
title: Tools - MCP
description: Model Context Protocol integrations for Answer Agent
---

# Tools - MCP

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is an open standard allows models like OpenAI, Anthropic, Google, and Answer Agent to interact with external systems through standardized interfaces. MCP servers act as intermediaries that translate natural language requests into API calls, allowing models to:

1. **Query and manipulate data** in various systems
2. **Create and manage content** in CMS platforms
3. **Interact with productivity tools** like Jira and Slack
4. **Perform searches** across different data sources
5. **Execute database operations** securely

MCP servers follow a standardized protocol for exposing tools and handling requests, making it easy to add new integrations to Answer Agent.

## Available MCP Integrations

Answer Agent includes the following MCP integrations:

-   [Contentful](./contentful-mcp.md) - Manage content in Contentful CMS
-   [Salesforce](./salesforce-mcp.md) - Interact with Salesforce CRM and database
-   [Jira](./jira-mcp.md) - Work with Jira issues and projects
-   [Slack](./slack-mcp.md) - Send messages and interact with Slack
-   [Confluence](./confluence-mcp.md) - Query and update Confluence pages
-   [GitHub](./github-mcp.md) - Manage repositories, issues, and pull requests
-   [PostgreSQL](./postgresql-mcp.md) - Execute SQL queries against PostgreSQL databases
-   [BraveSearch](./bravesearch-mcp.md) - Perform internet searches using Brave Search
-   [Custom MCP](./custom-mcp.md) - Create custom integrations for proprietary systems

Each MCP integration provides specialized tools for working with its respective system. Click on an integration to learn more about its capabilities and how to use it.

## Common MCP Features

Most MCP integrations share these common features:

-   **Authentication** - Secure connection to external systems
-   **Content Creation** - Creating new records or documents
-   **Content Management** - Updating and deleting existing content
-   **Querying** - Searching and retrieving data
-   **Specialized Operations** - System-specific actions like publishing or workflow changes

## Getting Started

To use an MCP integration, you'll need:

1. **Credentials** for the external system
2. **Configuration details** like server URLs or project IDs
3. **Appropriate permissions** for the operations you want to perform

Refer to each integration's documentation for specific setup instructions.
