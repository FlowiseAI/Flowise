---
description: Integrate Google's Gemini AI models for chat functionality in AnswerAI
---

# ChatGoogleGenerativeAI

## Overview

ChatGoogleGenerativeAI is a wrapper around Google's Gemini large language models that use the Chat endpoint. This feature allows you to integrate powerful AI-driven chat capabilities into your AnswerAI projects, leveraging Google's state-of-the-art language models.

## Key Benefits

-   Access to Google's advanced Gemini AI models for chat applications
-   Customizable settings for fine-tuning model behavior
-   Support for multimodal inputs, including text and images

## How to Use

1. Set up Google Generative AI credentials:

    - Obtain an API key from Google's Generative AI service
    - Configure the credential in AnswerAI, naming it 'googleGenerativeAI'

2. Add the ChatGoogleGenerativeAI node to your flow:

    - Locate the node in the 'Chat Models' category
    - Drag and drop it into your workspace

3. Configure the node:

    - Connect the Google Generative AI credential
    - Select the desired model (e.g., 'gemini-pro')
    - Adjust parameters like temperature, max output tokens, etc.

4. Connect the node:

    - Link the ChatGoogleGenerativeAI node to other nodes in your flow, such as user inputs or processing steps

5. Run your flow:
    - Test the chat functionality with sample inputs
    - Observe the AI-generated responses based on your configuration

<!-- TODO: Add a screenshot of the ChatGoogleGenerativeAI node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/chatgooglegenerativeai.png" alt="" /><figcaption><p> ChatGoogleGenerativeAI Node Configuration &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Model Selection: Choose the appropriate model for your use case. 'gemini-pro' is suitable for most text-based chat applications, while 'gemini-pro-vision' or 'gemini-1.5-pro-latest' support multimodal inputs including images.

2. Temperature Setting: Adjust the temperature (0.0 to 1.0) to control the randomness of the output. Lower values produce more deterministic responses, while higher values increase creativity.

3. Safety Settings: Utilize the Harm Category and Harm Block Threshold options to control the safety level of the generated content. Refer to the [official Google AI documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes) for detailed information on these settings.

4. Token Management: Set an appropriate value for Max Output Tokens to control the length of the generated responses and manage your API usage.

5. Image Handling: If your application requires image inputs, enable the "Allow Image Uploads" option. This automatically switches to a vision-capable model when images are uploaded in supported chain types.

## Troubleshooting

1. API Key Issues:

    - Ensure your Google Generative AI API key is correctly set up in the AnswerAI credentials.
    - Verify that the API key has the necessary permissions for the selected model.

2. Model Availability:

    - If a selected model is unavailable, check if it's supported in your region or if there are any service outages.

3. Content Filtering:

    - If responses are being filtered unexpectedly, review your safety settings and adjust the Harm Category and Harm Block Threshold options.

4. Performance Issues:

    - For slow responses, consider reducing the Max Output Tokens or adjusting other parameters that might impact processing time.

5. Image Upload Problems:
    - Ensure that images are provided as base64 encoded data URLs when using vision-capable models.
    - Verify that the "Allow Image Uploads" option is enabled for multimodal inputs.

For more advanced usage and detailed API documentation, refer to the [Google AI Gemini API documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference).
