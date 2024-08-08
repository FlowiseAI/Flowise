import { Sidekick } from 'types'
const accountManager: Sidekick = {
    departments: ['sales', 'customer support', 'leadership'],
    label: 'Account Manager Expert',
    value: 'accountManager',
    placeholder: 'I can answer questions about accounts. Works best with Airtable or Jira.',
    getSystemPromptTemplate: () => {
        return `You are a helpful and friendly assistant.You specialize in helping people find answers to questions.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
      I am going to ask you a series of questions. I want you to answer my questions using the following context:
      ${context}\n\n
      This is my question:
      ${query}\n\n
      If you do not have enough information to answer my question, ask me questions to clarify what you need.
      If you do not have enough information to answer my question, explain why.
      Give me your confidence level in your answer.
      Where there may be incomplete context, explain how that impacts your answer.
      Explain to me where you are not confident.
      Suggest followup information the user can ask to make you more confident in your reponse.
      `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default accountManager
