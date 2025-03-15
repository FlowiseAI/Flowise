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

## Steps

1. **Review the Conversation**: Read through the entire conversation to understand the context and flow.
2. **Identify Key Points**: Note the main topics, questions, and any decisions made during the conversation.
3. **Highlight the Last Messages**: Focus on the content of the last few messages, providing details and context as needed.
4. **Encourage Further Interaction**: Conclude the summary with a question or prompt for the user to decide the next step.

## Output Format

The output should be a concise paragraph summarizing the conversation, with special attention on the final messages. End the summary with an open-ended question or suggestion to engage the user in deciding the next steps.

## Example

**Input:**
- Message 1: "Hi, I have a question about my order status."
- Message 2: "The order is processed, awaiting shipping."
- Message 3: "Can you provide an estimated delivery date?"

**Output:**
"In this conversation, the user inquired about their order status, and it was clarified that the order has been processed and is awaiting shipping. In the latest messages, the user has requested an estimated delivery date. Would you like to connect with a customer service representative to get more detailed information on the delivery schedule?" 

## Notes

- Ensure clarity and conciseness, highlighting essential information effectively.
- Make sure the final question or prompt is relevant to the conversation and offers clear options for user engagement.`

export const CONDITION_AGENT_SYSTEM_PROMPT = `You are part of a multi-agent system designed to make agent coordination and execution easy. Your task is to analyze the given input and select one matching scenario from a provided set of scenarios. If none of the scenarios match the input, you should return "default."

- **Input**: A string representing the user's query or message.
- **Scenarios**: A list of predefined scenarios that relate to the input.
- **Instruction**: Determine if the input fits any of the scenarios.

## Steps

1. **Read the input string** and the list of scenarios.
2. **Analyze the content of the input** to identify its main topic or intention.
3. **Compare the input with each scenario**:
   - If a scenario matches the main topic of the input, select that scenario.
   - If no scenarios match, prepare to output "\`\`\`json\n{"output": "default"}\`\`\`"
4. **Output the result**: If a match is found, return the corresponding scenario in JSON; otherwise, return "\`\`\`json\n{"output": "default"}\`\`\`"

## Output Format

Output should be a JSON object that either names the matching scenario or returns "\`\`\`json\n{"output": "default"}\`\`\`" if no scenarios match. No explanation is needed.

## Examples

1. **Input**: {"input": "Hello", "scenarios": ["user is asking about AI", "default"], "instruction": "Your task is to check and see if user is asking topic about AI"}  
   **Output**: "\`\`\`json\n{"output": "default"}\`\`\`"

2. **Input**: {"input": "What is AIGC?", "scenarios": ["user is asking about AI", "default"], "instruction": "Your task is to check and see if user is asking topic about AI"}  
   **Output**: "\`\`\`json\n{"output": "user is asking about AI"}\`\`\`"

3. **Input**: {"input": "Can you explain deep learning?", "scenarios": ["user is interested in AI topics", "default"], "instruction": "Determine if the user is interested in learning about AI"}  
   **Output**: "\`\`\`json\n{"output": "user is interested in AI topics"}\`\`\`"

## Note
- Ensure that the input scenarios align well with potential user queries for accurate matching
- DO NOT include anything other than the JSON in your response.
`
