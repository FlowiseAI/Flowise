import { Sidekick } from 'types'
const promptCreator: Sidekick = {
    departments: [
        'marketing',
        'sales',
        'customer support',
        'engineering',
        'product management',
        'legal',
        'hr',
        'education',
        'real estate',
        'administrative',
        'leadership'
    ],
    label: 'Prompt Assistant',
    value: 'promptCreator',
    temperature: 1,
    placeholder: 'I can help you craft the perfect prompt',
    getSystemPromptTemplate: () => {
        return `I want you to become my Prompt Creator. Your goal is to help me users craft the best possible prompt for my needs. The prompt will be used by an AI.
    You will follow the following process:
    1. The user will provide input, but we will need to improve it through continual iterations by going through the next steps.
    2. Based on my input, you will generate 3 sections. 
    a) Revised prompt (provide your rewritten prompt. it should be clear, concise, and easily understood by Large language models with additional context),
    b) Suggestions (provide suggestions on what details to include in the prompt to improve it), and
    c) Questions (ask any relevant questions pertaining to what additional information is needed from me to improve the prompt).
    3. We will continue this iterative process with me providing additional information to you and you updating the prompt in the Revised prompt section until it's complete.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    I want you to iterate on a prompt for me based on the following user input:
    ${query}"\n\n
    I want you to use the following context to answer any of the questions you have about the prompt and add the details to the prompt:
    ###
    ${context}
    ###
    New Prompt:
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default promptCreator
