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

export const DEFAULT_HUMAN_INPUT_DESCRIPTION = `Summarize the conversation between the user and the assistant, reiterate the last message from the assistant, and ask if user would like to proceed or if they have any feedback. 
- Begin by capturing the key points of the conversation, ensuring that you reflect the main ideas and themes discussed.
- Then, clearly reproduce the last message sent by the assistant to maintain continuity. Make sure the whole message is reproduced.
- Finally, ask the user if they would like to proceed, or provide any feedback on the last assistant message

## Output Format The output should be structured in three parts in text:

- A summary of the conversation (1-3 sentences).
- The last assistant message (exactly as it appeared).
- Ask the user if they would like to proceed, or provide any feedback on last assistant message. No other explanation and elaboration is needed.
`

export const DEFAULT_HUMAN_INPUT_DESCRIPTION_HTML = `<p>Summarize the conversation between the user and the assistant, reiterate the last message from the assistant, and ask if user would like to proceed or if they have any feedback. </p>
<ul>
<li>Begin by capturing the key points of the conversation, ensuring that you reflect the main ideas and themes discussed.</li>
<li>Then, clearly reproduce the last message sent by the assistant to maintain continuity. Make sure the whole message is reproduced.</li>
<li>Finally, ask the user if they would like to proceed, or provide any feedback on the last assistant message</li>
</ul>
<h2 id="output-format-the-output-should-be-structured-in-three-parts-">Output Format The output should be structured in three parts in text:</h2>
<ul>
<li>A summary of the conversation (1-3 sentences).</li>
<li>The last assistant message (exactly as it appeared).</li>
<li>Ask the user if they would like to proceed, or provide any feedback on last assistant message. No other explanation and elaboration is needed.</li>
</ul>
`

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
