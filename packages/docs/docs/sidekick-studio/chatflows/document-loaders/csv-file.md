---
description: Load and process data from CSV files in AnswerAgentAI
---

# CSV File Document Loader

## Overview

The CSV File Document Loader is a powerful feature in AnswerAgentAI that allows you to import and process data from CSV (Comma-Separated Values) files. This tool is essential for users who need to work with structured data stored in spreadsheets or tabular formats.

## Key Benefits

-   Easy import of structured data from CSV files
-   Flexible options for data extraction and processing
-   Seamless integration with other AnswerAgentAI features

## How to Use

1. Select the CSV File Document Loader from the Document Loaders category.

<!-- TODO: Screenshot of the CSV File Document Loader node in the AnswerAgentAI interface -->
<figure><img src="/.gitbook/assets/screenshots/csvfiledocumentloader.png" alt="" /><figcaption><p> CSV File Document Loader  &#x26; Drop UI</p></figcaption></figure>

2. Configure the loader with the following options:

    a. CSV File: Upload your CSV file or provide a reference to a file in storage.

    b. Text Splitter (optional): Choose a text splitter if you want to break down the content into smaller chunks.

    c. Single Column Extraction (optional): Specify a column name if you want to extract data from a single column.

    d. Additional Metadata (optional): Add any extra metadata you want to include with the extracted documents.

    e. Omit Metadata Keys (optional): Specify any metadata keys you want to exclude from the output.

<!-- TODO: Screenshot of the configuration options for the CSV File Document Loader -->
<figure><img src="/.gitbook/assets/screenshots/csv file node configuraation.png" alt="" /><figcaption><p> CSV File Document Loader Node Configuration &#x26; Drop UI</p></figcaption></figure>

3. Connect the CSV File Document Loader to other nodes in your AnswerAgentAI workflow.

4. Run your workflow to process the CSV data.

## Tips and Best Practices

1. When working with large CSV files, consider using a Text Splitter to break down the content into manageable chunks.

2. If you only need data from a specific column, use the Single Column Extraction option to streamline your workflow.

3. Utilize the Additional Metadata option to add context or categorization to your documents.

4. Use the Omit Metadata Keys feature to remove any sensitive or unnecessary information from the output.

## Troubleshooting

1. File format issues:

    - Ensure your file has a .csv extension.
    - Check that the file is properly formatted with comma-separated values.

2. Column name errors:

    - If using Single Column Extraction, verify that the specified column name exactly matches the header in your CSV file.

3. Metadata parsing problems:

    - When adding Additional Metadata, make sure it's in valid JSON format.

4. Performance concerns:
    - For very large CSV files, consider splitting them into smaller files or using a Text Splitter to improve processing speed.

## Output Options

The CSV File Document Loader offers two output options:

1. Document: Returns an array of document objects containing metadata and page content.
2. Text: Provides a concatenated string of the page content from all documents.

Choose the output that best fits your workflow needs.

<!-- TODO: Screenshot showing how to select the output option -->
<figure><img src="/.gitbook/assets/screenshots/csvfile output.png" alt="" /><figcaption><p> CSV File Document Loader Output &#x26; Drop UI</p></figcaption></figure>

By following this guide, you'll be able to effectively use the CSV File Document Loader in AnswerAgentAI to import and process your structured data from CSV files.
