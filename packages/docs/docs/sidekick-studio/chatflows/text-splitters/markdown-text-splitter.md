---
description: Split content based on Markdown headers
---

# Markdown Text Splitter

## Overview

The Markdown Text Splitter is a powerful tool in AnswerAgentAI that allows you to split your content into smaller, more manageable documents based on Markdown headers. This feature is particularly useful when working with large Markdown files or when you need to process Markdown content in chunks.

## Key Benefits

-   Efficiently splits Markdown content into logical sections
-   Preserves the structure and hierarchy of your Markdown documents
-   Customizable chunk size and overlap for fine-tuned control

## How to Use

1. Locate the "Markdown Text Splitter" node in the Text Splitters category of the AnswerAgentAI Studio.
2. Drag and drop the node onto your workflow canvas.
3. Connect the node to your input source (e.g., a Markdown file loader or text input).
4. Configure the node parameters:
    - Chunk Size: Set the number of characters for each chunk (default: 1000)
    - Chunk Overlap: Set the number of characters to overlap between chunks (default: 200)
5. Connect the output of the Markdown Text Splitter to your desired destination node (e.g., a text processing or analysis node).

<!-- TODO: Add a screenshot of the Markdown Text Splitter node on the canvas with its input and output connections -->
<figure><img src="/.gitbook/assets/screenshots/markdowntextsplitter.png" alt="" /><figcaption><p> Markdown Text Splitter &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different chunk sizes to find the optimal balance between processing efficiency and maintaining context.
2. Use a larger chunk overlap when dealing with complex Markdown structures to ensure important information isn't split between chunks.
3. Consider the nature of your Markdown content when setting parameters. For example, technical documentation might benefit from larger chunk sizes compared to blog posts.
4. Combine the Markdown Text Splitter with other text processing nodes to create powerful workflows for analyzing and transforming Markdown content.

## Troubleshooting

1. If your output chunks seem too large or small, adjust the Chunk Size parameter accordingly.
2. If you notice important context being lost between chunks, try increasing the Chunk Overlap parameter.
3. Ensure that your input is valid Markdown content. The splitter works best with properly formatted Markdown files.

<!-- TODO: Add a screenshot showing the node's configuration panel with Chunk Size and Chunk Overlap parameters highlighted -->

By using the Markdown Text Splitter in AnswerAgentAI, you can efficiently process large Markdown documents while preserving their structure and context. This node is an essential tool for anyone working with Markdown content in their workflows.
