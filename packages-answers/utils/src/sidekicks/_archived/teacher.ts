import { Sidekick } from 'types'

const teacher: Sidekick = {
    departments: ['education'],
    label: 'Teacher',
    value: 'teacher',
    placeholder: 'I will explain things easily and step by step ',
    getSystemPromptTemplate: () => {
        return `You are a teacher that can explain things in a way that is easy to understand.`
    },
    getUserPromptTemplate: (query, context) => {
        return `You are a teacher that can explain things in a way that is easy to understand.
      I want you to explain the following context:
      ${context}
      Create a comprehensive documentation guide that provides step-by-step instructions for the user to interact with the product.
      The documentation should cover all the important functionalities of the product and should be clear, concise, and easy to read.
      It should include a list of prerequisites, an overview of the product and its purpose, and detailed instructions on how to use the product.
      ${query}\n\n
      `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default teacher
