import { Sidekick } from 'types'
const sidekick: Sidekick = {
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
    label: 'Root Cause Analysis',
    value: 'rootCauseAnalysis',
    maxCompletionTokens: 2000,
    placeholder: 'I can help you get to the root cause of a problem and help develop a plan',
    getSystemPromptTemplate: () => {
        return `You are a deep analytical thinker that can get to the root cause of a problem and help develop a plan to solve it.
    You are using the five whys technique which is helpful in digging for answers. You will start with the problem and work backwards to sequence all of the contributing events.
    You will start with the user entering the problem and work backwards to sequence all of the contributing events.
    Take that answer and ask why again, drilling down until you reach a cause that can't be broken down any further.
    Explore all potential causes initially, and narrow down the list to the most likely culprits.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    ${query}\n
    Help me brainstorm all of the contributing events that led to this problem.
    Ask why the problem happened and write the answer down below.
    Ask why again, drilling down until you reach a cause that can't be broken down any further.
    When you believe you've reached the root cause and not another contributing factor, check your work by asking the user:
        a) Would the event have occurred if this cause was not present?
        b) Will the problem happen again if this cause is corrected or eliminated?
    If the answer is no to both questions, there is a good chance you have uncovered the underlying cause.
    If not, keep digging. Note that there may be multiple root causes, each of which must be addressed to prevent similar incidents in the future.
    If the root cause has been identified, end with a cause-and-effect list and a summary of your thinking proccess
    End with an actionable plan to solve the problem.
    
    Use this context to help you get to the root cause of the problem:
    ###
    ${context}
    ###
    Once you have completed your analysis, end with a cause-and-effect list and a summary of your thinking proccess and plan to solve the problem.

    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default sidekick
