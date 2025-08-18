---
description: Load and process documents from Confluence in AnswerAgentAI
---

# Confluence Document Loader

## Overview

The Confluence Document Loader is a powerful feature in AnswerAgentAI that allows you to import and process documents from your Confluence workspace. This tool seamlessly integrates with your Confluence account, enabling you to leverage your existing knowledge base within AnswerAgentAI.

## Key Benefits

-   Easily import Confluence pages and spaces into AnswerAgentAI
-   Maintain up-to-date information by connecting directly to your Confluence workspace
-   Customize document processing with text splitting and metadata options

## How to Use

Follow these steps to use the Confluence Document Loader:

1. In the AnswerAgentAI interface, locate and select the Confluence Document Loader node.

2. Configure the following required settings:

    - Connect Credential: Choose the appropriate Confluence API credential (Cloud or Server/DC).
    - Base URL: Enter your Confluence base URL (e.g., `https://example.atlassian.net/wiki`.
    - Space Key: Provide the Confluence Space Key you want to import documents from.

3. (Optional) Configure additional settings:

    - Text Splitter: Select a text splitter to process the imported documents.
    - Limit: Set a maximum number of documents to import (0 for no limit).
    - Additional Metadata: Add custom metadata to the imported documents.
    - Omit Metadata Keys: Specify metadata keys to exclude from the imported documents.

4. Connect the Confluence Document Loader node to other nodes in your AnswerAgentAI workflow.

5. Run your workflow to import and process the Confluence documents.

<!-- TODO: Add a screenshot of the Confluence Document Loader node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/confluence.png" alt="" /><figcaption><p> Confluence Document Loader Node Configuration &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Use the Space Key carefully: Make sure you have the correct Space Key to import the desired documents. You can find the Space Key by following the [official Atlassian guide](https://community.atlassian.com/t5/Confluence-questions/How-to-find-the-key-for-a-space/qaq-p/864760).

2. Optimize performance: If you're working with a large Confluence space, consider using the "Limit" option to import a smaller subset of documents initially.

3. Customize metadata: Use the "Additional Metadata" option to add relevant information to your imported documents, making them easier to organize and search within AnswerAgentAI.

4. Text splitting: If you're working with large Confluence pages, use a Text Splitter to break them into smaller, more manageable chunks for processing.

## Troubleshooting

1. Connection issues:

    - Ensure your Confluence API credentials are correct and up-to-date.
    - Check that your Base URL is accurate and includes the full path to your Confluence instance.

2. No documents imported:

    - Verify that the Space Key is correct and that you have permission to access the specified space.
    - Check if there are any documents in the selected space.

3. Metadata problems:
    - If you're not seeing expected metadata, make sure you haven't accidentally omitted important keys using the "Omit Metadata Keys" option.
    - When adding custom metadata, ensure your JSON format is correct in the "Additional Metadata" field.

By following this guide, you'll be able to efficiently import and process your Confluence documents within AnswerAgentAI, enhancing your workflows with valuable information from your existing knowledge base.
