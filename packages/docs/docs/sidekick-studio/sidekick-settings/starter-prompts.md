---
description: Learn how to manage starter prompts in AnswerAgentAI
---

# Starter Prompts Settings

The `StarterPrompts` component allows administrators to configure conversation starter prompts for their chatbot. These prompts are designed to help initiate conversations and guide users when they first interact with the chatbot.

## Purpose

The main purpose of this component is to provide a way for chatbot administrators to set up pre-defined prompts or questions that will be displayed to users when they start a new conversation with the chatbot. This feature is particularly useful for:

1. Guiding users on how to begin interacting with the chatbot
2. Suggesting common topics or questions that the chatbot can assist with
3. Improving user engagement by providing clear starting points for conversations

## Features

### Dynamic Prompt Management

-   Add multiple starter prompts
-   Remove individual prompts
-   Edit existing prompts

### Flexible Configuration

-   No limit on the number of starter prompts that can be added
-   Each prompt can be customized to fit specific use cases or common user inquiries

## How to Use

1. **Accessing the Settings**:

    - Navigate to the chatflow configuration interface.
    - Locate the "Starter Prompts" section.

2. **Adding Starter Prompts**:

    - Enter a prompt in the provided input field.
    - Click the '+' icon to add more prompt fields.

3. **Editing Prompts**:

    - Simply type in the input field to modify an existing prompt.

4. **Removing Prompts**:

    - Click the trash icon next to a prompt to remove it.
    - Note: You must have at least one prompt field (even if it's empty).

5. **Saving Changes**:
    - After configuring the starter prompts, click the "Save" button to apply the changes.
    - A success message will appear if the settings are saved successfully.

## Where Starter Prompts Appear

Starter prompts are displayed in the chatbot interface under the following conditions:

-   When a user starts a new conversation with the chatbot
-   When there are no existing messages in the chat history

The prompts typically appear as clickable suggestions or buttons that users can select to initiate a conversation based on those topics.

## Usefulness

Starter prompts are valuable for several reasons:

1. **User Guidance**: They help users understand what kind of questions or topics the chatbot can assist with.
2. **Reduced User Friction**: By providing clickable options, users can quickly start a conversation without having to think of how to phrase their first message.
3. **Increased Engagement**: Prompts can showcase the chatbot's capabilities, encouraging users to explore various features or topics.
4. **Consistency**: They ensure that users are directed towards topics that the chatbot is well-equipped to handle.
5. **Customization**: Administrators can tailor the prompts to match specific use cases, industries, or common user needs.

## Important Notes

-   Starter prompts will only be shown when there are no messages in the chat history.
-   Changes take effect immediately after saving.
-   You can add as many prompts as needed, but consider keeping the list concise for better user experience.
-   Regularly review and update your starter prompts based on user interactions and feedback.

## Technical Details

-   The component uses Redux for state management and dispatching actions.
-   Starter prompts are stored in the `chatbotConfig` field of the chatflow data as a JSON string.
-   When saved, the configuration is updated via an API call to `updateChatflow`.

## Error Handling

If an error occurs while saving the settings, an error message will be displayed with details about the failure.

## Best Practices

1. Keep prompts clear and concise.
2. Use action-oriented language that encourages users to engage.
3. Cover a range of common topics or questions relevant to your chatbot's purpose.
4. Regularly analyze which prompts are most frequently used and adjust accordingly.
5. Consider localizing prompts if your chatbot supports multiple languages.
