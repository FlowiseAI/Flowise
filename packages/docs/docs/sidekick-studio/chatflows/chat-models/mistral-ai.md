---
description: Integrate Mistral AI's powerful chat models into your AnswerAgentAI workflows
---

# ChatMistralAI

## Overview

ChatMistralAI is a powerful integration that allows you to use Mistral AI's advanced language models within your AnswerAgentAI workflows. This feature enables you to leverage state-of-the-art natural language processing capabilities for various tasks such as text generation, conversation, and more.

## Key Benefits

-   Access to cutting-edge language models from Mistral AI
-   Seamless integration with other AnswerAgentAI components
-   Customizable parameters for fine-tuned outputs

## How to Use

Follow these steps to set up and use the ChatMistralAI feature in AnswerAgentAI:

1. **Prerequisites**

    - Create a Mistral AI account at [https://mistral.ai/](https://mistral.ai/)
    - Generate an API key from the [Mistral AI console](https://console.mistral.ai/user/api-keys/)

2. **Add ChatMistralAI to Your Workflow**
    - In the AnswerAgentAI interface, navigate to the "Chat Models" section
    - Drag and drop the "ChatMistralAI" node into your workflow canvas

<!-- TODO: Screenshot of dragging ChatMistralAI node into the workflow -->
<figure><img src="/.gitbook/assets/screenshots/chatmistralai.png" alt="" /><figcaption><p> ChatMistral AI Node &#x26; Drop UI</p></figcaption></figure>
3. **Configure Credentials**
   - Click on the ChatMistralAI node to open its settings
   - Under "Connect Credential", click "Create New"
   - Enter a name for your credential (e.g., "MistralAI API Key")
   - Paste your Mistral AI API key into the designated field
   - Click "Save" to store your credential securely

<!-- TODO: Screenshot of the credential configuration dialog -->
<figure><img src="/.gitbook/assets/screenshots/chatmistral node configuration credentials.png" alt="" /><figcaption><p> ChatMistral AI Node Configuration &#x26; Drop UI</p></figcaption></figure>

4. **Adjust Model Parameters**

    - In the ChatMistralAI node settings, you can customize various parameters:
        - Model Name: Choose from available Mistral AI models
        - Temperature: Adjust the randomness of the output (0.0 to 1.0)
        - Max Output Tokens: Set a limit on the generated text length
        - Top Probability: Fine-tune the token selection process
        - Random Seed: Ensure reproducible results (optional)
        - Safe Mode: Enable or disable content filtering
        - Override Endpoint: Use a custom API endpoint (advanced users)

5. **Connect to Other Nodes**
    - Link the ChatMistralAI node to other components in your workflow
    - Use the output from ChatMistralAI as input for subsequent processing or actions

## Tips and Best Practices

1. Experiment with different temperature settings to find the right balance between creativity and coherence for your use case.
2. Use the Max Output Tokens parameter to control the length of generated content and manage API usage.
3. Enable Safe Mode when working with potentially sensitive or public-facing applications.
4. Leverage the Random Seed parameter for consistent outputs in testing or when reproducibility is important.

## Troubleshooting

1. **API Key Issues**

    - Ensure your Mistral AI API key is correctly entered in the credential settings
    - Check that your API key has not expired or been revoked in the Mistral AI console

2. **Model Availability**

    - If a specific model is unavailable, it may be undergoing maintenance or updates. Try selecting a different model or check the Mistral AI status page for any announcements.

3. **Unexpected Outputs**

    - Review your input prompts and adjust the temperature or top probability settings
    - Consider using a different model that may be more suitable for your specific task

4. **Rate Limiting**
    - If you encounter rate limit errors, review your Mistral AI account usage and consider upgrading your plan if necessary

For any persistent issues or advanced configurations, refer to the [Mistral AI documentation](https://docs.mistral.ai/) or contact AnswerAgentAI support for assistance.
