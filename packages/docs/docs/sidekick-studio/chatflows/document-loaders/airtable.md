---
description: Load data from Airtable tables into AnswerAgentAI
---

# Airtable Document Loader

## Overview

The Airtable Document Loader is a powerful feature in AnswerAgentAI that allows you to import data from your Airtable tables directly into your AI workflows. This integration enables you to leverage your existing Airtable data for various AI-powered tasks and analyses.

## Key Benefits

-   Seamlessly import Airtable data into AnswerAgentAI
-   Customize data retrieval with field selection and filtering options
-   Enhance your AI workflows with real-time Airtable information

## How to Use

Follow these steps to use the Airtable Document Loader in AnswerAgentAI:

1. Navigate to the Document Loaders section in AnswerAgentAI.
2. Select the Airtable loader from the available options.
3. Connect your Airtable credential:
    - If you haven't added your Airtable API key yet, you'll need to do so in the Credentials section.
4. Enter the required information:
    - Base ID: Find this in your Airtable URL (e.g., `app11RobdGoX0YNsC`)
    - Table ID: Also found in your Airtable URL (e.g., `tblJdmvbrgizbYICO`)
5. (Optional) Provide additional parameters:
    - View ID: Specify a particular view of your table
    - Include Only Fields: List specific fields you want to import
    - Return All: Choose whether to import all records or a limited number
    - Limit: Set a maximum number of records to import (if not returning all)
    - Additional Metadata: Add extra information to your imported documents
    - Omit Metadata Keys: Exclude certain metadata from the imported documents
6. Configure any text splitting options if needed.
7. Run the loader to import your Airtable data into AnswerAgentAI.

<!-- TODO: Screenshot of the Airtable Document Loader configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/airtabledocloader.png" alt="" /><figcaption><p> Airtable Document Loader &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Use field IDs instead of names if your field names contain commas.
2. Start with a small dataset to test your configuration before importing large tables.
3. Utilize the "Include Only Fields" option to focus on relevant data and improve performance.
4. Consider using a Text Splitter for large text fields to optimize processing.
5. Add custom metadata to enrich your imported documents for better context in AI tasks.

## Troubleshooting

Common issues and solutions:

1. **Authentication Error**: Ensure your Airtable API key is correctly added to AnswerAgentAI credentials.
2. **"Base ID or Table ID not found"**: Double-check the IDs in your Airtable URL and ensure they're correctly entered.
3. **No data imported**: Verify that the specified view and fields exist in your Airtable.
4. **Rate limiting**: If you're importing large datasets, you may hit Airtable's rate limits. Try reducing the batch size or adding delays between requests.

If you encounter persistent issues, check the AnswerAgentAI logs for more detailed error messages or contact support for assistance.

Remember, the Airtable Document Loader is a powerful tool to bridge your Airtable data with AnswerAgentAI's capabilities. Experiment with different configurations to find the best setup for your specific use case.
