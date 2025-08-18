---
description: Learn how to use the Tool Agent in AnswerAgentAI
---

# Tool Agent

## Overview

The Tool Agent is an advanced AI assistant that uses Function Calling to select and execute appropriate tools based on user input. It's designed to handle complex tasks by breaking them down into steps and utilizing various tools to accomplish the goal.

## Key Benefits

-   Flexible problem-solving: Can tackle a wide range of tasks by combining different tools.
-   Intelligent decision-making: Chooses the most appropriate tools for each step of a task.
-   Memory integration: Maintains context across multiple interactions for more coherent conversations.

## How to Use

1. Configure the Tool Agent with the following required inputs:

    - Tools: Select the tools you want the agent to have access to.
    - Memory: Choose a memory component to maintain conversation history.
    - Tool Calling Chat Model: Select a compatible language model (e.g., ChatOpenAI, ChatMistral, ChatAnthropic).

2. (Optional) Configure additional parameters:

    - System Message: Customize the agent's behavior with specific instructions.
    - Input Moderation: Add moderation checks to prevent harmful content.
    - Max Iterations: Set a limit on the number of tool-using steps the agent can take.

3. Connect the Tool Agent node to your AnswerAgentAI workflow.

4. Run your workflow and interact with the Tool Agent by providing input queries or tasks.

<figure><img src="/.gitbook/assets/screenshots/toolagent.png" alt="" /><figcaption><p>Tool Agent &#x26; Drop UI</p></figcaption></figure><!-- TODO: Add a screenshot of the Tool Agent configuration interface -->

## Tips and Best Practices

-   Choose a diverse set of tools to give the agent more problem-solving capabilities.
-   Use a memory component to maintain context in long conversations.
-   Customize the system message to fine-tune the agent's behavior for specific use cases.
-   Monitor the agent's performance and adjust the max iterations if needed to balance thoroughness with efficiency.

## Troubleshooting

-   If the agent is not using tools as expected, check that the selected language model supports function calling.
-   For vision-related tasks, ensure you're using a compatible model and have properly configured image inputs.
-   If the agent seems to be stuck in a loop, try adjusting the max iterations parameter.

## Technical Details

The Tool Agent uses a sophisticated process to handle user inputs:

1. It first applies any configured input moderation to filter out potentially harmful content.
2. The agent then uses a chat prompt template that incorporates system instructions, conversation history, and user input.
3. For models supporting vision capabilities, it can process and incorporate image data into the conversation.
4. The agent uses the selected language model to determine which tools to use and how to use them.
5. It executes the chosen tools and can iterate multiple times to solve complex problems.
6. Finally, it formats the response and can include details about used tools and source documents.

<!-- TODO: Add a diagram showing the Tool Agent's decision-making process -->

Remember that the Tool Agent is a powerful feature that can handle complex tasks, but it may require some experimentation and fine-tuning to achieve optimal results for your specific use case.
