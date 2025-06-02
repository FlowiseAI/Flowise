---
description: General
---

# General Settings

The `GeneralSettings` component allows administrators to configure general settings for a chatflow. This component is part of the chatbot configuration interface.

## Purpose

The main purpose of this component is to enable users to edit basic information about a chatflow, including its title, description, categories, and display mode.

## Features

### Chatflow Title

-   Allows you to set or change the title of the chatflow.
-   This title is used to identify the chatflow in various parts of the application.

### Description

-   Provides a text area to add or edit a detailed description of the chatflow.
-   This can be used to explain the purpose or functionality of the chatflow.

### Categories

-   Allows you to add, edit, or remove categories associated with the chatflow.
-   Categories are useful for organizing and filtering chatflows.

### Display Mode

-   **Chatbot**: Display the chatflow as an interactive chatbot interface.
-   **Embedded Form**: Display an embedded form within an iframe.
    -   When "Embedded Form" is selected, you can specify the URL of the page to embed.
    -   The embedded URL will be displayed in the user interface where the chatbot would normally appear.

## How to Use

1. **Accessing the Settings**:

    - Navigate to the chatflow configuration interface.
    - Locate the "General Settings" section.

2. **Editing the Chatflow Title**:

    - Enter or modify the title in the "Chatflow Title" text field.

3. **Editing the Description**:

    - Enter or modify the description in the "Description" text area.
    - This field supports multiple lines of text.

4. **Managing Categories**:

    - Use the tag input field to add, edit, or remove categories.
    - Type a category name and press Enter to add it.
    - Click on the 'x' next to a category to remove it.

5. **Setting the Display Mode**:

    - In the "Display Mode" section, choose between "Chatbot" and "Embedded Form".
    - If you select "Embedded Form":
        - An input field labeled "Embedded URL" will appear.
        - Enter the URL of the page you wish to embed.
        - This URL will be shown in the user interface within an iframe.

6. **Saving Changes**:
    - After making your desired changes, click the "Save" button to apply the settings.
    - A success message will appear if the settings are saved successfully.

## Important Notes

-   Changes take effect immediately after saving.
-   If you encounter any errors while saving, an error message will be displayed.
-   The chatflow title, description, categories, and display mode settings are stored as part of the chatflow data.
-   When using the "Embedded Form" display mode, ensure that the URL provided is valid and allows embedding.

## Technical Details

-   The component uses Redux for state management and dispatching actions.
-   When saved, the configuration is updated via an API call to `updateChatflow`.
-   Categories are stored as a semicolon-separated string in the backend.
-   Display mode and embedded URL settings are stored in the chatflow's configuration.

## Error Handling

If an error occurs while saving the settings, an error message will be displayed indicating that the update failed.

## Security Implications

-   Be cautious when embedding external URLs. Ensure that the embedded content is from a trusted source.
-   Some websites may prevent embedding via iframe due to security policies.
-   Ensure that any information entered doesn't contain confidential or sensitive details, as it may be visible to users with access to the chatflow configuration.
