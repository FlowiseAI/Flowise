---
description: Parse LLM output into structured JSON format
---

# Structured Output Parser

## Overview

The Structured Output Parser is a powerful feature in AnswerAgentAI that allows you to parse the output of a Language Model (LLM) call into a predefined JSON structure. This tool is essential for extracting structured information from the LLM's responses, making it easier to process and use the data in your workflows.

## Key Benefits

-   Standardizes LLM outputs into a consistent, structured JSON format
-   Improves data extraction and processing from LLM responses
-   Enables easy integration of LLM outputs with other systems and workflows

## How to Use

1. Add the Structured Output Parser node to your AnswerAgentAI canvas.
2. Configure the node with the following settings:

    a. Autofix (Optional):

    - Toggle this option to enable automatic fixing of parsing errors.
    - When enabled, if the initial parsing fails, the system will make another call to the model to correct any errors.

    b. JSON Structure:

    - Define the structure you want the LLM output to conform to.
    - Add properties to the data grid, specifying:
        - Property name
        - Data type (string, number, or boolean)
        - Description of the property

3. Connect the Structured Output Parser node to your LLM node in the workflow.
4. Run your workflow to see the parsed, structured output.

<!-- TODO: Add a screenshot of the Structured Output Parser node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/structuredoutputparser.png" alt="" /><figcaption><p> Structured Output Parser node configuration panel &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Be specific in your property descriptions to guide the LLM in generating appropriate content.
2. Start with a simple structure and gradually add complexity as needed.
3. Use the Autofix feature when dealing with complex structures or less reliable LLM outputs.
4. Test your parser with various LLM outputs to ensure it handles different scenarios correctly.
5. If you need nested or more structured outputs, consider using the [Advanced Structured Output Parser](advanced-structured-output-parser.md) node.

## Troubleshooting

1. Invalid JSON Structure:

    - Error: "Invalid JSON in StructuredOutputParser"
    - Solution: Double-check your JSON structure in the data grid. Ensure all properties have valid names and types.

2. Parsing Failures:

    - Issue: The parser fails to extract the desired information consistently.
    - Solution: Refine your property descriptions, simplify the structure, or enable the Autofix option.

3. Unexpected Output:
    - Issue: The parsed output doesn't match your expectations.
    - Solution: Review your LLM prompt and ensure it aligns with the structure you've defined in the parser.

## Example Usage

Here's a basic example of how to set up the JSON Structure:

1. Property: answer
   Type: string
   Description: Answer to the user's question

2. Property: source
   Type: string
   Description: Sources used to answer the question, should be websites

This structure will parse the LLM output into an object with 'answer' and 'source' fields, making it easy to use this information in subsequent steps of your workflow.

<!-- TODO: Add a screenshot of a sample workflow using the Structured Output Parser -->
<figure><img src="/.gitbook/assets/screenshots/structuredoutputparserinaworkflow.png" alt="" /><figcaption><p> Structured Output Parser node In a workflow &#x26; Drop UI</p></figcaption></figure>

By using the Structured Output Parser, you can transform raw LLM responses into clean, structured data, enhancing the capabilities and reliability of your AnswerAgentAI workflows.
