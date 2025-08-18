---
description: Character Text Splitter Node for AnswerAgentAI
---

# Character Text Splitter

## Overview

The Character Text Splitter is a powerful tool in AnswerAgentAI that allows you to split long pieces of text into smaller, more manageable chunks. This splitter focuses on dividing text based on a specific character or sequence of characters, making it ideal for processing large documents or datasets.

## Key Benefits

-   Efficiently breaks down large texts into smaller, processable chunks
-   Customizable separator for flexible text splitting
-   Allows control over chunk size and overlap for optimal processing

## How to Use

1. Add the Character Text Splitter node to your AnswerAgentAI workflow canvas.
2. Configure the node parameters:

    - Chunk Size: Set the number of characters for each chunk (default: 1000)
    - Chunk Overlap: Specify the number of characters to overlap between chunks (default: 200)
    - Custom Separator: Optionally, define a custom separator to override the default ("\n\n")

3. Connect the Character Text Splitter node to your text input source.
4. Run your workflow to split the input text into chunks.

<!-- TODO: Add a screenshot of the Character Text Splitter node on the AnswerAgentAI canvas -->
<figure><img src="/.gitbook/assets/screenshots/charactertextsplitter.png" alt="" /><figcaption><p> Character Text Splitter &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different chunk sizes to find the optimal balance between context preservation and processing efficiency.
2. Use chunk overlap to maintain context between chunks, especially when dealing with continuous text.
3. When working with structured text (e.g., code or formatted documents), consider using a custom separator that respects the document's structure.
4. For general text processing, the default separator ("\n\n") works well as it often represents paragraph breaks.

## Troubleshooting

1. If your text isn't splitting as expected, double-check your custom separator (if used) to ensure it matches the character sequence in your text.
2. If chunks are too large or small, adjust the Chunk Size parameter accordingly.
3. If you're losing important context between chunks, try increasing the Chunk Overlap value.

This will create a new Character Text Splitter with custom parameters and use it to split the `longText` into chunks.

Remember that the Character Text Splitter is just one of many text splitting options in AnswerAgentAI. Depending on your specific use case, you might want to explore other splitters like the Token Text Splitter or the Recursive Character Text Splitter for more advanced splitting strategies.
