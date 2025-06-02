---
sidebar_position: 5
title: Confluence MCP
description: Use Confluence MCP to query and update Confluence pages
---

# Confluence MCP Documentation

## Introduction

Confluence MCP (Model Context Protocol) provides a standardized interface for AI assistants to interact with Confluence content. This integration enables Answer Agent to seamlessly search, create, update, and manage Confluence pages, comments, and attachments.

## Setting Up Credentials

To use the Confluence MCP, you'll need to set up the following credentials:

### Required Credentials

| Credential              | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| `CONFLUENCE_API_TOKEN`  | Your Atlassian API token                                                    |
| `CONFLUENCE_BASE_URL`   | Your Confluence instance URL (e.g., https://your-domain.atlassian.net/wiki) |
| `CONFLUENCE_USER_EMAIL` | The email associated with your Atlassian account                            |

### How to Get Your API Token

1. Log in to your Atlassian account at [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Enter a label for your token (e.g., "Answer Agent Integration")
4. Click "Create"
5. Copy the token (you won't be able to see it again)

## Available Tools

### get_page

Retrieves a specific Confluence page by its ID.

**Schema:**

```json
{
    "pageId": {
        "type": "string",
        "description": "ID of the Confluence page to retrieve",
        "required": true
    },
    "format": {
        "type": "string",
        "enum": ["text", "markdown"],
        "description": "Format to return the content in (default: text)",
        "required": false
    },
    "includeMarkup": {
        "type": "boolean",
        "description": "Whether to include the original Confluence Storage Format (XHTML) markup in the response (default: false). Useful when you want to update the page later in order to preserve formatting.",
        "required": false
    }
}
```

### search_pages

Searches for Confluence pages using CQL (Confluence Query Language).

**Schema:**

```json
{
    "query": {
        "type": "string",
        "description": "CQL search query",
        "required": true
    },
    "limit": {
        "type": "number",
        "description": "Maximum number of results to return (default: 10)",
        "required": false
    },
    "format": {
        "type": "string",
        "enum": ["text", "markdown"],
        "description": "Format to return the content in (default: text)",
        "required": false
    },
    "includeMarkup": {
        "type": "boolean",
        "description": "Whether to include the original Confluence Storage Format (XHTML) markup in the response (default: false)",
        "required": false
    }
}
```

### get_spaces

Lists all available Confluence spaces.

**Schema:**

```json
{
    "limit": {
        "type": "number",
        "description": "Maximum number of spaces to return (default: 50)",
        "required": false
    }
}
```

### create_page

Creates a new Confluence page.

**Schema:**

```json
{
    "spaceKey": {
        "type": "string",
        "description": "Key of the space where the page will be created",
        "required": true
    },
    "title": {
        "type": "string",
        "description": "Title of the new page",
        "required": true
    },
    "content": {
        "type": "string",
        "description": "Content of the page in Confluence Storage Format (XHTML)",
        "required": true
    },
    "parentId": {
        "type": "string",
        "description": "Optional ID of the parent page",
        "required": false
    }
}
```

### update_page

Updates an existing Confluence page.

**Schema:**

```json
{
    "pageId": {
        "type": "string",
        "description": "ID of the page to update",
        "required": true
    },
    "title": {
        "type": "string",
        "description": "New title of the page",
        "required": true
    },
    "content": {
        "type": "string",
        "description": "New content in Confluence Storage Format (XHTML). CRITICAL: Content MUST be valid XHTML. Providing plain text or Markdown will result in the markup being displayed literally, not rendered as rich text.",
        "required": true
    },
    "version": {
        "type": "number",
        "description": "Current version number of the page",
        "required": true
    }
}
```

### get_comments

Retrieves comments for a specific Confluence page.

**Schema:**

```json
{
    "pageId": {
        "type": "string",
        "description": "ID of the page to retrieve comments for",
        "required": true
    },
    "format": {
        "type": "string",
        "enum": ["text", "markdown"],
        "description": "Format to return comment content in (default: text)",
        "required": false
    },
    "limit": {
        "type": "number",
        "description": "Maximum number of comments to return (default: 25)",
        "required": false
    }
}
```

### add_comment

Adds a comment to a Confluence page.

**Schema:**

```json
{
    "pageId": {
        "type": "string",
        "description": "ID of the page to add the comment to",
        "required": true
    },
    "content": {
        "type": "string",
        "description": "Comment content in Confluence Storage Format (XHTML)",
        "required": true
    },
    "parentId": {
        "type": "string",
        "description": "Optional ID of the parent comment for threading",
        "required": false
    }
}
```

### get_attachments

Retrieves attachments for a specific Confluence page.

**Schema:**

```json
{
    "pageId": {
        "type": "string",
        "description": "ID of the page to retrieve attachments for",
        "required": true
    },
    "limit": {
        "type": "number",
        "description": "Maximum number of attachments to return (default: 25)",
        "required": false
    }
}
```

### add_attachment

Adds an attachment to a Confluence page.

**Schema:**

```json
{
    "pageId": {
        "type": "string",
        "description": "ID of the page to attach the file to",
        "required": true
    },
    "filename": {
        "type": "string",
        "description": "Desired filename for the attachment",
        "required": true
    },
    "fileContentBase64": {
        "type": "string",
        "description": "Base64 encoded content of the file",
        "required": true
    },
    "comment": {
        "type": "string",
        "description": "Optional comment for the attachment version",
        "required": false
    }
}
```

## CQL (Confluence Query Language) Reference

When using the `search_pages` tool, you can leverage CQL to create powerful queries:

```
# Basic syntax
field operator value

# Examples
space = "Engineering"
title ~ "Meeting Notes"
label = documentation
created >= 2023-01-01
```

Common CQL fields:

-   `space`: Space key
-   `title`: Page title
-   `label`: Labels attached to content
-   `text`: Full-text search across all content
-   `created`/`lastmodified`: Date fields
-   `creator`/`contributor`: People who created or edited content

## Use Cases

### For Developers

1. **Documentation Management**

    - Search for technical documentation across multiple spaces
    - Update API documentation programmatically when new endpoints are added
    - Pull code snippets from Confluence to include in developer resources

2. **Project Tracking**

    - Create sprint planning pages automatically
    - Update project status pages with real-time information
    - Attach build reports and metrics to project pages

3. **Team Collaboration**
    - Add comments to design documents during code reviews
    - Create and update architecture decision records
    - Maintain a knowledge base of technical solutions

### For Publishers

1. **Content Creation**

    - Create new articles and knowledge base entries
    - Update existing content with fresh information
    - Organize content hierarchically across spaces

2. **Content Discovery**

    - Search for existing content to avoid duplication
    - Find related articles to link between pages
    - Identify gaps in documentation

3. **Content Management**

    - Track comments and discussions on published articles
    - Manage attachments and supplementary materials
    - Monitor content versions and update histories

4. **Workflow Integration**
    - Create templates for consistent content creation
    - Set up automated publishing processes
    - Track content review cycles

## Best Practices

1. **Working with XHTML Content**

    - Always use the Confluence Storage Format (XHTML) when creating or updating pages
    - Use `includeMarkup: true` when retrieving pages you plan to update
    - Test complex formatting in Confluence first before programmatic creation

2. **Optimizing Searches**

    - Use specific CQL queries to reduce result sets
    - Include space restrictions where possible (`space = "KEY"`)
    - Use label searches for categorized content

3. **Managing Page Versions**

    - Always include the correct current version when updating pages
    - Retrieve the current page before updating to ensure version accuracy
    - Handle version conflicts gracefully

4. **Handling Attachments**
    - Keep attachment file sizes reasonable
    - Use descriptive filenames for better searchability
    - Add comments to attachments to describe their purpose
