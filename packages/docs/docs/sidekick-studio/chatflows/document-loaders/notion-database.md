---
description: Load and process data from Notion Databases
---

# Notion Database

## Overview

The Notion Database feature in AnswerAgentAI allows you to load and process data from your Notion databases. This powerful integration enables you to seamlessly import information from Notion into your AnswerAgentAI workflows, treating each row in the database as a separate document with all its properties as metadata.

## Key Benefits

-   Easily import structured data from Notion databases into AnswerAgentAI
-   Maintain metadata from Notion, enhancing the context of your imported data
-   Customize the imported data with additional metadata and filtering options

## How to Use

Follow these steps to use the Notion Database feature in AnswerAgentAI:

1. Navigate to the Document Loaders section in AnswerAgentAI.
2. Locate and select the "Notion Database" option.

<!-- TODO: Screenshot of the Document Loaders section with Notion Database highlighted -->
<figure><img src="/.gitbook/assets/screenshots/notiondatabase.png" alt="" /><figcaption><p> Notion Database Node &#x26; Drop UI</p></figcaption></figure>

3. Configure the Notion Database loader with the following settings:

    a. Connect Credential: Link your Notion API credentials.
    b. Text Splitter (optional): Choose a text splitter if you want to break down large documents.
    c. Notion Database Id: Enter the ID of your Notion database.
    d. Additional Metadata (optional): Add any extra metadata you want to include with your documents.
    e. Omit Metadata Keys (optional): Specify any metadata keys you want to exclude from the imported documents.

<!-- TODO: Screenshot of the Notion Database configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/notiondatabaseinaworkflow.png" alt="" /><figcaption><p> Notion Database Node In a Workflow &#x26; Drop UI</p></figcaption></figure>

4. Click "Save" or "Apply" to confirm your settings.
5. Run your workflow to import the data from your Notion database.

## Tips and Best Practices

1. Obtain the correct Database ID: To find your Notion Database ID, look at the URL of your database. If it looks like `https://www.notion.so/abcdefh?v=long_hash_2`, then `abcdefh` is your database ID.

2. Use Text Splitters wisely: If you're dealing with large documents in your Notion database, consider using a Text Splitter to break them down into more manageable chunks.

3. Leverage Additional Metadata: Use the Additional Metadata field to add context or categorization to your imported documents. This can be helpful for organizing and filtering your data within AnswerAgentAI.

4. Optimize Metadata: Use the Omit Metadata Keys feature to exclude unnecessary metadata, keeping your imported data clean and relevant. You can use a comma-separated list of keys to omit, or use "\*" to omit all default metadata keys.

## Troubleshooting

1. Authentication Issues:

    - Ensure that your Notion API credentials are correctly set up in AnswerAgentAI.
    - Verify that your Notion integration has the necessary permissions to access the database.

2. Database Not Found:

    - Double-check that you've entered the correct Database ID.
    - Confirm that your Notion integration has access to the specific database you're trying to import.

3. Unexpected Data:
    - If you're not seeing all the data you expect, check your Omit Metadata Keys settings to ensure you haven't accidentally excluded important information.
    - Verify that the database columns in Notion match the structure you're expecting in AnswerAgentAI.

By following this guide, you should be able to effectively use the Notion Database feature in AnswerAgentAI to import and process your Notion data. Remember to respect Notion's API usage limits and your organization's data handling policies when working with imported data.
