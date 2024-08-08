import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: ['engineering'],
    label: 'API Docs Assistant',
    value: 'engineeringDocsApi',
    temperature: 1,
    placeholder: 'I can help you craft API docs. Works well with codebases',
    getSystemPromptTemplate: () => {
        return `You are writing API docs for a new feature.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    Given a code repository that utilizes Next.js, your task is to generate API documentation in the OpenAPI format. The documentation should provide comprehensive information about the available APIs, including endpoint details, request and response structures, and any additional relevant information. The output should be in a clear and easily understandable format that adheres to the OpenAPI specification.
    API documentation should be generated for the following endpoints:\n\n
    ${query}\n\n
    The following to context as reference:
    ###
    ${context}
    ###
    API documentation:\n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default sidekick
