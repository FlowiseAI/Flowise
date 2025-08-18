---
description: Load data from a Contentful Space into AnswerAgentAI
---

# Contentful Document Loader

## Overview

The Contentful Document Loader is a powerful feature that allows you to import content from your Contentful space directly into AnswerAgentAI. This integration enables you to leverage your existing Contentful content within AnswerAgentAI, making it easier to create AI-powered applications using your own data.

## Key Benefits

-   Seamlessly import content from Contentful into AnswerAgentAI
-   Customize content retrieval based on your specific needs
-   Maintain your content in Contentful while utilizing it in AI applications

## How to Use

1. Connect your Contentful account:

    - Select "Connect Credential" and choose your Contentful Delivery API credentials.

2. Configure the loader:

    - Choose between Delivery API or Preview API.
    - Set up your Content Type configuration using the Config Utility.
    - Adjust additional parameters as needed (e.g., Environment ID, Include Levels, Limit).

3. Run the loader to import your Contentful content into AnswerAgentAI.

<!-- TODO: Add a screenshot of the Contentful Document Loader configuration interface -->
<figure><img src="/.gitbook/assets/screenshots/contentfuldocumentloader.png" alt="" /><figcaption><p> Contentful Document Loader Node Configuration &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use the Preview API during development to work with draft content.
2. Optimize performance by setting appropriate limits and include levels.
3. Utilize the Config Utility to fine-tune which content types and fields are imported.
4. Include field names in the output for better context in your AI applications.

## Troubleshooting

1. **Issue**: No content is being imported
   **Solution**: Verify that your API credentials are correct and that you have the necessary permissions in Contentful.

2. **Issue**: Unexpected content structure
   **Solution**: Review your Config Utility settings to ensure you're targeting the correct content types and fields.

3. **Issue**: Performance issues with large datasets
   **Solution**: Adjust the "Limit" parameter or use pagination to import data in smaller chunks.

## Advanced Configuration

### Config Utility

The Config Utility allows you to specify how content should be extracted from Contentful. Here's an example configuration:

```json
{
    "mainContentType": {
        "contentType": "blogPost",
        "fieldsToParse": ["title", "body", "author"]
    },
    "embeddedContentTypes": [
        {
            "contentType": "author",
            "fieldsToParse": ["name", "bio"]
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
        "urlPrefix": "https://mywebsite.com/"
    }
}
```

This configuration tells the loader to:

-   Focus on the "blogPost" content type
-   Parse specific fields from the main content type and embedded content types
-   Handle rich text fields and other embedded and related content
-   Generate citations using specified fields

### Search Query

You can use the "Search Query" parameter to filter the content you import. For example:

```json
{
    "content_type": "blogPost",
    "fields.category": "technology",
    "order": "-sys.createdAt"
}
```

This query would import only blog posts in the "technology" category, ordered by creation date (newest first).

By mastering these configuration options, you can tailor the Contentful Document Loader to fit your specific use case in AnswerAgentAI.
