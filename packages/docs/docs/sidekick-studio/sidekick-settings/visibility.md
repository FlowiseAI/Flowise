---
description: Learn how to manage visibility settings in AnswerAgentAI
---

# Visibility Settings

The `VisibilitySettings` component allows administrators and users to control the visibility and accessibility of their workflows within the Flowise platform. This component is crucial for managing who can view and interact with specific chatflows.

## Purpose

The main purpose of this component is to provide granular control over workflow visibility, enabling users to:

1. Manage privacy settings for individual workflows
2. Control access within an organization
3. Share workflows with the broader Flowise community
4. Make workflows available in public marketplaces or browser extensions

## Visibility Options

The component offers the following visibility options:

1. **Private**: Only visible to the workflow creator
2. **Organization**: Visible to all members of the creator's organization
3. **AnswerAgentAI**: Visible to AnswerAgentAI users
4. **Marketplace**: Available in the public marketplace
5. **Browser Extension**: Accessible via browser extension

## Features

### Dynamic Visibility Control

-   Users can select multiple visibility options for each workflow
-   Options can be toggled on and off independently

### Permission-Based Access

-   Certain visibility options may be disabled based on user permissions or organization settings
-   Tooltips provide information on how to enable restricted options

### Flagsmith Integration

-   Uses feature flags to control the availability of certain visibility options

## How to Use

1. **Accessing the Settings**:

    - Navigate to the workflow configuration interface
    - Locate the "Workflow visibility" section

2. **Selecting Visibility Options**:

    - Check the boxes next to the desired visibility options
    - Multiple options can be selected simultaneously

3. **Understanding Restrictions**:

    - Disabled options will have tooltips explaining why they're unavailable
    - Contact your organization admin to enable restricted options

4. **Saving Changes**:
    - After configuring the visibility settings, click the "Save" button to apply the changes
    - A success message will appear if the settings are saved successfully

## Importance of Visibility Settings

1. **Privacy Control**: Allows users to keep sensitive or experimental workflows private
2. **Collaboration**: Enables sharing within an organization for team collaboration
3. **Community Contribution**: Facilitates sharing valuable workflows with the broader Flowise community
4. **Marketplace Presence**: Allows users to make their workflows available for public use or purchase
5. **Extended Accessibility**: Enables workflows to be accessed via browser extensions for easier use

## Technical Details

-   The component uses Redux for state management and dispatching actions
-   Visibility settings are stored in the `visibility` field of the chatflow data
-   When saved, the configuration is updated via an API call to `updateChatflow`
-   Feature flags from Flagsmith control the availability of certain visibility options

## Error Handling

If an error occurs while saving the settings, an error message will be displayed with details about the failure.

## Best Practices

1. Regularly review and update visibility settings for your workflows
2. Use the most restrictive visibility setting necessary for each workflow
3. Coordinate with your organization admin to enable additional visibility options if needed
4. Consider the implications of making workflows public or available in marketplaces
5. Use organization-wide visibility for collaborative projects within your team

## Security Implications

-   Carefully consider the sensitivity of your workflow data before changing visibility settings
-   Be aware that public or marketplace workflows may be accessed by unknown users
-   Ensure that any sensitive information or API keys are not exposed in public workflows

By properly configuring visibility settings, users can maintain control over their workflows while leveraging the collaborative and community-driven aspects of the Flowise platform.
