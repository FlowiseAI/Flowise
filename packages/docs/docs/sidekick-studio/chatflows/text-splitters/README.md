---
description: Text Splitter Nodes in AnswerAgentAI
---

# Text Splitter Nodes

## Overview

Text Splitter Nodes in AnswerAgentAI are essential tools for processing and managing large volumes of text data. These nodes allow you to break down long pieces of text into smaller, more manageable chunks while preserving semantic relationships. This process is crucial for various natural language processing tasks and for optimizing the performance of language models.

## Key Benefits

-   Improved processing efficiency for large text documents
-   Enhanced semantic coherence in text analysis tasks
-   Versatile options for different types of text and use cases

## Available Text Splitter Nodes

AnswerAgentAI offers several Text Splitter Nodes, each designed for specific use cases. Here's a brief explanation of each Text Splitter Node and when to use them:

1. [Character Text Splitter](character-text-splitter.md):

    - Splits text based on a specified number of characters
    - Use when you need a simple, length-based split without considering content structure

2. [Code Text Splitter](code-text-splitter.md):

    - Specialized for splitting programming code
    - Use when working with source code files or code snippets to maintain code structure

3. [Html-To-Markdown Text Splitter](html-to-markdown-text-splitter.md):

    - Converts HTML to Markdown before splitting
    - Use when processing HTML content and you prefer working with Markdown format

4. [Markdown Text Splitter](markdown-text-splitter.md):

    - Splits Markdown text while preserving its structure
    - Use when working with Markdown documents to maintain formatting and hierarchy

5. [Recursive Character Text Splitter](recursive-character-text-splitter.md):

    - Splits text recursively based on multiple delimiters
    - Use for complex documents with varying structures or when you need fine-grained control over splitting

6. [Token Text Splitter](token-text-splitter.md):
    - Splits text based on the number of tokens
    - Use when working with language models that have token limits, ensuring consistent input sizes

Each of these nodes offers unique capabilities for different text processing scenarios. Choose the appropriate splitter based on your specific text format and processing requirements.
