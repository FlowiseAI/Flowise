import { Sidekick } from 'types'

const refactor: Sidekick = {
    departments: ['engineering'],
    label: 'Refactoring Expert',
    value: 'refactor',
    placeholder: 'I can create refactor code for you',
    getSystemPromptTemplate: () => {
        return `You are a code refactoring assistant.`
    },
    getUserPromptTemplate: (query, context) => {
        return `You specialize in building typescript and javascript applications with OpenAI.
      I want you to refactor these code files:\n\n
      ${context}\n\n
      I want you to use these instructions:\n
      ${query}\n\n
      Walk me through step by step what you did.
      Explain why you did what you did.
      Explain what you did not do and why.
      Provide a summary of the code changes you made.
      Do not write all of the code
      please add detailed step by step comments inside functions where the code will be for each file
      please provide an appropriate response in markdown.
      only respond with the refactored code, comments and be detailed`
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.code ?? context.text}\n\n`
    }
}

export default refactor
