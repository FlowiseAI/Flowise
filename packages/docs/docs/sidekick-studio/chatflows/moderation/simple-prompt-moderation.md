---
description: Check and prevent sensitive input from being sent to the language model
---

# Simple Prompt Moderation

## Overview

The Simple Prompt Moderation feature in AnswerAgentAI allows you to implement a basic content filter for user inputs before they are processed by the language model. This feature helps maintain content safety and prevents potentially harmful or unwanted content from being processed.

## Key Benefits

-   Enhances content safety by filtering out unwanted or sensitive input
-   Customizable deny list to suit your specific moderation needs
-   Optional use of a language model for more advanced similarity detection

## How to Use

1. Add the Simple Prompt Moderation node to your AnswerAgentAI workflow canvas.

<!-- TODO: Screenshot of adding the Simple Prompt Moderation node to the canvas -->
<figure><img src="/.gitbook/assets/screenshots/simplepromptmoderaation.png" alt="" /><figcaption><p> Simple Prompt Moderation Node &#x26; Drop UI</p></figcaption></figure>

2. Configure the node with the following settings:

    a. Deny List: Enter the phrases or words you want to block, one per line.
    b. Chat Model (optional): Select a language model to use for similarity detection.
    c. Error Message (optional): Customize the error message displayed when moderation fails.

<!-- TODO: Screenshot of the Simple Prompt Moderation node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/simplepromptmoderaationconfiguration.png" alt="" /><figcaption><p> Simple Prompt Moderation Node Configuration Panel &#x26; Drop UI</p></figcaption></figure>

3. Connect the Simple Prompt Moderation node between your input source and the language model in your workflow.

<!-- TODO: Screenshot of a workflow with the Simple Prompt Moderation node properly connected -->
<figure><img src="/.gitbook/assets/screenshots/simplepromptmoderaationconfigurationinworkflow.png" alt="" /><figcaption><p> Simple Prompt Moderation Node In a workflow &#x26; Drop UI</p></figcaption></figure>

4. Run your workflow. The Simple Prompt Moderation node will check user inputs against the deny list before allowing them to proceed to the language model.

## Tips and Best Practices

1. Start with a basic deny list and refine it over time based on your specific use case and user behavior.
2. Use clear and specific phrases in your deny list to avoid false positives.
3. If you're using the optional Chat Model for similarity detection, choose a model that balances accuracy and performance for your needs.
4. Regularly review and update your deny list to ensure it remains effective and relevant.
5. Consider using more advanced moderation techniques in combination with this simple approach for comprehensive content filtering.

## Troubleshooting

1. Issue: Legitimate inputs are being blocked
   Solution: Review your deny list and remove or modify overly broad or common phrases that might cause false positives.

2. Issue: Unwanted content is still getting through
   Solution: Add more specific phrases to your deny list or consider using the optional Chat Model for more advanced detection.

3. Issue: Moderation is slowing down the workflow
   Solution: If you're using the Chat Model option, try a smaller or faster model. Alternatively, simplify your deny list to focus on the most critical terms.

4. Issue: Error message is not displaying correctly
   Solution: Check the "Error Message" field in the node configuration and ensure it contains the desired text.

Remember, while the Simple Prompt Moderation feature provides a good starting point for content filtering, it's important to continuously monitor and adjust your moderation strategy to ensure the best balance between safety and usability in your AnswerAgentAI workflows.
