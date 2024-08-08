import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'
// import { ZeroShotAgent } from 'langchain/agents';

// export const toolsPrompt = ZeroShotAgent.createPrompt([], {
//   prefix: `Answer the following questions as best you can, but speaking as a pirate might speak. You have access to the following tools:`,
//   suffix: `Begin! Remember to speak as a pirate when giving your final answer. Use lots of "Args"`
// });

export const assistantPrompt = HumanMessagePromptTemplate.fromTemplate(
    `You are a friendly AI assistant. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know. CONTEXT: {context}`
)

export const intentionPrompt = HumanMessagePromptTemplate.fromTemplate('My name is {userName}.')

export const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    // new SystemMessagePromptTemplate(toolsPrompt),
    assistantPrompt,
    intentionPrompt,
    HumanMessagePromptTemplate.fromTemplate('{input}')
])

export const rawPrompt = ChatPromptTemplate.fromPromptMessages([
    // new SystemMessagePromptTemplate(toolsPrompt),
    SystemMessagePromptTemplate.fromTemplate(`Use the following context as part of your knowledge. {context}`),
    intentionPrompt,
    HumanMessagePromptTemplate.fromTemplate('{input}')
])
