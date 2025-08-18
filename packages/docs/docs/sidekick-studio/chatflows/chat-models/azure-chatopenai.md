---
description: Azure ChatOpenAI - Chat Models for AnswerAgentAI
---

# Azure ChatOpenAI

## Overview

Azure ChatOpenAI is a powerful feature in AnswerAgentAI that allows you to interact with Azure OpenAI's large language models using the Chat endpoint. This integration enables you to leverage the advanced capabilities of Azure's AI services within your AnswerAgentAI workflows.

## Key Benefits

-   Access to state-of-the-art language models hosted on Azure
-   Seamless integration with AnswerAgentAI's existing features
-   Customizable parameters for fine-tuned AI responses

## How to Use

1. Connect your Azure OpenAI API credential:

    - Click on the "Connect Credential" option
    - Select or create an "azureOpenAIApi" credential
    - Enter your Azure OpenAI API key, instance name, deployment name, and API version

2. Configure the model settings:

    - Select the desired model name from the dropdown list
    - Adjust the temperature (default: 0.9) to control response randomness
    - Set optional parameters such as max tokens, top probability, and penalties

3. Enable additional features (optional):

    - Toggle "Allow Image Uploads" to enable image processing capabilities
    - Select the preferred image resolution (Low, High, or Auto)

4. Integrate the Azure ChatOpenAI node into your AnswerAgentAI workflow

<!-- TODO: Screenshot of the Azure ChatOpenAI node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/azure chatopen ai node configuration.png" alt="" /><figcaption><p>Azure ChatOpenAI Configuration &#x26; Drop UI</p></figcaption></figure>

<figure><img src="/.gitbook/assets/screenshots/azure chatopen ai in a workflow.png" alt="" /><figcaption><p>Azure ChatOpenAI Node in a workflow &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Experiment with different temperature settings to find the right balance between creativity and coherence in the AI's responses.
2. Use the max tokens parameter to control the length of the generated responses.
3. Enable image uploads when working with visual content to leverage multimodal capabilities.
4. Adjust frequency and presence penalties to fine-tune the AI's response style and repetitiveness.

## Troubleshooting

1. If you encounter authentication errors:

    - Double-check your Azure OpenAI API credentials
    - Ensure your Azure subscription has access to the selected model

2. If responses are cut off:

    - Increase the max tokens parameter
    - Check if you're hitting Azure OpenAI API rate limits

3. For slow response times:
    - Consider adjusting the timeout parameter
    - Verify your network connection to Azure services

Remember to refer to the Azure OpenAI documentation for more detailed information on API usage and best practices.

<!-- TODO: Add a screenshot of a successful Azure ChatOpenAI interaction in AnswerAgentAI -->
