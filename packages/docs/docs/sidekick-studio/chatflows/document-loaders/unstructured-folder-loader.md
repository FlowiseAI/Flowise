---
description: Load and process documents from a folder using Unstructured.io
---

# Unstructured Folder Loader

## Overview

The Unstructured Folder Loader is a powerful feature in AnswerAgentAI that allows you to load and process documents from a specified folder using Unstructured.io. This tool is particularly useful for extracting and structuring data from various file types, making it easier to work with large volumes of unstructured documents.

## Key Benefits

-   Process multiple documents from a single folder
-   Support for various file formats (e.g., PDF, DOCX, TXT)
-   Customizable options for document processing and chunking

## How to Use

1. In the AnswerAgentAI interface, locate and select the "Unstructured Folder Loader" node.

2. Configure the following required settings:

    - Folder Path: Enter the path to the folder containing your documents.
    - Unstructured API URL: Provide the URL for the Unstructured API (default: `http://localhost:8000/general/v0/general`.

3. (Optional) Connect your Unstructured API credentials if you're using the hosted version.

4. Adjust additional settings as needed:

    - Strategy: Choose between "Hi-Res," "Fast," "OCR Only," or "Auto" (default: Auto).
    - Encoding: Specify the encoding method (default: utf-8).
    - Skip Infer Table Types: Select file types to skip table extraction.
    - Hi-Res Model Name: Choose the inference model for hi-res strategy.
    - Chunking Strategy: Select "None" or "By Title" for document chunking.

5. Configure any other optional parameters to fine-tune the document processing.

6. Connect the Unstructured Folder Loader node to other nodes in your AnswerAgentAI workflow.

7. Run your workflow to process the documents in the specified folder.

## Tips and Best Practices

1. Organize your documents in a dedicated folder for easier management.
2. Start with the default settings and adjust as needed for optimal results.
3. Use the "Skip Infer Table Types" option to improve processing speed for documents without tables.
4. Experiment with different chunking strategies to find the best approach for your specific use case.
5. Add custom metadata to enrich your processed documents for better searchability and context.

## Troubleshooting

1. If documents fail to load, ensure that the folder path is correct and accessible.
2. Verify that the Unstructured API URL is correct and the service is running.
3. For issues with specific file types, check if they are supported by the current version of Unstructured.io.
4. If processing is slow, try adjusting the strategy or using a faster hi-res model.

<!-- TODO: Add a screenshot of the Unstructured Folder Loader node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/unstructuredfolderloader.png" alt="" /><figcaption><p> Unstructured Folder Loader Configuration   &#x26; Drop UI</p></figcaption></figure>

Remember to keep your Unstructured.io installation up-to-date for the best performance and compatibility with various file types. For more information on Unstructured.io and its capabilities, visit the [official documentation](https://unstructured-io.github.io/unstructured/introduction.html).
