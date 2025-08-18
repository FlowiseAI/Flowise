---
description: Load and process various file types using Unstructured.io
---

# Unstructured File Loader

## Overview

The Unstructured File Loader is a powerful feature in AnswerAgentAI that allows you to load and process various file types using Unstructured.io. This tool enables you to extract structured data from unstructured documents, making it easier to work with a wide range of file formats.

## Key Benefits

-   Supports multiple file formats, including PDF, DOCX, JPG, HTML, and more
-   Offers flexible processing options to optimize data extraction
-   Integrates seamlessly with other AnswerAgentAI features for enhanced document analysis

## How to Use

1. Navigate to the Document Loaders section in AnswerAgentAI.
2. Select the "Unstructured File Loader" option.
3. Configure the loader settings:
    - Choose between uploading files or specifying a file path
    - Set the Unstructured API URL (default: `http://localhost:8000/general/v0/general`
    - Select a processing strategy (Hi-Res, Fast, OCR Only, or Auto)
    - Adjust additional parameters as needed (e.g., encoding, chunking strategy)
4. Upload your files or provide the file path.
5. Run the loader to process your documents.

<!-- TODO: Add a screenshot of the Unstructured File Loader configuration interface -->
<figure><img src="/.gitbook/assets/screenshots/unstructuredfileloader.png" alt="" /><figcaption><p> Unstructured File Loader Configuration   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use the File Upload option for easier file management within AnswerAgentAI.
2. Experiment with different processing strategies to find the best balance between speed and accuracy for your specific documents.
3. Utilize the "Additional Metadata" field to add custom information to your extracted documents.
4. When working with multi-language documents, specify the appropriate OCR languages for better text recognition.

## Troubleshooting

1. If you encounter issues with file processing:

    - Ensure that the Unstructured API URL is correct and accessible
    - Check if the file format is supported by the loader
    - Verify that you have the necessary credentials if using the Unstructured API key

2. For slow processing times:

    - Try using the "Fast" strategy for quicker results
    - Consider breaking large documents into smaller chunks before processing

3. If extracted text is incomplete or inaccurate:
    - Experiment with different processing strategies
    - Adjust the OCR languages if working with non-English documents
    - Use the "Hi-Res" strategy for better accuracy, especially with complex layouts

## Additional Configuration Options

The Unstructured File Loader offers several advanced configuration options to fine-tune your document processing:

1. **Skip Infer Table Types**: Choose which document types to skip table extraction for.
2. **Hi-Res Model Name**: Select the inference model used for high-resolution processing.
3. **Chunking Strategy**: Determine how the extracted elements should be chunked.
4. **Coordinates**: Enable to return coordinates for each extracted element.
5. **XML Keep Tags**: Retain XML tags in the output for XML documents.
6. **Include Page Breaks**: Add page break elements to the output when supported by the file type.

<!-- TODO: Add a screenshot showcasing the advanced configuration options -->
<figure><img src="/.gitbook/assets/screenshots/unstructuredfileloaderadvanced.png" alt="" /><figcaption><p> Unstructured File Loader Advanced Configuration   &#x26; Drop UI</p></figcaption></figure>

By leveraging these options, you can customize the Unstructured File Loader to best suit your specific document processing needs in AnswerAgentAI.
