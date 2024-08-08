import { Sidekick } from 'types'

const coding: Sidekick = {
    departments: ['engineering'],
    label: 'Coding Expert',
    value: 'coding',
    maxCompletionTokens: 2000,
    placeholder: 'I can analyze your code and help you write code. Works best with Codebases, but can just as easily work with copy paste.',
    getSystemPromptTemplate: (user) => {
        return `You are a code assistant. You specialize in building Typescript applications with NextJS and React.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
      I want you to use the code in the following code to help with the users command:\n\n
      """
      ${context}
      """
      User Commmand: ${query}\n\n
      Your response should be in the form of code snippets and markdown.
      The first response should break the problem down into smaller pieces.
      Then Create code snippets where the user needs to make updates in the same code style and format as the context.
      Outline the use cases for which end-to-end tests need to be created.
      Give me your confidence level in your answer 0-100
      Where there may be incomplete context, explain how that impacts your answer.
      Suggest followup information the user can ask to make you more confident in your reponse.\n\n`
    },
    contextStringRender: (context) => {
        return `Source: [${context.filePath ?? context.url}](${context.filePath ?? context.url})\n Javascript:\n${
            context.code ?? context.text
        }\n\n`
    }
}

export default coding
