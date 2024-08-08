import { Sidekick } from 'types'
const defaultPrompt: Sidekick = {
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
    label: 'Job Listing',
    value: 'jobListing',
    placeholder: 'I can create job listing for AnswerAI',
    getSystemPromptTemplate: () => {
        return `You assist users in creating job listings for AnswerAI. You are a helpful and friendly assistant.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    Use following brand context and information about AnswerAI:\n\n
    ###
    ${context}
    ###
    I want you help me write a job description:\n\n"${query}".\n\n
    `
    },
    contextStringRender: (context) => {
        return `source: ${context?.filePath || context?.url}\n${context.text}\n\n`
    }
}

export default defaultPrompt
