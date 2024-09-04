---
description: Chat Feedback
---

# Chat Feedback

The `ChatFeedback` component allows administrators to configure feedback options for the chatbot interface. This component is part of the chatbot configuration settings.

## Purpose

The main purpose of this component is to enable or disable the chat feedback feature in the chatbot interface.

## Features

### Enable/Disable Chat Feedback

-   A simple toggle switch allows you to turn the chat feedback feature on or off.
-   When enabled, users will have the ability to provide feedback on the chatbot's responses.

## How to Use

1. **Accessing the Settings**:

    - Navigate to the chatbot configuration interface.
    - Locate the "Chat Feedback" section.

2. **Enabling/Disabling Chat Feedback**:

    - Use the toggle switch labeled "Enable chat feedback" to turn the feature on or off.
    - When the switch is on (blue), chat feedback is enabled.
    - When the switch is off (gray), chat feedback is disabled.

3. **Saving Changes**:
    - After adjusting the setting, click the "Save" button to apply your changes.
    - A success message will appear if the settings are saved successfully.

## Important Notes

-   Changes take effect immediately after saving.
-   If you encounter any errors while saving, an error message will be displayed with details.
-   The chat feedback status is stored as part of the chatbot's configuration and is associated with the specific chatflow.

## Technical Details

-   The component uses Redux for state management and dispatching actions.
-   The chat feedback status is stored in the `chatbotConfig` object within the chatflow data.
-   When saved, the configuration is updated via an API call to `updateChatflow`.

## Error Handling

If an error occurs while saving the settings, an error message will be displayed with the following information:

-   The reason for the failure (e.g., network error, server error)
-   Any specific error message returned by the server

## Security Implications

Enabling chat feedback allows users to provide input on the quality of the chatbot's responses. This can be valuable for improving the chatbot's performance, but it also opens a channel for user input. Ensure that any feedback data is handled securely and in compliance with relevant data protection regulations.
