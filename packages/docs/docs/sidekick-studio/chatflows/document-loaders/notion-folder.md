---
description: Load and process documents from exported Notion folders
---

# Notion Folder Document Loader

## Overview

The Notion Folder Document Loader is a powerful feature in AnswerAgentAI that allows you to import and process content from exported Notion folders. This tool is perfect for users who want to leverage their Notion content within AnswerAgentAI for various natural language processing tasks.

## Key Benefits

-   Easily import content from Notion into AnswerAgentAI
-   Process and split large Notion documents for improved handling
-   Customize metadata for better organization and searchability

## How to Use

1. Export your Notion content:

    - In Notion, select the pages you want to export
    - Choose "Export" from the menu and select your preferred format
    - Download and unzip the exported folder

2. Configure the Notion Folder Document Loader in AnswerAgentAI:

    - Navigate to the Document Loaders section
    - Select "Notion Folder" from the available options

3. Set up the loader:

    - Enter the path to your unzipped Notion folder in the "Notion Folder" field
    - (Optional) Select a Text Splitter if you want to break down large documents
    - (Optional) Add additional metadata in JSON format
    - (Optional) Specify metadata keys to omit

4. Run the loader to import your Notion content into AnswerAgentAI

<!-- TODO: Add a screenshot of the Notion Folder Document Loader configuration interface -->
<figure><img src="/.gitbook/assets/screenshots/notionfolder.png" alt="" /><figcaption><p> Notion Folder Document Loader Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Organize your Notion content before exporting to make it easier to process in AnswerAgentAI
2. Use a Text Splitter for large documents to improve processing efficiency
3. Add relevant metadata to enhance searchability and organization of your imported content
4. Regularly update your imported Notion content to keep your AnswerAgentAI data current

## Troubleshooting

1. If the loader fails to import your content:

    - Double-check the folder path to ensure it's correct
    - Verify that the exported Notion folder is unzipped
    - Ensure you have the necessary permissions to access the folder

2. If metadata is not appearing as expected:

    - Review your JSON format for additional metadata
    - Check the "Omit Metadata Keys" field for any conflicts

3. If documents are too large or small after splitting:
    - Adjust the Text Splitter settings to find the right balance for your content

Remember, the Notion Folder Document Loader is a powerful tool to bridge your Notion workspace with AnswerAgentAI's capabilities. Experiment with different settings to find the best configuration for your specific use case.
