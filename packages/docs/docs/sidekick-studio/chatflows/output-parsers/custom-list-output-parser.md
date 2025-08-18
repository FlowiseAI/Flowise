---
description: Parse LLM output as a list of values
---

# Custom List Output Parser

## Overview

The Custom List Output Parser is a powerful tool in AnswerAgentAI that allows you to parse the output of a Language Model (LLM) call as a list of values. This feature is particularly useful when you need to extract structured information from the LLM's response in a list format.

## Key Benefits

-   Easily convert unstructured LLM output into a structured list
-   Customize the parsing process to fit your specific needs
-   Improve the reliability of parsed output with autofix functionality

## How to Use

To use the Custom List Output Parser in your AnswerAgentAI workflow:

1. Locate the "Custom List Output Parser" node in the node library.
2. Drag and drop the node onto your canvas.
3. Connect the output of your LLM node to the input of the Custom List Output Parser node.
4. Configure the node parameters:
    - Length: Specify the number of values you want in the output list (optional).
    - Separator: Define the character used to separate values in the list (default is ',').
    - Autofix: Enable this option to attempt automatic error correction if parsing fails.
5. Connect the output of the Custom List Output Parser to your desired destination node.

<!-- TODO: Add a screenshot showing the Custom List Output Parser node on the canvas with its configuration panel open -->
<figure><img src="/.gitbook/assets/screenshots/customlistoutputparser.png" alt="" /><figcaption><p> Custom List Output Parser node configuration panel &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. When setting the "Length" parameter, ensure it matches the expected number of items in your LLM's output for best results.
2. Choose a unique separator that is unlikely to appear within the list items themselves to avoid parsing errors.
3. Enable the "Autofix" option when dealing with potentially inconsistent LLM outputs to improve reliability.
4. Test your parser with various LLM outputs to ensure it handles different scenarios correctly.

## Troubleshooting

Common issues and solutions:

1. Incorrect number of items in the output list:

    - Verify that the "Length" parameter is set correctly.
    - Check if the LLM is consistently producing the expected number of items.

2. Items not separated correctly:

    - Ensure the "Separator" parameter matches the separator used in the LLM output.
    - Consider using a more unique separator if the current one appears within list items.

3. Parsing errors:
    - Enable the "Autofix" option to attempt automatic error correction.
    - Review the LLM prompt to ensure it's generating output in the expected format.
