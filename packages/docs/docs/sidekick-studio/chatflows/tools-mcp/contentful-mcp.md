---
sidebar_position: 2
title: Contentful MCP
description: Use Contentful MCP to manage content in Contentful CMS
---

# Contentful MCP for Answer Agent

This documentation outlines how to use the Contentful Model Context Protocol (MCP) integration with Answer Agent. The MCP allows Answer Agent to interact with Contentful's Content Management API, enabling content creation, management, and publishing through natural language.

## Setting Up Credentials

To use the Contentful MCP, you'll need to configure the following credentials:

### Obtaining Credentials

1. **Contentful Management Token**:

    - Log in to your Contentful account at [https://app.contentful.com/](https://app.contentful.com/)
    - Go to Settings → API Keys → Content management tokens
    - Create a new Personal Access Token with a descriptive name
    - Copy the token immediately (it will only be shown once)

2. **Space ID**:

    - This is found in the URL when you're in your Contentful space: `https://app.contentful.com/spaces/{SPACE_ID}/...`
    - Or go to Settings → General Settings where you'll see your Space ID

3. **Environment ID**:
    - Default is `master` if you haven't created custom environments
    - For custom environments, you can find them in Settings → Environments

### Configuration

You can provide these credentials in one of two ways:

1. **During conversation**: Answer Agent will prompt you for your credentials if not already configured.

2. **Via configuration file**: You can set up a permanent configuration by creating a file with:
    ```
    CONTENTFUL_MANAGEMENT_ACCESS_TOKEN=your_token_here
    SPACE_ID=your_space_id
    ENVIRONMENT_ID=your_environment_id (defaults to 'master')
    ```

> ⚠️ **Warning**: The management token has full access to create, modify, and delete content. Consider creating a dedicated token with appropriate permissions for this integration.

## Available Tools

The Contentful MCP provides tools across four main categories:

### Entry Management Tools

These tools allow you to work with content entries in Contentful.

#### search_entries

Search for entries using query parameters.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space (optional if configured)",
    "environmentId": "ID of environment (defaults to 'master')",
    "query": {
        "content_type": "Filter by content type ID",
        "select": "Fields to include in response",
        "limit": "Maximum entries to return (max: 3)",
        "skip": "Number of entries to skip (for pagination)",
        "order": "Field to order results by",
        "query": "Full-text search query"
    }
}
```

**Use Cases**:

-   Developers: Query entries for integration testing or debugging
-   Publishers: Find specific content by title, author, or status

#### create_entry

Create a new entry in Contentful.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "contentTypeId": "ID of the content type for this entry",
    "fields": {
        "fieldName": {
            "en-US": "Field value in English"
        }
    }
}
```

**Use Cases**:

-   Developers: Seed content programmatically
-   Publishers: Create draft entries from templates or structured data

#### get_entry

Retrieve details of a specific entry.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "entryId": "ID of the entry to retrieve"
}
```

**Use Cases**:

-   Developers: Inspect entry structure and relationships
-   Publishers: View complete entry details including metadata

#### update_entry

Update an existing entry.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "entryId": "ID of the entry to update",
    "fields": {
        "fieldName": {
            "en-US": "Updated field value"
        }
    }
}
```

**Use Cases**:

-   Developers: Fix incorrect data or update placeholders
-   Publishers: Edit content or update metadata fields

#### delete_entry

Delete an entry from Contentful.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "entryId": "ID of the entry to delete"
}
```

**Use Cases**:

-   Developers: Remove test entries
-   Publishers: Delete outdated or duplicate content

#### publish_entry

Publish an entry, making it available in the delivery API.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "entryId": "ID of the entry to publish"
}
```

**Use Cases**:

-   Developers: Promote test content to production
-   Publishers: Make new or updated content available to the public

#### unpublish_entry

