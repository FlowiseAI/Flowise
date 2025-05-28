---
description: Load data from pre-configured document stores in AnswerAI
---

# Document Store

## Overview

The Document Store feature in AnswerAI allows you to load data from pre-configured document stores, also known as knowledge bases. This powerful tool enables you to group multiple document loaders together, creating a centralized repository of information that can be easily accessed and utilized within your AnswerAI workflows.

## Key Benefits

-   Centralized Data Management: Organize and access multiple documents from a single source.
-   Efficient Information Retrieval: Quickly load relevant data for your AI tasks.
-   Flexible Output Options: Choose between document objects or concatenated text output.

## How to Use

1. Add the Document Store node to your workflow.
2. Configure the node:
    - Select the desired document store from the "Select Store" dropdown.
3. Connect the Document Store node to other nodes in your workflow.
4. Run your workflow to load data from the selected document store.

<!-- TODO: Add a screenshot of the Document Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/documentstorenode.png.png" alt="" /><figcaption><p> Document Store Node Configuration  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

-   Organize your document stores logically to make finding and using the right information easier.
-   Use descriptive names for your document stores to quickly identify their contents.
-   Regularly update and maintain your document stores to ensure the most current information is available.
-   Combine document stores with other AnswerAI features for more complex data processing and AI tasks.

## Troubleshooting

-   If you don't see any document stores in the dropdown, ensure that you have created and synchronized at least one document store in your AnswerAI account.
-   If the loaded data is not what you expected, double-check that you've selected the correct document store and that its contents are up-to-date.
-   Ensure that when you add new content that you process it through the Document Store node to ensure it is added to the knowledge base.

## Additional Information

For more detailed information on how to use document stores (also referred to as knowledge bases), please refer to the full documentation available at [Document Stores](../../../sidekick-studio/documents/). This comprehensive guide will provide you with in-depth instructions on creating, managing, and optimizing your document stores within AnswerAI.

<!-- TODO: Add a screenshot showing the Document Store node connected in a workflow -->
<figure><img src="/.gitbook/assets/screenshots/documentstoreinaworkflow.png" alt="" /><figcaption><p> Document Store Node Configuration  &#x26; Drop UI</p></figcaption></figure>

Remember that document stores, or knowledge bases, are a core feature of AnswerAI, allowing you to efficiently manage and utilize large amounts of information across various AI-powered tasks and workflows.
