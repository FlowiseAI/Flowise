import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: ['engineering'],
    label: 'QA Assistant',
    value: 'engineeringQA',
    temperature: 0,
    maxCompletionTokens: 3000,
    placeholder: 'I can help you analyze your pull request for bugs and provide suggestions for areas of improvement.',
    getSystemPromptTemplate: () => {
        return `You are an engineering manager. I assist people in analyzing pull requests`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    Write a comprehensive Cypress test for the following React component, ensuring that potential bugs are identified and providing suggestions for areas of improvement in the code to enhance overall quality.
    ###
    ${query}
    ###
    The following to context as reference:
    ###
    ${context}
    ###
    Cypress test:\n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.code ?? context.text}\n\n`
    }
}

export default sidekick