Unpublish an entry, removing it from the delivery API.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "entryId": "ID of the entry to unpublish"
}
```

**Use Cases**:

-   Developers: Demote content during testing
-   Publishers: Take down content temporarily while maintaining draft version

### Asset Management Tools

These tools help you manage media files and binary assets in Contentful.

#### list_assets

List assets in a space with pagination.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "limit": "Maximum assets to return (max: 3)",
    "skip": "Number of assets to skip (for pagination)"
}
```

**Use Cases**:

-   Developers: Audit asset usage and organization
-   Publishers: Browse available media assets

#### upload_asset

Upload a new asset to Contentful.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "title": "Title of the asset",
    "description": "Description of the asset (optional)",
    "file": {
        "upload": "URL of the file to upload",
        "fileName": "Name of the file",
        "contentType": "MIME type of the file"
    }
}
```

**Use Cases**:

-   Developers: Programmatically upload assets during content migration
-   Publishers: Add new images, documents, or media files

#### get_asset

Retrieve details of a specific asset.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "assetId": "ID of the asset to retrieve"
}
```

**Use Cases**:

-   Developers: Get asset URLs and metadata for integration
-   Publishers: Check asset details and versions

#### update_asset

Update an asset's metadata or file.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "assetId": "ID of the asset to update",
    "title": "Updated title (optional)",
    "description": "Updated description (optional)",
    "file": {
        "url": "URL of the new file (optional)",
        "fileName": "Name of the new file (required if updating file)",
        "contentType": "MIME type of the new file (required if updating file)"
    }
}
```

**Use Cases**:

-   Developers: Update asset metadata programmatically
-   Publishers: Replace outdated assets or fix metadata

#### delete_asset

Delete an asset from Contentful.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "assetId": "ID of the asset to delete"
}
```

**Use Cases**:

-   Developers: Clean up unused test assets
-   Publishers: Remove outdated or unnecessary media

#### publish_asset

Publish an asset, making it available in the delivery API.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "assetId": "ID of the asset to publish"
}
```

**Use Cases**:

-   Developers: Make assets available to frontend applications
-   Publishers: Publish images and files alongside related content

#### unpublish_asset

Unpublish an asset, removing it from the delivery API.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "assetId": "ID of the asset to unpublish"
}
```

**Use Cases**:

-   Developers: Remove asset from production during testing
-   Publishers: Take down assets that should no longer be publicly accessible

### Content Type Management Tools

These tools allow you to manage the structure and schema of your content.

#### list_content_types

List all content types in a space.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "limit": "Maximum content types to return (max: 10)",
    "skip": "Number of content types to skip (for pagination)"
}
```

**Use Cases**:

-   Developers: Explore content model for integration planning
-   Publishers: Review available content types before creating entries

#### get_content_type

Get detailed information about a specific content type.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "contentTypeId": "ID of the content type to retrieve"
}
```

**Use Cases**:

-   Developers: Inspect field definitions and validations
-   Publishers: Check required fields and content structure

#### get_editor_interface

Get the editor interface configuration for a content type.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "contentTypeId": "ID of the content type"
}
```

**Use Cases**:

-   Developers: Understand UI configuration for content editing
-   Publishers: Learn how fields are presented in the Contentful editor

#### update_editor_interface

Update the editor interface configuration for a content type.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "contentTypeId": "ID of the content type",
    "editorInterface": {
        "controls": [
            {
                "fieldId": "fieldName",
                "widgetId": "widgetType",
                "widgetNamespace": "namespace"
            }
        ]
    }
}
```

**Use Cases**:

-   Developers: Customize the editing experience for content creators
-   Publishers: Configure specialized editors for specific field types

#### create_content_type

Create a new content type in Contentful.

**Schema**:

```json
{
  "spaceId": "ID of your Contentful space",
  "environmentId": "ID of environment",
  "name": "Name of the content type",
  "fields": [
    {
      "id": "fieldId",
      "name": "Field Name",
      "type": "Field Type (Symbol, Text, Integer, etc.)",
      "required": true/false,
      "localized": true/false
    }
  ],
  "description": "Description of the content type",
  "displayField": "Field ID to use as display field"
}
```

**Use Cases**:

