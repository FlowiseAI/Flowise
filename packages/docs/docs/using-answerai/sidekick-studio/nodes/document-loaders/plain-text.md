---
description: Load and process plain text data in AnswerAI
---

# Plain Text Document Loader

## Overview

The Plain Text Document Loader is a versatile feature in AnswerAI that allows you to load and process plain text data. This tool is particularly useful for importing text content into your workflows, splitting it into manageable chunks, and adding metadata to your documents.

## Key Benefits

-   Easily import and process plain text data
-   Customize text splitting for optimal processing
-   Add and manage metadata for your documents
-   Ideal for creating dynamic, variable-driven workflows

## How to Use

1. Navigate to the Document Loaders section in AnswerAI.
2. Select the "Plain Text" loader.
3. Enter your text in the "Text" field.
4. (Optional) Configure a Text Splitter if you want to split your text into smaller chunks.
5. (Optional) Add additional metadata in JSON format.
6. (Optional) Specify metadata keys to omit, if needed.
7. Choose the desired output format (Document or Text).
8. Connect the loader to other nodes in your workflow.

<!-- TODO: Screenshot of the Plain Text Document Loader configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/plain text node.png" alt="" /><figcaption><p> Plain text Node  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use Text Splitters: For long texts, consider using a Text Splitter to break the content into more manageable chunks. This can improve processing efficiency and enable more granular analysis.

2. Leverage Metadata: Take advantage of the additional metadata feature to enrich your documents with extra information. This can be useful for categorization, filtering, or providing context to your AI models.

3. Variables in Sidekick Workflows: The Plain Text loader is excellent for incorporating variables into your sidekick workflows. This allows you to create dynamic, flexible workflows that can adapt to different inputs.

    Example:
    Let's say you want to create a workflow that generates a personalized email. You can use the Plain Text loader to input variables like the recipient's name, company, and specific details:

    ```

    {
      "recipientName": "John Doe",
      "companyName": "Acme Corp",
      "productName": "WidgetPro 2000"
    }

    ```

    Then, in a subsequent Prompt Template node, you can use these variables:

    ```

    Dear {{recipientName}},

    I hope this email finds you well. I wanted to reach out to you about our latest product, the {{productName}}, which I believe could be a great fit for {{companyName}}.

    [Rest of the email template...]

    ```

    This approach allows you to reuse the same workflow for different recipients and products, making your sidekick more versatile and efficient.

<!-- TODO: Screenshot showing the connection between a Plain Text loader (with variables) and a Prompt Template node -->
<figure><img src="/.gitbook/assets/screenshots/plaintextwithprompt.png" alt="" /><figcaption><p> Plain text Node Connection with prompt template  &#x26; Drop UI</p></figcaption></figure>

<figure><img src="/.gitbook/assets/screenshots/plaintextin a workflow.png" alt="" /><figcaption><p> Plain text Node Connection In a Workflow  &#x26; Drop UI</p></figcaption></figure>

4. Omit Unnecessary Metadata: Use the "Omit Metadata Keys" feature to remove any default metadata that isn't relevant to your use case. This keeps your documents clean and focused on the information you need.

## Troubleshooting

1. Text Not Splitting Correctly: If your text isn't splitting as expected, double-check your Text Splitter configuration. Adjust parameters like chunk size or overlap to fine-tune the splitting process.

2. Metadata Not Appearing: Ensure that your additional metadata is in valid JSON format. If you're not seeing expected metadata, verify that you haven't accidentally omitted it using the "Omit Metadata Keys" feature.

3. Output Format Issues: If you're not getting the output type you expect (Document vs. Text), make sure you've selected the correct output in the node configuration.

4. If you are using a Plain Text loader as a variable, be sure to select Text as the output type and not Document or you will receive a JSON error

By mastering the Plain Text Document Loader, you can efficiently import, process, and enrich text data in your AnswerAI workflows, enabling more dynamic and powerful AI-driven applications.
