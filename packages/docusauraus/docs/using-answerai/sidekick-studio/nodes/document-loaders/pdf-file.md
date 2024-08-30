---
description: Load and process PDF documents in AnswerAI
---

# PDF Document Loader

## Overview

The PDF Document Loader is a powerful feature in AnswerAI that allows you to extract and process text content from PDF files. This tool is essential for users who need to work with information stored in PDF format, enabling easy integration of PDF content into their AnswerAI workflows.

## Key Benefits

-   Easily extract text content from PDF files
-   Flexible options for processing PDF documents (per page or per file)
-   Ability to split large documents into manageable chunks

## How to Use

1.  **Select the PDF File**

    -   Choose the PDF file(s) you want to process.

    <!-- TODO: Screenshot of file selection interface -->
    <figure><img src="/.gitbook/assets/screenshots/pdffile.png" alt="" /><figcaption><p> Pdf Loader File Selection Interface &#x26; Drop UI</p></figcaption></figure>

2.  **Configure Text Splitter (Optional)**

    -   If needed, select a Text Splitter to break down large documents.
        <!-- TODO: Screenshot of Text Splitter configuration -->
            <figure><img src="/.gitbook/assets/screenshots/textsplitter.png" alt="" /><figcaption><p> Text Splitter Node &#x26; Drop UI</p></figcaption></figure>

3.  **Choose Usage Option**

    -   Select either "One document per page" or "One document per file" based on your needs.
        <!-- TODO: Screenshot of usage option selection -->
        <figure><img src="/.gitbook/assets/screenshots/pdfusage.png" alt="" /><figcaption><p> Pdf Usage &#x26; Drop UI</p></figcaption></figure>

4.  **Set Additional Parameters (Optional)**
    -   Use Legacy Build: Enable if you're working with older PDF formats.
    -   Additional Metadata: Add extra information to the extracted documents.
    -   Omit Metadata Keys: Specify which metadata keys to exclude.
        <!-- TODO: Screenshot of additional parameters configuration -->
        <figure><img src="/.gitbook/assets/screenshots/pdfadditionalparameters.png" alt="" /><figcaption><p> Pdf Additional Parameters &#x26; Drop UI</p></figcaption></figure>
5.  **Process the PDF**
    -   Run the PDF Document Loader to extract the content.
        <!-- TODO: Screenshot of the process initiation button -->

## Tips and Best Practices

1. Use the Text Splitter option for large PDFs to create more manageable chunks of text.
2. When working with multiple PDFs, consider using the "One document per file" option for easier organization.
3. Utilize the Additional Metadata feature to add context or categorization to your extracted documents.
4. If you encounter issues with older PDFs, try enabling the "Use Legacy Build" option.

## Troubleshooting

1. **PDF not loading properly:**

    - Ensure the PDF file is not corrupted or password-protected.
    - Try using the "Use Legacy Build" option for older PDF formats.

2. **Extracted text is jumbled or incorrectly formatted:**

    - This can happen with complex PDF layouts. Try adjusting the Text Splitter settings or processing the document page by page.

3. **Missing metadata:**
    - Check the "Omit Metadata Keys" field to ensure you haven't accidentally excluded important metadata.

## Note on Image Handling

Please be aware that the current version of the PDF Document Loader does not handle images within PDF files very well. Our team is actively working on improving image processing capabilities to provide a more comprehensive PDF handling experience in future updates.
