---
description: Check whether content complies with OpenAI usage policies
---

# OpenAI Moderation

## Overview

The OpenAI Moderation node is a powerful tool in AnswerAgentAI that allows you to check whether content complies with OpenAI's usage policies. This feature is essential for maintaining ethical AI practices and ensuring that your generated content adheres to OpenAI's guidelines.

## Key Benefits

-   Ensures compliance with OpenAI's content policies
-   Helps maintain ethical AI practices in your workflows
-   Prevents potential misuse of AI-generated content

## How to Use

1. Add the OpenAI Moderation node to your canvas in the AnswerAgentAI Studio.

<!-- TODO: Screenshot of adding the OpenAI Moderation node to the canvas -->
<figure><img src="/.gitbook/assets/screenshots/openaimoderation.png" alt="" /><figcaption><p> OpenAI Moderation Node &#x26; Drop UI</p></figcaption></figure>

2. Connect your OpenAI API credential:
    - Click on the node to open its settings.
    - In the "Connect Credential" field, select your OpenAI API credential or create a new one if you haven't already.

<!-- TODO: Screenshot of connecting the OpenAI API credential -->
<figure><img src="/.gitbook/assets/screenshots/openaimoderationcredential.png" alt="" /><figcaption><p> OpenAI Credentials &#x26; Drop UI</p></figcaption></figure>

3. (Optional) Customize the error message:
    - In the node settings, locate the "Error Message" field.
    - Enter a custom error message that will be displayed if the content violates OpenAI's moderation policies.
    - If left blank, the default message will be used: "Cannot Process! Input violates OpenAI's content moderation policies."

<!-- TODO: Screenshot of customizing the error message -->
<figure><img src="/.gitbook/assets/screenshots/openaimoderationerrormsg.png" alt="" /><figcaption><p> OpenAI Customize Error Msg &#x26; Drop UI</p></figcaption></figure>

4. Connect the OpenAI Moderation node to other nodes in your workflow:
    - Connect the input of the OpenAI Moderation node to the node that generates or processes the content you want to moderate.
    - Connect the output of the OpenAI Moderation node to the next step in your workflow.

<!-- TODO: Screenshot of connecting the OpenAI Moderation node in a workflow -->
<figure><img src="/.gitbook/assets/screenshots/opoenaimoderationinaworkflow.png" alt="" /><figcaption><p> OpenAI Moderation Node in a Workflow &#x26; Drop UI</p></figcaption></figure>

5. Run your workflow to see the OpenAI Moderation node in action.

## Tips and Best Practices

1. Always use the OpenAI Moderation node before generating or processing content with OpenAI's models to ensure compliance.
2. Customize the error message to provide clear instructions to end-users when content is flagged.
3. Consider adding additional nodes after the OpenAI Moderation node to handle flagged content appropriately (e.g., logging, notifying administrators, or providing alternative responses).
4. Regularly review OpenAI's content policies to stay up-to-date with any changes that may affect your moderation settings.

## Troubleshooting

1. **Issue**: The OpenAI Moderation node is not working.
   **Solution**: Ensure that you have provided a valid OpenAI API key in the credential settings.

2. **Issue**: Content is being flagged incorrectly.
   **Solution**: Review OpenAI's content policies and adjust your input content accordingly. If you believe there's an error in the moderation, you can report it to OpenAI for review.

3. **Issue**: The custom error message is not displaying.
   **Solution**: Make sure you have entered the custom message correctly in the "Error Message" field and that there are no formatting issues.

By using the OpenAI Moderation node in your AnswerAgentAI workflows, you can ensure that your AI-generated content remains compliant with OpenAI's usage policies, promoting responsible and ethical AI practices.