-   Developers: Set up content models programmatically
-   Publishers: Create new content structures for specific projects

#### update_content_type

Update an existing content type.

**Schema**:

```json
{
  "spaceId": "ID of your Contentful space",
  "environmentId": "ID of environment",
  "contentTypeId": "ID of the content type to update",
  "name": "Updated name",
  "fields": [
    {
      "id": "fieldId",
      "name": "Updated Field Name",
      "type": "Field Type",
      "required": true/false
    }
  ],
  "description": "Updated description",
  "displayField": "Updated display field"
}
```

**Use Cases**:

-   Developers: Evolve content models as requirements change
-   Publishers: Add or modify fields to accommodate new content needs

#### delete_content_type

Delete a content type from Contentful.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "contentTypeId": "ID of the content type to delete"
}
```

**Use Cases**:

-   Developers: Remove experimental or deprecated content types
-   Publishers: Clean up unused content models

#### publish_content_type

Publish a content type, making its changes available.

**Schema**:

```json
{
    "spaceId": "ID of your Contentful space",
    "environmentId": "ID of environment",
    "contentTypeId": "ID of the content type to publish"
}
```

**Use Cases**:

-   Developers: Apply content model changes after updates
-   Publishers: Make new fields or validations available for content creation

### Space & Environment Management Tools

These tools help you manage spaces and environments in Contentful.

> Note: These tools are only available if the Space ID and Environment ID are not pre-configured.

#### list_spaces

List all available Contentful spaces.

**Schema**:

```json
{}
```

**Use Cases**:

-   Developers: Discover available spaces for integration
-   Publishers: Navigate between multiple content spaces

#### get_space

Get details of a specific space.

**Schema**:

```json
{
    "spaceId": "ID of the space to retrieve"
}
```

**Use Cases**:

-   Developers: Get space configuration and metadata
-   Publishers: Check space settings and organization

#### list_environments

List all environments in a space.

**Schema**:

```json
{
    "spaceId": "ID of the space to list environments from"
}
```

**Use Cases**:

-   Developers: Identify available environments for deployment
-   Publishers: Check available environments for content staging

#### create_environment

Create a new environment in a space.

**Schema**:

```json
{
    "spaceId": "ID of the space",
    "environmentId": "ID for the new environment",
    "name": "Name of the new environment"
}
```

**Use Cases**:

-   Developers: Set up new environments for testing or staging
-   Publishers: Create separate environments for content preparation

#### delete_environment

Delete an environment from a space.

**Schema**:

```json
{
    "spaceId": "ID of the space",
    "environmentId": "ID of the environment to delete"
}
```

**Use Cases**:

-   Developers: Clean up temporary testing environments
-   Publishers: Remove obsolete staging environments

## Best Practices

1. **Start with exploration**: Use `list_content_types` to understand the content model before creating entries.

2. **Content type first**: Always check a content type's structure with `get_content_type` before creating entries.

3. **Pagination awareness**: List operations return a maximum of 3-10 items per request. Use the `skip` parameter to navigate through paginated results.

4. **Always provide complete fields**: When updating entries, include all fields, not just the ones you're changing.

5. **Environment isolation**: Consider creating a dedicated environment for Answer Agent to work in before applying changes to production.

6. **Space-specific organization**: When working with multiple spaces, make it explicit which space you're targeting in your requests.

7. **Asset management**: Remember to publish assets after uploading them to make them available in the delivery API.

## Common Workflows

### Creating and Publishing Content

1. Find the content type ID using `list_content_types`
2. Get the content type details with `get_content_type`
3. Create an entry with `create_entry`
4. Publish the entry with `publish_entry`

### Adding Media to Content

1. Upload an asset with `upload_asset`
2. Publish the asset with `publish_asset`
3. Update an entry to reference the asset with `update_entry`
4. Publish the updated entry with `publish_entry`

### Content Model Updates

1. Get the current content type with `get_content_type`
2. Update the content type with `update_content_type`
3. Publish the content type with `publish_content_type`
