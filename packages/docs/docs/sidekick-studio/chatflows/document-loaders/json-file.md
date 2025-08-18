---
description: Load and process data from JSON files in AnswerAgentAI
---

# JSON File Document Loader

## Overview

The JSON File Document Loader is a powerful feature in AnswerAgentAI that allows you to import and process data from JSON files. This tool is particularly useful when you need to extract specific information from JSON-structured data and convert it into a format that can be used within AnswerAgentAI's workflows.

## Key Benefits

-   Easily import and process JSON data from files
-   Extract specific data points using pointers
-   Customize metadata and control what information is included in the output

## How to Use

1. In the AnswerAgentAI interface, locate and select the "JSON File" node from the "Document Loaders" category.

2. Configure the node by setting the following parameters:

    a. JSON File: Upload your JSON file or select one from storage.

    b. Text Splitter (optional): Choose a text splitter if you want to break down large JSON documents into smaller chunks.

    c. Pointers Extraction (optional): Enter comma-separated pointers to extract specific data from the JSON structure.

    d. Additional Metadata (optional): Add any extra metadata you want to include with the extracted documents.

    e. Omit Metadata Keys (optional): Specify any metadata keys you want to exclude from the output.

3. Connect the JSON File node to other nodes in your workflow as needed.

4. Run your workflow to process the JSON data.

<!-- TODO: Add a screenshot of the JSON File node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/jsonfilenode.png" alt="" /><figcaption><p> JSON File Node Configuration In a Workflow &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use pointers to extract specific data: If you only need certain information from your JSON file, use the "Pointers Extraction" field to specify the exact data you want to extract. This can help reduce processing time and improve efficiency.

2. Leverage text splitters for large documents: When dealing with large JSON files, use a text splitter to break the content into more manageable chunks. This can help improve processing speed and prevent memory issues.

3. Customize metadata: Use the "Additional Metadata" field to add context to your extracted data. This can be helpful for tracking the source of information or adding other relevant details.

4. Control metadata output: Use the "Omit Metadata Keys" field to exclude any sensitive or unnecessary metadata from your output. You can use a comma-separated list of keys or use "\*" to omit all metadata except what you specify in the "Additional Metadata" field.

## Troubleshooting

1. Issue: The JSON file isn't loading properly.
   Solution: Ensure that your JSON file is properly formatted and valid. You can use online JSON validators to check your file's structure.

2. Issue: Extracted data is not what you expected.
   Solution: Double-check your pointer syntax in the "Pointers Extraction" field. Make sure you're using the correct path to the data you want to extract.

3. Issue: Processing large JSON files is slow or causes errors.
   Solution: Try using a text splitter to break down the document into smaller chunks. This can help improve processing speed and prevent memory-related issues.

Remember, the JSON File Document Loader is a versatile tool that can handle various JSON structures and sizes. Experiment with different configurations to find the best setup for your specific use case.

<!-- TODO: Add a screenshot of a sample workflow using the JSON File node -->
<figure><img src="/.gitbook/assets/screenshots/jsonfilenodeinaworkflow.png" alt="" /><figcaption><p> JSON File Node Configuration &#x26; Drop UI</p></figcaption></figure>
