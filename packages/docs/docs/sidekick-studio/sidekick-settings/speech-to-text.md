---
description: Learn how to manage speech-to-text in AnswerAgentAI
---

# Speech to Text

The `SpeechToText` component allows administrators to configure speech-to-text functionality for their chatbot. This component is part of the chatbot configuration interface and enables the conversion of spoken language into written text.

## Purpose

The main purpose of this component is to enable administrators to set up and manage speech-to-text capabilities, allowing users to interact with the chatbot using voice input.

## Features

### Provider Selection

-   Allows you to choose from multiple speech-to-text providers:
    -   OpenAI Whisper
    -   Assembly AI
    -   LocalAI STT
-   Option to disable speech-to-text by selecting "None"

### Provider-Specific Configuration

Each provider has its own set of configuration options, which may include:

-   API Credentials
-   Language settings
-   Model selection
-   Advanced parameters (e.g., temperature, prompts)

## How to Use

1. **Accessing the Settings**:

    - Navigate to the chatflow configuration interface.
    - Locate the "Speech to Text" section.

2. **Selecting a Provider**:

    - Use the dropdown menu to select a speech-to-text provider.
    - Options include "None" (to disable), "OpenAI Whisper", "Assembly AI", and "LocalAI STT".

3. **Configuring Provider Settings**:

    - Once a provider is selected, its specific configuration options will appear.
    - Fill in the required fields and any optional parameters as needed.

4. **OpenAI Whisper Configuration**:

    - Connect OpenAI API credentials
    - Optionally set language, prompt, and temperature

5. **Assembly AI Configuration**:

    - Connect Assembly AI API credentials

6. **LocalAI STT Configuration**:

    - Connect LocalAI API credentials
    - Set the base URL for the local AI server
    - Optionally configure language, model, prompt, and temperature

7. **Saving Changes**:
    - After configuring the settings, click the "Save" button to apply the speech-to-text configuration.
    - A success message will appear if the settings are saved successfully.

## Important Notes

-   Only one speech-to-text provider can be active at a time.
-   Ensure that you have the necessary API credentials for the selected provider.
-   Some providers may require additional setup or have usage limits. Refer to the provider's documentation for more information.
-   The "Save" button will be disabled if a provider is selected but no credential is provided.

## Technical Details

-   The component uses Redux for state management and dispatching actions.
-   Speech-to-text settings are stored in the `speechToText` field of the chatflow data as a JSON string.
-   When saved, the configuration is updated via an API call to `updateChatflow`.

## Error Handling

If an error occurs while saving the settings, an error message will be displayed with details about the failure.

## Security Implications

-   Ensure that API credentials are kept secure and not exposed to unauthorized parties.
-   Be aware of the data privacy implications of using cloud-based speech-to-text services, especially when handling sensitive information.
-   For LocalAI STT, ensure that the local server is properly secured and accessible only to authorized systems.

## Customization

The speech-to-text functionality can be further customized by adjusting provider-specific parameters such as language, prompts, and temperature settings. These allow you to fine-tune the accuracy and behavior of the speech recognition for your specific use case.
