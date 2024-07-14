# Contentful Documentloader

## Overview

This component facilitates the integration of Contentful, a headless CMS, with Flowise, allowing users to easily configure how content is loaded and processed from their Contentful space.

## Configuration Process

### Step 1: Add Contentful Credentials

Before configuring the content loading, you need to add your Contentful credentials to Flowise:

1. Navigate to the Credentials section in Flowise.
2. Select "Add New Credential" and choose "Contentful Delivery API".
3. Fill in the following details:
   - Delivery Token: Your Contentful Delivery API token
   - Preview Token: Your Contentful Preview API token (optional)
   - Space ID: Your Contentful Space ID
4. Save the credentials.

### Step 2: Configure Contentful Loader

Once your credentials are set up, you can configure the Contentful loader:

1. In your Flowise workflow or document store loader, add a "Contentful" node.
2. Select the Contentful credentials you added in Step 1.
3. Use the Contentful Configuration Component to set up your content loading preferences.

## Contentful Loader Inputs

The Contentful loader in Flowise has several inputs that control how content is fetched and processed:

1. **Text Splitter**: (Optional) A TextSplitter instance to split long text content.
2. **API Type**: Choose between 'Delivery API' (default) or 'Preview API'.
3. **Config Utility**: The main configuration object (explained in detail below).
4. **Include Field Names**: (Optional) Boolean to include field names in the output.
5. **Environment ID**: (Optional) Contentful environment ID (default is 'master').
6. **Include Levels**: (Optional) Number of levels to include in the response.
7. **Include All**: (Optional) Boolean to include all entries in the response.
8. **Limit**: (Optional) Maximum number of items to return (default is 50).
9. **Search Query**: (Optional) JSON object for additional search parameters.

## Config Utility Structure

The Config Utility is a JSON object that defines how content should be loaded and processed. Here's an example structure with explanations:

```json
{
  "mainContentType": {
    "contentType": "blogPost",
    "fieldsToParse": ["fields.title", "fields.content", "fields.author"]
  },
  "embeddedContentTypes": [
    {
      "contentType": "author",
      "fieldsToParse": ["fields.name", "fields.bio"]
    },
    {
      "contentType": "category",
      "fieldsToParse": ["fields.name"]
    }
  ],
  "richTextParsingRules": {
    "embedded-asset-block": true,
    "embedded-entry-block": true,
    "embedded-entry-inline": true
  },
  "fieldsForCitation": {
    "titleField": "fields.title",
    "slugField": "fields.slug",
    "urlPrefix": "https://mywebsite.com/blog/"
  }
}
```

### Configuration Options Explained

1. **Main Content Type**:
   - `contentType`: The ID of your primary Contentful content type (e.g., "blogPost").
   - `fieldsToParse`: An array of fields from this content type to include in the output.

2. **Embedded Content Types**:
   - An array of objects, each representing a content type that might be embedded or referenced in your main content.
   - Each object has a `contentType` (the Contentful content type ID) and `fieldsToParse` (fields to include from this type).

3. **Rich Text Parsing Rules**:
   - Controls how rich text fields are parsed.
   - `embedded-asset-block`: If true, includes embedded assets (like images) in the output.
   - `embedded-entry-block`: If true, includes block-level embedded entries.
   - `embedded-entry-inline`: If true, includes inline embedded entries.

4. **Fields for Citation**:
   - Specifies which fields to use when generating citations or references.
   - `titleField`: The field to use as the title in citations.
   - `slugField`: The field to use for generating URLs.
   - `urlPrefix`: The base URL to prepend to slugs.

## Using the Configuration Component

The Contentful Configuration Component provides a user-friendly interface for setting up this configuration:

1. **Select Main Content Type**: Choose your primary content type from a dropdown of available types in your Contentful space.

2. **Choose Fields**: Select which fields from the main content type to include in your Flowise system.

3. **Configure Embedded Types**: Add and configure any embedded or referenced content types.

4. **Set Rich Text Rules**: Use toggles to control how rich text fields are parsed.

5. **Define Citation Fields**: Select fields for generating citations and set the URL prefix.

6. **Review and Save**: The component will generate the appropriate JSON configuration based on your selections.

## Output

The Contentful loader processes your content based on this configuration and outputs it as a collection of documents. Each document represents a single entry from your main content type, with embedded content and rich text fields processed according to your settings.

These documents can then be used by other components in your Flowise workflow, such as for training, querying, or generating responses in your RAG system.