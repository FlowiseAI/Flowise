---
description: AWS ChatBedrock - Chat Models for AnswerAgentAI
---

# AWS ChatBedrock

## Overview

AWS ChatBedrock is a powerful integration in AnswerAgentAI that allows you to use Amazon Web Services (AWS) Bedrock large language models for chat-based applications. This feature provides access to advanced AI models like Claude 3, enabling you to create sophisticated conversational experiences.

## Key Benefits

-   Access to state-of-the-art AWS Bedrock language models
-   Flexible configuration options for optimal performance
-   Support for multi-modal interactions, including image uploads (with compatible models)

## How to Use

Follow these steps to set up and use AWS ChatBedrock in AnswerAgentAI:

1. Navigate to the Chat Models section in AnswerAgentAI.
2. Locate and select the "AWS ChatBedrock" node.

3. Configure the following settings:

    - AWS Credential: (Optional) Select your AWS API credential if you have one set up.
    - Cache: (Optional) Choose a cache option if desired.
    - Region: Select the AWS region you want to use (e.g., "us-east-1").
    - Model Name: Choose from available AWS Bedrock models (e.g., "anthropic.claude-3-haiku").
    - Custom Model Name: (Optional) Enter a custom model name to override the selected Model Name.

4. Adjust additional parameters as needed:

    - Temperature: Set the creativity level of the model's responses (default: 0.7).
    - Max Tokens to Sample: Specify the maximum number of tokens for the model to generate (default: 200).
    - Allow Image Uploads: Enable this option for multi-modal interactions with compatible Claude 3 models.

5. Connect the AWS ChatBedrock node to other components in your AnswerAgentAI workflow.

6. Run your workflow to start using AWS ChatBedrock for generating responses.

<!-- TODO: Screenshot of the AWS ChatBedrock node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/aws chatbedrock node.png" alt="" /><figcaption><p>AWS Chatbedrock Configuration &#x26; Drop UI</p></figcaption></figure>
<figure><img src="/.gitbook/assets/screenshots/aws chatbedrock in a workflow.png" alt="" /><figcaption><p>AWS Chatbedrock Node in a workflow &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Choose the appropriate region based on your location or compliance requirements.
2. Experiment with different temperature values to find the right balance between creativity and coherence in responses.
3. Adjust the Max Tokens to Sample based on the desired length of the model's output.
4. When using Claude 3 models, enable the "Allow Image Uploads" option for multi-modal capabilities in compatible chains and agents.
5. If you have specific AWS credentials, make sure to set them up in the AnswerAgentAI credential manager for secure access.

## Troubleshooting

1. Model not available:

    - Ensure you have the necessary permissions in your AWS account to access the selected model.
    - Verify that the chosen model is available in the selected region.

2. Credential issues:

    - Double-check that your AWS API credentials are correctly set up in AnswerAgentAI.
    - If using environment-based credentials, ensure they are properly configured on your system.

3. Unexpected responses:

    - Adjust the temperature and max tokens parameters to fine-tune the model's output.
    - Verify that your input prompts are clear and well-structured for optimal results.

4. Image upload not working:
    - Confirm that you're using a Claude 3 model and have enabled the "Allow Image Uploads" option.
    - Check that you're using a compatible chain or agent (e.g., LLMChain, Conversation Chain, ReAct Agent, or Conversational Agent).

By following this guide, you'll be able to harness the power of AWS ChatBedrock models in your AnswerAgentAI workflows, creating sophisticated chat-based applications with ease.
