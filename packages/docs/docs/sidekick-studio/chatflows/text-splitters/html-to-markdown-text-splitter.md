---
description: Convert HTML to Markdown and split text based on Markdown headers
---

# HtmlToMarkdown Text Splitter

## Overview

The HtmlToMarkdown Text Splitter is a powerful tool in AnswerAgentAI that converts HTML content to Markdown format and then splits the resulting text into smaller, manageable chunks based on Markdown headers. This feature is particularly useful when dealing with large HTML documents or web content that needs to be processed or analyzed in smaller segments.

## Key Benefits

-   Seamlessly converts HTML to Markdown format
-   Intelligently splits text based on Markdown structure
-   Allows for customizable chunk sizes and overlap

## How to Use

1. Locate the HtmlToMarkdown Text Splitter in the Text Splitters category of the AnswerAgentAI Studio.
2. Drag and drop the HtmlToMarkdown Text Splitter node onto your workflow canvas.
3. Connect the node to your HTML input source.
4. Configure the node settings:
    - Set the Chunk Size (optional)
    - Set the Chunk Overlap (optional)
5. Connect the output of the HtmlToMarkdown Text Splitter to subsequent nodes in your workflow.

<!-- TODO: Add a screenshot showing the HtmlToMarkdown Text Splitter node on the canvas with its settings panel open -->
<figure><img src="/.gitbook/assets/screenshots/htmltomarkdown.png" alt="" /><figcaption><p> Code Text Splitter &#x26; Drop UI</p></figcaption></figure>
## Configuration Options

### Chunk Size

-   Description: Number of characters in each chunk
-   Default: 1000
-   Type: Number
-   Optional: Yes

### Chunk Overlap

-   Description: Number of characters to overlap between chunks
-   Default: 200
-   Type: Number
-   Optional: Yes

## Tips and Best Practices

1. Experiment with different chunk sizes to find the optimal balance between context preservation and processing efficiency for your specific use case.
2. Use chunk overlap to ensure that important information isn't lost between chunks, especially when dealing with complex HTML structures.
3. Consider the structure of your HTML content when setting chunk size and overlap. Larger chunk sizes may be more appropriate for content with fewer natural breaks.
4. Remember that the quality of the Markdown conversion depends on the structure of your input HTML. Well-structured HTML will generally result in better Markdown output.

## Troubleshooting

1. If the output chunks are too large or small, adjust the Chunk Size parameter.
2. If you notice important information being cut off between chunks, increase the Chunk Overlap.
3. For HTML content with complex nested structures, you may need to preprocess the HTML or adjust your workflow to handle potential inconsistencies in the Markdown output.

<!-- TODO: Add a screenshot showing an example of the HtmlToMarkdown Text Splitter output, displaying how the HTML has been converted to Markdown and split into chunks -->

By using the HtmlToMarkdown Text Splitter, you can efficiently process HTML content in your AnswerAgentAI workflows, making it easier to analyze, summarize, or perform other operations on web-based text data.
