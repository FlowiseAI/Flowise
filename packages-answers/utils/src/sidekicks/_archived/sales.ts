import { Sidekick } from 'types'
const sales: Sidekick = {
    departments: ['sales'],
    label: 'Sales Proposal Expert',
    value: 'sales',
    placeholder: 'Paste in a clients requirements, and I can create a sales proposal timeline for you.',
    getSystemPromptTemplate: () => {
        return `You are a sales timeline proposal assistant.`
    },
    getUserPromptTemplate: (query, context) => {
        return `I want you to create a proposal timeline for this project based on the following context from previous proposals:
    ###
    ${context}
    ###
    I want to consolidate this requirements document into a document that contains the following sections
    I want you to think step by step and break down the project into milestones and tasks.
    I want you to provide a timeline for each milestone and task.
    I want you to list out all questions that the sales team should ask the client to help us be more confident with our estimate.
    I want you to list out all assumptions made while providing your estimates.
    I want you to list out all risks that may impact the project.
    I want you to list out all reasons why our company is the best choice.
    Requirements:
      ${query}\n\n
    Template:
    ## Project Summary
    <summary of the project>
    ## Timeline
    - Milestone 1
      - Task 1
      - Task 2
    - Milestone 2
      - Task 1
      - Task 2
    ## Questions
    <list of questions we should ask to help us be more confident with our estimate>
    ## Assumptions
    <list of assumptions made while providing your estimates>
    ## Risks
    <list of risks that may impact the project>
    ## Why my company is the best choice
    <list of reasons why we are the best choice>
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath ?? context.url}\n${context.text}\n\n`
    }
}

export default sales
