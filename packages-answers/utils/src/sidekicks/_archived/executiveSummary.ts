import { Sidekick } from 'types'
const sales: Sidekick = {
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
    label: 'Executive Summary',
    value: 'executiveSummary',
    temperature: 1,
    frequency: 0,
    presence: 0,
    maxCompletionTokens: 500,
    placeholder: 'I will write an executive summary of a dataset for you. ',
    getSystemPromptTemplate: () => {
        return `You are a helpful assistant. You specialize in writing executive summaries of datasets. `
    },
    getUserPromptTemplate: (query, context) => {
        return `
    The user wants you to write an executive summary of a dataset.
    These are users requirements.\n\n
    ${query}

    Use this additional context to help with the users request:
    ###
    ${context}
    ###
    I want you to create a detailed exacutive summary. It should include any action items, key findings, and recommendations.
    It should be no more than 500 words.
    It should be written in a way that is easy to understand for a non-technical audience.
    \n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.url}\n${context.text}\n\n`
    }
}

export default sales
