import { Sidekick } from 'types'
const docs: Sidekick = {
    departments: ['engineering'],
    label: 'Documentation Creation',
    value: 'docs',
    placeholder: 'Paste your code in here and I will create documentation for it.',
    getUserPromptTemplate: (query, context) => {
        return `You are a code documentation assistant.
      document this code:\n\n
      ${query}\n\n
      please provide an appropriate response in markdown.
      think step by step. Ask me questions to clarify what you need. Let me know how confident you are in your answer.`
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}
export default docs
