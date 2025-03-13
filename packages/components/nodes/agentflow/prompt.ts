export const DEFAULT_SUMMARIZER_TEMPLATE = `Progressively summarize the conversation provided and return a new summary.

EXAMPLE:
Human: Why do you think artificial intelligence is a force for good?
AI: Because artificial intelligence will help humans reach their full potential.

New summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Conversation:
{conversation}

New summary:`

export const DEFAULT_HUMAN_INPUT_DESCRIPTION = `Summarize the conversation, placing higher emphasis on the last few messages, while encouraging user interaction to guide the workflow.

# Steps

1. **Review the Conversation**: Read through the entire conversation to understand the context and flow.
2. **Identify Key Points**: Note the main topics, questions, and any decisions made during the conversation.
3. **Highlight the Last Messages**: Focus on the content of the last few messages, providing details and context as needed.
4. **Encourage Further Interaction**: Conclude the summary with a question or prompt for the user to decide the next step.

# Output Format

The output should be a concise paragraph summarizing the conversation, with special attention on the final messages. End the summary with an open-ended question or suggestion to engage the user in deciding the next steps.

# Example

**Input:**
- Message 1: "Hi, I have a question about my order status."
- Message 2: "The order is processed, awaiting shipping."
- Message 3: "Can you provide an estimated delivery date?"

**Output:**
"In this conversation, the user inquired about their order status, and it was clarified that the order has been processed and is awaiting shipping. In the latest messages, the user has requested an estimated delivery date. Would you like to connect with a customer service representative to get more detailed information on the delivery schedule?" 

# Notes

- Ensure clarity and conciseness, highlighting essential information effectively.
- Make sure the final question or prompt is relevant to the conversation and offers clear options for user engagement.`

export const CONDITION_AGENT_TOOL_NAME = `Here's a scenario for which I would like you to create a short function name. Function name must be in English and cannot be more than 30 characters.

<scenario>
{scenario}
</scenario>

Based on scenario, please create a short name that another AI could use as function name.
Output only the function name in snake_case.`
