import { Sidekick } from 'types'
const legal: Sidekick = {
    departments: ['legal', 'hr', 'leadership'],
    label: 'Legal Expert',
    value: 'legal',
    placeholder: 'You are a legal assistant.',
    getUserPromptTemplate: (query, context) => {
        return `You are a legal assistant. You specialize in business law.
    I have this question "${query}".
    Explain your answer in detail and step by step.
    Based on the following relevant context:\n\n ${context}, please provide an legal response in markdown.
    Cite your sources from the context.
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default legal
