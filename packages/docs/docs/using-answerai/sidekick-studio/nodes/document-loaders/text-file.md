---
description: Load and process text files in AnswerAI
---

# Text File Document Loader

## Overview

The Text File Document Loader is a powerful feature in AnswerAI that allows you to import and process data from various text-based file formats. This tool is essential for users who need to work with existing text documents, source code files, or any other text-based data in their AnswerAI workflows.

## Key Benefits

-   Supports a wide range of text-based file formats, including .txt, .html, .cpp, .py, and many more
-   Offers flexible text splitting options for optimal processing
-   Allows addition of custom metadata to extracted documents

## How to Use

1. In your AnswerAI workflow, add the "Text File" node from the "Document Loaders" category.
2. Configure the node with the following settings:

    - Txt File: Upload or select the text file(s) you want to process.
    - Text Splitter (optional): Choose a text splitter if you want to break the document into smaller chunks.
    - Additional Metadata (optional): Add any extra metadata as a JSON object.
    - Omit Metadata Keys (optional): Specify metadata keys to exclude from the output.

3. Connect the Text File node to other nodes in your workflow as needed.
4. Run your workflow to process the text file(s) and use the extracted data in subsequent steps.

<!-- TODO: Add a screenshot of the Text File node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/textfilenode.png" alt="" /><figcaption><p> Text File Node Configuration   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

-   When working with large text files, consider using a Text Splitter to break the content into more manageable chunks.
-   Use the Additional Metadata option to add relevant information to your documents, such as source, date, or category.
-   If you're processing multiple files with similar structures, consider using a loop or batch processing technique in your workflow.

## Troubleshooting

-   If your file isn't recognized, double-check that its extension is supported by the Text File node.
-   For large files, if you encounter memory issues, try using a Text Splitter with smaller chunk sizes.

## Comparison with Plain Text Input

The Text File Document Loader differs from plain text input in several key aspects:

1. File-based input: This loader requires you to upload or specify a .txt file (or other supported text-based file formats), whereas plain text input allows you to paste text directly into the node.

2. Multiple file support: The Text File loader can process multiple files at once, which is not possible with plain text input.

3. Broader file format support: While plain text is limited to, well, plain text, this loader supports various text-based file formats including source code files (.cpp, .py, etc.) and markup languages (.html, .md, etc.).

4. Metadata handling: The Text File loader automatically extracts metadata from the files (such as file name, size, etc.) and allows you to add or omit specific metadata fields. Plain text input typically doesn't include this metadata management.

5. Use case: Use the Text File loader when you have existing files you need to process or when working with code or structured text files. Use plain text input when you want to quickly input or test with a small amount of text without creating a separate file.

Choose between the Text File Document Loader and plain text input based on your specific use case, the format of your data, and whether you need the additional features provided by the file-based loader.
