---
sidebar_position: 1
title: AnswerAgent MCP
description: Use AnswerAgent MCP to manage chatflows, document stores, assistants, and tools
---

# AnswerAgent MCP for Answer Agent

This documentation outlines how to use the AnswerAgent Model Context Protocol (MCP) integration with Answer Agent. This MCP server provides comprehensive access to Answer AI's powerful features through standardized MCP tools, allowing you to manage chatflows, document stores, assistants, and more directly from your AI workflows.

## Overview

The AnswerAgent MCP server is a lightweight integration that exposes Answer AI's core functionality through the Model Context Protocol. It provides tools for:

- **Chatflow Management** - Create, update, and manage AI chatflows
- **Document Store Operations** - Manage knowledge bases and document collections
- **Assistant Management** - Create and configure AI assistants
- **Tool Management** - Create and manage custom tools
- **Document Loader Operations** - Handle document processing and chunking
- **Intelligent Analysis** - AI-powered analysis and optimization recommendations

## Zero Configuration Setup

**🎉 No Credentials Required!** 

When using the AnswerAgent MCP within the Answer Agent platform, no manual credential setup is required. The integration automatically:

- Uses your existing user account and permissions
- Accesses your organization's data securely
- Leverages your default API key from the database

### Prerequisites

- An active Answer AI account
- At least one active API key in your account

> ⚠️ **Important**: If you have deleted all your API keys, you must create a new one in the **API Keys** screen before using this MCP integration.

### How to Create an API Key

If you need to create an API key:

1. Navigate to your **Account Settings**
2. Go to **API Keys** section
3. Click **Create New API Key**
4. Give it a descriptive name
5. Save the key - it will be automatically used by the MCP integration

## Available Tools

The AnswerAgent MCP provides comprehensive tools organized by functionality:

### Chatflow Management

#### `create_chatflow`
Create new AI chatflows with custom configurations.

**Required inputs:**
- `name` (string): Name for the new chatflow

**Optional inputs:**
- `flowData` (string): JSON configuration for the chatflow

**Returns:** Created chatflow details including ID and configuration

#### `get_chatflow`
Retrieve detailed information about a specific chatflow.

**Required inputs:**
- `id` (string): Chatflow ID to retrieve

**Optional inputs:**
- `includeFullFlowData` (boolean): Include complete flow configuration

**Returns:** Chatflow details and configuration

#### `update_chatflow`
Update an existing chatflow's configuration or settings.

**Required inputs:**
- `id` (string): Chatflow ID to update
- `updates` (object): Update parameters

**Returns:** Updated chatflow information

#### `delete_chatflow`
Remove a chatflow from your workspace.

**Required inputs:**
- `id` (string): Chatflow ID to delete

**Returns:** Deletion confirmation

#### `list_chatflows`
Get a list of all available chatflows in your workspace.

**Returns:** Array of chatflows with basic information

### Document Store Management

#### `create_document_store`
Create a new document store for knowledge management.

**Required inputs:**
- `name` (string): Name for the document store

**Optional inputs:**
- `description` (string): Description of the store's purpose

**Returns:** Created document store details

#### `get_document_store`
Retrieve information about a specific document store.

**Required inputs:**
- `id` (string): Document store ID

**Returns:** Document store configuration and metadata

#### `delete_document_store`
Remove a document store and all its contents.

**Required inputs:**
- `id` (string): Document store ID to delete

**Returns:** Deletion confirmation

#### `list_document_stores`
List all document stores in your workspace.

**Returns:** Array of document stores with basic information

#### `query_vector_store`
Search for information within a document store using semantic search.

**Required inputs:**
- `storeId` (string): Document store ID to search
- `query` (string): Search query

**Returns:** Relevant documents and content matches

#### `upsert_document`
Add or update documents in a document store.

**Required inputs:**
- `id` (string): Document store ID
- `payload` (object): Document data and metadata

**Returns:** Document operation confirmation

#### `refresh_document_store`
Refresh and re-index all documents in a store.

**Required inputs:**
- `id` (string): Document store ID
- `payload` (object): Refresh configuration

**Returns:** Refresh operation status

### Assistant Management

#### `create_assistant`
Create a new AI assistant with custom configuration.

**Required inputs:**
- `details` (object): Assistant configuration including name, instructions, and capabilities

**Returns:** Created assistant information

#### `get_assistant`
Retrieve details about a specific assistant.

**Required inputs:**
- `id` (string): Assistant ID

**Returns:** Assistant configuration and metadata

#### `update_assistant`
Update an existing assistant's configuration.

**Required inputs:**
- `id` (string): Assistant ID to update
- `updates` (object): Update parameters

**Returns:** Updated assistant information

#### `delete_assistant`
Remove an assistant from your workspace.

**Required inputs:**
- `id` (string): Assistant ID to delete

**Returns:** Deletion confirmation

#### `list_assistants`
List all assistants in your workspace.

**Returns:** Array of assistants with basic information

### Tool Management

#### `create_tool`
Create a custom tool for use in chatflows.

**Required inputs:**
- `name` (string): Tool name

**Optional inputs:**
- `description` (string): Tool description and purpose

**Returns:** Created tool details

#### `get_tool`
Retrieve information about a specific tool.

**Required inputs:**
- `id` (string): Tool ID

**Returns:** Tool configuration and metadata

#### `update_tool`
Update an existing tool's configuration.

