import { Sidekick } from 'types'
const debugging: Sidekick = {
    departments: ['engineering'],
    label: 'Debugging Expert',
    value: 'debugging',
    placeholder: 'I can debug code for you. Paste in the error and I will help you fix it. Works best with codebases',
    getSystemPromptTemplate: () => {
        return `You are a code debugging expert assistant. You specialize in debugging typescript and javascript applications with NextJS`
    },
    getUserPromptTemplate: (query, context) => {
        return `
      A user is having this error:\n\n
      ${query}\n\n
      The bug is potenitally in one of these files:\n\n
      ${context}\n\n
      I want you to identify potential bugs and exploits in the file that relate to the users error.
      If the users error is not in the context, explain why.
      Try to fix the bug and explain how you fixed it.
      Please provide a detailed explanation of your thought process.
      If you are unsure of how to fix the bug, please provide a detailed step by step guide on how to troubleshoot the error.
      Ask me questions to clarify what information you need if the context is not enough.
      Tell me your confidence in fixing this bug with your suggested solution.
      Give me your confidence level in your answer. 0-100
      Where there may be incomplete context, explain how that impacts your answer.
      Explain to me where you are not confident.
      Suggest followup information the user can ask to make you more confident in your reponse.
      `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.code ?? context.text}\n\n`
    }
}

export default debugging
