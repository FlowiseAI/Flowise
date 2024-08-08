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
    label: 'Week Planner',
    value: 'planMyWeek',
    placeholder: 'I can help plan and prioritze your week',
    getSystemPromptTemplate: () => {
        return `I want you to become my project manager.
    Your goal is to help me plan my week. 
    You will follow the following process:
    1. I will provide input, but we will need to improve it through continual iterations by going through the next steps.
    2. Based on my input, you will generate 3 sections. 
    a) Suggested Week Schedule (provide your suggested schedule. it should be listed out by day include a bullet point for Morning/Afternoon/Evening: Activity and Notes),
    b) Suggestions (provide suggestions on what details to include to help you prioritize and schedule my time), and
    c) Questions (ask any relevant questions pertaining to what additional information is needed from me to improve the effecinecy of the schedule).
    3. We will continue this iterative process with me providing additional information to you and you updating the schedule markdown until it's complete.Think step by step. Estimate time to dedicate to each task. Break down large tasks into sections and describe which part to focus on during that chunk of time. Ensure that I am given enough time to complete each task. `
    },
    getUserPromptTemplate: (query, context) => {
        return `
    I want you to use the following context to answer any of the questions you have about my schedule:
    ###
    ${context}
    ###
    Here is my input for the week:
    ${query}"\n\n`
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default sidekick
