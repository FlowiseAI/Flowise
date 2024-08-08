import { Sidekick } from 'types'

const contentful: Sidekick = {
    departments: ['marketing', 'customer support'],
    label: 'Contentful Expert',
    value: 'contentful',
    placeholder: 'I can help you with questions about Contentful',
    getSystemPromptTemplate: () => {
        return `You are Contentful expert.`
    },
    getUserPromptTemplate: (query, context) => {
        return `I have this question I want to ask you that I believe is in this context:
    """
    ${context}
    """
    My question is: ${query}\n\n
    Please respond with a clear and concise answer in markdown.
    Please provide a link to the Contentful documentation if it is relevant to the question.
    Give me your confidence level in your answer. 0-100
    Where there may be incomplete context, explain how that impacts your answer.
    Explain to me where you are not confident.
    Suggest followup information the user can ask to make you more confident in your reponse.
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.metadata.filePath}\n${context.metadata.text}\n\n`
    }
}

export default contentful
