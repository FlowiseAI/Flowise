import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: ['engineering'],
    label: 'Pull Request Summary',
    value: 'engineeringPRCreator',
    temperature: 1,
    maxCompletionTokens: 1000,
    placeholder: 'Run `git diff main | pbcopy` create a new file, then I will analyze your pull request and provide feedback on it.',
    getSystemPromptTemplate: () => {
        return `You are an engineering manager. I assist people in analyzing pull requests`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    Perform a comprehensive analysis of the following git diff being requested to push to the main branch.
    ###
    ${context}
    ###
    Your task is to perform the following:
    A code review: Create a short summary of all the code changes and how they could potentiall impact the project.
    Bug analysis: Create a summary identifying any potential bugs or errors within the code changes.
    Improvement suggestions: Provide a summary of recommendations and suggestions for areas of improvement in the code and look for console statements
    Additionally, please do this: ${query}\n\n
    Analysis report:\n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.code ?? context.text}\n\n`
    }
}

export default sidekick
