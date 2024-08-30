---
description: Recursive Character Text Splitter for Advanced Document Chunking
---

# Recursive Character Text Splitter

## Overview

The Recursive Character Text Splitter is an advanced text splitting tool in AnswerAI that allows you to split documents recursively using different characters or custom separators. This splitter offers more sophisticated chunking capabilities compared to the simpler Character Text Splitter, giving you greater control over how your text is divided.

## Key Benefits

-   Recursive splitting for more semantically coherent chunks
-   Customizable separators for tailored text division
-   Improved context preservation in complex documents

## How to Use

1. In the AnswerAI Studio, add the "Recursive Character Text Splitter" node to your canvas.
2. Configure the following parameters:

    - Chunk Size: Set the maximum number of characters per chunk (default: 1000)
    - Chunk Overlap: Specify the number of characters to overlap between chunks (default: 200)
    - Custom Separators: (Optional) Define an array of custom separators

3. Connect the splitter to your document input and subsequent processing nodes.

<!-- TODO: Add a screenshot of the Recursive Character Text Splitter node configuration in the AnswerAI Studio -->
<figure><img src="/.gitbook/assets/screenshots/recursivetextsplitter.png" alt="" /><figcaption><p> Recursive Text Splitter &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Experiment with different chunk sizes and overlaps to find the optimal balance for your specific use case.
2. Use custom separators when dealing with structured text or documents with clear section demarcations.
3. Consider the nature of your text when choosing separators (e.g., newlines for paragraphs, special characters for code blocks).

## Recursive Splitting vs. Character Text Splitter

The Recursive Character Text Splitter differs from the regular Character Text Splitter in several key ways:

1. **Recursive Approach**: This splitter uses a hierarchical approach to text division. It starts with the first separator (default: "\n\n"), then moves to the next ("\n"), and finally to a space (" "). This method helps maintain the semantic structure of the document better than a simple character count split.

2. **Custom Separators**: You can define your own array of separators, allowing for highly customized text division based on your document's structure.

3. **Context Preservation**: By using meaningful separators, this splitter is more likely to keep related information together, preserving context within chunks.

4. **Flexibility**: The recursive approach adapts better to varying document structures, making it more versatile for different types of text.

## Using Custom Separators for Ultimate Control

The Custom Separators feature gives you precise control over how your text is chunked:

1. **Tailored Chunking**: Define separators that match your document's structure (e.g., ["##", "###"] for Markdown headers).

2. **Preserve Semantic Units**: Keep logical sections together by using appropriate separators (e.g., ["\n\n", "\n", " "] for paragraphs and sentences).

3. **Handle Special Formats**: Easily chunk code blocks, CSV data, or any structured text by specifying relevant delimiters.

4. **Optimize for Analysis**: Create chunks that align with your analytical needs, improving the effectiveness of subsequent processing steps.

Example custom separator input:

```json
["##", "###", "\n\n", "\n", " "]
```

This configuration would split the text first by "##", then "###", followed by double newlines, single newlines, and finally spaces.

By leveraging the Recursive Character Text Splitter with custom separators, you gain ultimate control over how your documents are processed, ensuring that the resulting chunks are optimally suited for your specific use case in AnswerAI.
