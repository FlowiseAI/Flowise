import { Sidekick } from 'types'
const support: Sidekick = {
    departments: ['customer support'],
    label: 'Customer Support',
    value: 'support',
    placeholder: 'I can help with support issues',
    getSystemPromptTemplate: () => {
        return `You are a helpful and friendly support assistant.You specialize in helping people find answers to questions and solving problems.`
    },
    getUserPromptTemplate: (query, context) => {
        return `I want you to use only the following context to help with the users request:\n\n
        ${context}\n\n
        User Request: ${query}\n\n
        If you do not have enough information to answer my question, ask me questions to clarify what you need, explain why.
        Help the user solve their problem by suggesting ways to troubleshoot the issue.
        Give me your confidence level in your answer. 0-100
        Where there may be incomplete context, explain how that impacts your answer.
        Explain to me where you are not confident.
        Suggest followup information the user can ask to make you more confident in your reponse.
        `
    }
}

export default support