**Required inputs:**
- `id` (string): Tool ID to update
- `updates` (object): Update parameters

**Returns:** Updated tool information

#### `delete_tool`
Remove a tool from your workspace.

**Required inputs:**
- `id` (string): Tool ID to delete

**Returns:** Deletion confirmation

#### `list_tools`
List all available tools in your workspace.

**Returns:** Array of tools with basic information

### Document Loader Operations

#### `get_loader_chunks`
Retrieve document chunks from a specific loader.

**Required inputs:**
- `storeId` (string): Document store ID
- `loaderId` (string): Loader ID
- `pageNo` (string): Page number for pagination

**Returns:** Document chunks and metadata

#### `update_loader_chunk`
Update a specific document chunk.

**Required inputs:**
- `storeId` (string): Document store ID
- `loaderId` (string): Loader ID
- `chunkId` (string): Chunk ID to update
- `payload` (object): Update data

**Returns:** Update confirmation

#### `delete_loader_chunk`
Remove a specific document chunk.

**Required inputs:**
- `storeId` (string): Document store ID
- `loaderId` (string): Loader ID
- `chunkId` (string): Chunk ID to delete

**Returns:** Deletion confirmation

#### `delete_loader`
Remove an entire document loader.

**Required inputs:**
- `storeId` (string): Document store ID
- `loaderId` (string): Loader ID to delete

**Returns:** Deletion confirmation

## Intelligent Prompts

The AnswerAgent MCP includes AI-powered prompts for advanced analysis and management:

### `analyze_chatflow`
Get intelligent analysis and optimization recommendations for your chatflows.

**Required inputs:**
- `chatflowId` (string): The chatflow ID to analyze

**Optional inputs:**
- `focusAreas` (array): Specific areas to focus analysis on (e.g., "performance", "accuracy", "cost")

**Returns:** Comprehensive analysis with actionable recommendations

### `analyze_document_store`
Analyze document store configuration, usage patterns, and optimization opportunities.

**Required inputs:**
- `documentStoreId` (string): The document store ID to analyze

**Optional inputs:**
- `focusAreas` (array): Specific analysis focus areas

**Returns:** Detailed analysis with optimization suggestions

### `manage_document_store`
Get step-by-step guidance for complex document store operations.

**Required inputs:**
- `action` (string): Operation type - "setup", "optimize", "troubleshoot", or "migrate"

**Optional inputs:**
- `documentStoreId` (string): Target document store ID
- `context` (string): Additional context for the operation

**Returns:** Detailed guidance and recommended steps

## Usage Examples

### Creating and Managing Chatflows

```
"Create a new chatflow called 'Customer Support Bot' for handling customer inquiries"

"Analyze my 'Sales Assistant' chatflow and suggest performance improvements"

"List all my chatflows and show me which ones haven't been used recently"
```

### Document Store Operations

```
"Create a document store called 'Product Documentation' and add my PDF user manuals"

"Search my 'Customer Contracts' document store for information about payment terms"

"Help me troubleshoot why my document store isn't returning relevant results"
```

### Assistant Management

```
"Create an assistant specialized in code review with access to my development documentation"

"Update my 'Research Assistant' to include the latest OpenAI model"

"Show me all my assistants and their current configurations"
```

### Advanced Analysis

```
"Analyze my 'Technical Support' chatflow and focus on response accuracy and user satisfaction"

"Give me guidance on optimizing my document store for better search performance"

"Help me set up a new document store for legal documents with proper access controls"
```

## Best Practices

### Chatflow Management
- Use descriptive names for chatflows that reflect their purpose
- Regularly analyze chatflows for optimization opportunities
- Keep chatflow configurations backed up by exporting them

### Document Store Organization
- Organize documents into logical stores by topic or department
- Use descriptive names and descriptions for easy identification
- Regularly refresh document stores to keep content current

### Security Considerations
- The MCP integration respects your existing permissions and access controls
- All operations are logged and auditable through your Answer AI instance
- Document stores maintain the same security boundaries as your account

## Troubleshooting

### Common Issues

#### "Unable to retrieve user API key from database"
**Solution:** You need to create an API key in your account:
1. Go to **Account Settings** → **API Keys**
2. Click **Create New API Key**
3. Give it a descriptive name and save

#### "API_HOST environment variable is not set"
**Solution:** This indicates a platform configuration issue. Contact your system administrator.

#### "No Available Actions" in the tool selection
**Solutions:**
1. Check that you have active API keys in your account
2. Refresh the tool configuration
3. Verify your account permissions

#### Permission Denied Errors
**Solutions:**
1. Verify you have the necessary permissions for the operation
2. Check that you're working within your organization's scope
3. Ensure your API key has sufficient privileges

### Getting Help

If you continue to experience issues:

1. Check the **API Keys** section in your account settings
2. Review your account permissions with your administrator
3. Contact support with specific error messages

## External Usage

While this documentation focuses on platform usage, the AnswerAgent MCP server is also available as a standalone package that can be used with external MCP clients like Claude Desktop, Cursor IDE, and others. For external usage, you would need to:

1. Install via npm: `npm install -g @answerai/answeragent-mcp`
2. Configure with your API base URL and JWT token
3. Use with your preferred MCP-compatible client

See the [npm package documentation](https://www.npmjs.com/package/@answerai/answeragent-mcp) for external setup instructions. 