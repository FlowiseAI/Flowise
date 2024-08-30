---
description: Load and process multiple files from a folder (Local Only)
---

# Folder with Files

## Overview

The Folder with Files feature in AnswerAI allows you to load and process multiple documents from a specified folder on your system. This powerful tool supports various file formats and provides options for recursive folder scanning, text splitting, and metadata management.

## Key Benefits

-   Load multiple files of different formats from a single folder
-   Customize document processing with text splitters and metadata options
-   Support for recursive folder scanning to process nested directories

## How to Use

1. In the AnswerAI interface, locate and select the "Folder with Files" option from the Document Loaders category.

2. Configure the following required settings:

    - Folder Path: Enter the full path to the folder containing your documents.
    - Recursive: Choose whether to include files from subfolders (true) or only the specified folder (false).

3. (Optional) Configure additional settings:

    - Text Splitter: Select a text splitter to break down large documents into smaller chunks.
    - PDF Usage: Choose how to process PDF files (one document per page or per file).
    - Additional Metadata: Add extra metadata to the extracted documents in JSON format.
    - Omit Metadata Keys: Specify metadata keys to exclude from the final output.

4. Connect the Folder with Files node to other nodes in your AnswerAI workflow as needed.

5. Run your workflow to process the documents from the specified folder.

<!-- TODO: Add a screenshot showing the Folder with Files node configuration in the AnswerAI interface -->
<figure><img src="/.gitbook/assets/screenshots/folderwithfiles.png" alt="" /><figcaption><p> Folder with Files Node Configuration &#x26; Drop UI</p></figcaption></figure>

<figure><img src="/.gitbook/assets/screenshots/folder with files in a workflow.png" alt="" /><figcaption><p> Folder with Files Nodes Configuration In a workflow &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Organize your files: Keep your documents well-organized in folders to make it easier to process them in batches.

2. Use text splitters: For large documents, consider using a text splitter to break them into more manageable chunks for processing.

3. Leverage metadata: Use the Additional Metadata option to add relevant information to your documents, such as source, date, or category.

4. Optimize PDF processing: Choose the appropriate PDF Usage option based on your needs. Use "One document per page" for granular analysis or "One document per file" for treating each PDF as a single unit.

5. Be mindful of file types: The Folder with Files feature supports a wide range of file formats, including JSON, TXT, CSV, DOCX, PDF, and various programming language files. Ensure your folder contains supported file types.

## Troubleshooting

1. Issue: Files are not being processed
   Solution: Double-check the folder path and ensure it's correct. Also, verify that you have the necessary permissions to access the folder and its contents.

2. Issue: Subfolders are not included
   Solution: Make sure the "Recursive" option is set to true if you want to process files from subfolders.

3. Issue: PDF processing is slow
   Solution: For large PDF files, consider using the "One document per file" option to reduce processing time, especially if you don't need page-level granularity.

4. Issue: Unexpected metadata in output
   Solution: Use the "Omit Metadata Keys" option to exclude specific metadata fields. You can use a comma-separated list of keys or "\*" to omit all default metadata.

5. Issue: Out of memory errors
   Solution: If you're processing a large number of files or very large documents, consider using a text splitter to break them into smaller chunks. This can help manage memory usage more effectively.

<!-- TODO: Add a screenshot showing example output or error messages for common issues -->

By following these instructions and best practices, you can effectively use the Folder with Files feature in AnswerAI to process multiple documents from a single folder, streamlining your document analysis workflows.
