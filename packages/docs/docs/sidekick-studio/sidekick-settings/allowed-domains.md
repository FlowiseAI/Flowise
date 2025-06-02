---
description: Allowed Domains
---

# Allowed Domains

The `AllowedDomains` component is a crucial part of the chatbot configuration interface. It allows administrators to control and manage the domains from which the chatbot can be accessed.

## Purpose

This component serves two main purposes:

1. **Domain Restriction**: It enables you to specify which domains are allowed to use your chatbot.
2. **Custom Error Message**: It allows you to set a custom error message for unauthorized domain access attempts.

## Features

### Allowed Domains List

-   **Add Domains**: You can add multiple domains where your chatbot is allowed to run.
-   **Remove Domains**: Each domain entry can be removed individually.
-   **Format**: Domains should be entered in the format `https://example.com`.

### Error Message Customization

-   You can set a custom error message that will be displayed when someone tries to access the chatbot from an unauthorized domain.

## How to Use

1. **Adding Allowed Domains**:

    - Enter the full URL of the allowed domain (e.g., `https://example.com`) in the input field.
    - Click the '+' icon to add more domain fields if needed.

2. **Removing Domains**:

    - Click the trash icon next to any domain to remove it from the list.

3. **Setting Custom Error Message**:

    - Enter your desired error message in the "Error Message" field.
    - This message will be shown to users who try to access the chatbot from unauthorized domains.

4. **Saving Changes**:
    - After making your desired changes, click the "Save" button to apply the settings.

## Important Notes

-   Ensure that all domains where you intend to use the chatbot are listed.
-   The chatbot will only function on the domains specified in this list.
-   If no domains are specified, the chatbot may be inaccessible.
-   Changes take effect immediately after saving.

## Security Implications

This feature enhances the security of your chatbot by restricting its usage to specific domains, preventing unauthorized embedding or access from unintended websites.
