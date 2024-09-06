---
description: Use custom fine-tuned OpenAI models or try new models with AnswerAI
---

# ChatOpenAI Custom

## Overview

The ChatOpenAI Custom feature allows you to use custom fine-tuned OpenAI models or experiment with new models before they are officially added to AnswerAI's OpenAI model selection. This feature provides flexibility for advanced users who want to leverage their own fine-tuned models or test cutting-edge OpenAI offerings.

## Key Benefits

-   Use custom fine-tuned OpenAI models tailored to your specific needs
-   Experiment with new OpenAI models before they're officially supported in AnswerAI
-   Customize various parameters to optimize model performance

## How to Use

1. In the AnswerAI interface, locate and select the "ChatOpenAI Custom" node from the "Chat Models" category.

2. Configure the node with the following settings:

    a. Connect Credential: Link your OpenAI API credential (optional).

    b. Model Name: Enter the name of your custom or new model (e.g., "ft:gpt-3.5-turbo:my-org:custom_suffix:id").

    c. Temperature: Set the randomness of the model's output (default: 0.9).

    d. Max Tokens: Specify the maximum number of tokens in the response (optional).

    e. Additional Parameters: Configure advanced settings like Top Probability, Frequency Penalty, Presence Penalty, Timeout, BasePath, and BaseOptions as needed.

3. Connect the ChatOpenAI Custom node to other nodes in your AnswerAI workflow.

4. Run your workflow to utilize the custom or new OpenAI model.

<!-- TODO: Add a screenshot of the ChatOpenAI Custom node configuration panel -->
 <figure><img src="/.gitbook/assets/screenshots/chatopenai custom node configuration.png" alt="" /><figcaption><p> ChatOpenAI Custom Node Configuration &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. When using fine-tuned models, ensure you use the correct model name format: "ft:base-model:org:custom-name:id".

2. Experiment with different temperature settings to find the right balance between creativity and coherence for your use case.

3. Use the BaseOptions parameter to pass any additional configuration options supported by the OpenAI API.

4. Keep your API key secure and never share it publicly.

## Troubleshooting

1. Model not found: Double-check the model name and ensure it's correctly formatted for fine-tuned models.

2. API errors: Verify your OpenAI API key is valid and has the necessary permissions to access the specified model.

3. Unexpected results: Adjust the temperature and other parameters to fine-tune the model's output.

## Important Notes

-   This feature does not support streaming responses. If you require streaming, use the standard OpenAI models provided in AnswerAI.

-   Custom models may have different token limits or capabilities compared to standard OpenAI models. Refer to your model's documentation for specific details.

-   Be aware of any additional costs associated with using custom or experimental models through the OpenAI API.

By using the ChatOpenAI Custom feature, you can harness the power of specialized models and stay at the forefront of AI technology within your AnswerAI workflows.
