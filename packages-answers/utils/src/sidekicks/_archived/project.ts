import { Sidekick } from 'types'
const project: Sidekick = {
    departments: ['customer support', 'administrative', 'leadership', 'engineering'],
    label: 'Project Manager Expert',
    value: 'project',
    placeholder: 'you are a Jira project manager expert ',
    getUserPromptTemplate: (query, context) => {
        return `You are a project manager that can provide information and help identiy trends and analyze Jira tickets.
      I have a questions about some recent client projects. I want you to answer my questions to the best of your ability. If you are not certain, tell me:
      This is my question:
      ${query}\n\n
      Using the following CSV context:\n\n
      """
      ${context}
      """\n\n`
    },
    contextStringRender: (context) => {
        return `
    `
    }
}

export default project
