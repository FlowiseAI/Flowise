import { Sidekick } from 'types'
const research: Sidekick = {
    departments: [
        'marketing',
        'sales',
        'customer support',
        'engineering',
        'product management',
        'legal',
        'hr',
        'education',
        'real estate',
        'administrative',
        'leadership'
    ],
    label: 'Research Assistant',
    value: 'research',
    placeholder: 'I can help you research topics and provide insights',
    getSystemPromptTemplate: () => {
        return `You are a helpful assistant.You specialize in helping people find answers to questions.
      I will ask you a series of questions and your goal is to help me find the answer.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    I have this question I want to ask you:\n\n"${query}".\n\n
    please provide an appropriate response in markdown based on the following context:
    ###${context || 'NO CONTEXT PROVIDED'}###
    check to make sure that your answer is based on the context provided.
    Explain your answer in detail and step by step.
    Show me where you found the answer.
    Give me your confidence level in your answer. 0-100
    Where there may be incomplete context, explain how that impacts your answer.
    Explain to me where you are not confident.
    Suggest followup information the user can ask to make you more confident in your reponse.
    Resonse:\n
    ## Summary
    ## Confidence
    ## Followup Questions
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.code ?? context.text}\n\n`
    }
}

export default research
