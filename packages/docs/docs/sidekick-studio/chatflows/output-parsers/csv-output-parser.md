---
description: Parse LLM output as a comma-separated list of values
---

# CSV Output Parser

## Overview

The CSV Output Parser is a powerful tool in AnswerAgentAI that transforms the output of a language model into a comma-separated list of values. This parser is particularly useful when you need to generate structured data from LLM responses or normalize output from chat models and LLMs.

## Key Benefits

-   Simplifies data extraction from LLM outputs
-   Enables easy integration with downstream tasks that require structured data
-   Improves consistency in LLM-generated lists

## How to Use

1. Add the CSV Output Parser node to your AnswerAgentAI workflow canvas.
2. Connect the output of your LLM or chat model to the input of the CSV Output Parser.
3. Configure the parser settings:
    - **Autofix**: Enable this option if you want the parser to attempt fixing errors automatically.

<!-- TODO: Add a screenshot of the CSV Output Parser node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/csvoutputparser.png" alt="" /><figcaption><p> CSV Output Parser node configuration panel &#x26; Drop UI</p></figcaption></figure>

4. Connect the output of the CSV Output Parser to your desired downstream nodes or tasks.

## Tips and Best Practices

1. Use clear prompts: When working with LLMs, ensure your prompts explicitly request comma-separated lists to improve parsing accuracy.
2. Validate output: Always validate the parsed output to ensure it meets your requirements, especially when working with critical data.
3. Combine with other parsers: Consider chaining the CSV Output Parser with other parsers for more complex data structures.

## Troubleshooting

1. **Issue**: Parser fails to separate values correctly
   **Solution**: Check if the LLM output is truly comma-separated. You may need to adjust your prompt or enable the Autofix option.

2. **Issue**: Unexpected empty values in the parsed list
   **Solution**: Review your LLM prompt to ensure it's not generating empty list items. You may need to post-process the parsed list to remove empty values.

By leveraging the CSV Output Parser in your AnswerAgentAI workflows, you can efficiently transform unstructured LLM outputs into structured, comma-separated lists, enabling smoother data processing and analysis in your projects.
