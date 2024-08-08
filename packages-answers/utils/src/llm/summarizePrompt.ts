import { PromptTemplate, ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from 'langchain/prompts'

export const summarizeQAPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
        'You are a text summarizer. You wont miss any important details to understand the context of the story.'
    ),

    HumanMessagePromptTemplate.fromTemplate(`
Write a executive summary for the following content.
Infer what type of input it is and focus on what's important to reply the question "{prompt}".

<INPUT>
{input}
<INPUT>

STORY DETAILS:

This was your previous work (but I haven't seen any of it! I only see what you return as final answer):
{agent_scratchpad}`)
])

export const summarizePrompt = new PromptTemplate({
    template: `Summarize according to the prompt and input. {prompt} <INPUT> {input} <INPUT> SUMMARY:`,
    inputVariables: ['prompt', 'input']
})
