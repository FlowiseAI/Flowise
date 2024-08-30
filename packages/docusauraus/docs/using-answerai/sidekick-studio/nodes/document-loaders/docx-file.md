---
description: Load and process data from DOCX files in AnswerAI
---

# Docx File Loader

## Overview

The Docx File Loader is a powerful feature in AnswerAI that allows you to extract and process content from Microsoft Word (.docx) files. This tool is essential for users who need to work with document-based data in their AI workflows.

## Key Benefits

-   Easily import content from .docx files into your AnswerAI projects
-   Process and split large documents for more efficient handling
-   Add custom metadata to enhance document organization and searchability

## How to Use

1. In the AnswerAI interface, locate and select the "Docx File" node from the "Document Loaders" category.

<!-- TODO: Screenshot of the Docx File node in the AnswerAI interface -->
<figure><img src="/.gitbook/assets/screenshots/docxfileloader.png" alt="" /><figcaption><p> Docx File Loader  &#x26; Drop UI</p></figcaption></figure>

2. Configure the node by setting the following parameters:

    a. **Docx File**: Upload your .docx file or provide a reference to a file in storage.

    b. **Text Splitter** (optional): Choose a text splitter to break down large documents into smaller chunks.

    c. **Additional Metadata** (optional): Add extra information to your documents in JSON format.

    d. **Omit Metadata Keys** (optional): Specify metadata keys to exclude from the final output.

3. Connect the Docx File Loader node to other nodes in your workflow as needed.

4. Run your workflow to process the .docx file and use the extracted content in subsequent steps.

## Tips and Best Practices

1. Use text splitters for large documents to improve processing efficiency and enable more granular analysis.

2. Leverage the Additional Metadata feature to add context or categorization to your documents.

3. When working with multiple files, you can provide a list of file references in the Docx File input.

4. Use the Omit Metadata Keys option to remove unnecessary metadata and keep your document data clean.

## Troubleshooting

1. **File not loading**: Ensure that your .docx file is not corrupted and is properly formatted.

2. **Unexpected content**: Some complex formatting in Word documents may not be preserved. For best results, use simple formatting in your source documents.

3. **Performance issues**: If processing large files is slow, try using a text splitter to break the document into smaller chunks.

<!-- TODO: Screenshot showing a sample workflow with the Docx File Loader connected to other nodes -->
<figure><img src="/.gitbook/assets/screenshots/docxfileinaworkflow.png" alt="" /><figcaption><p> Docx File Loader In a Workflow &#x26; Drop UI</p></figcaption></figure>

By mastering the Docx File Loader, you can efficiently incorporate document-based data into your AnswerAI projects, opening up new possibilities for document analysis and processing in your AI workflows.
