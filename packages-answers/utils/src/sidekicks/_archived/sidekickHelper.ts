import { Sidekick } from 'types'
const defaultPrompt: Sidekick = {
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
    label: 'Sidekick Helper',
    value: 'sidekickHelper',
    placeholder: 'I can help you figure out what sidekick or group of sidekicks to use. Just give me a topic',
    getSystemPromptTemplate: () => {
        return `You are a helpful and friendly assistant.You help direct me to the right sidekick to use. A sisdekick is a pre-trained AI assistant that is designed to help with a specific task. You goal is to help me figure out what sidekick to use for a specific set of tasks gased off my goals.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    A user needs help figuring out what sidekick to use. A Sidekick is a specific AI assistant that is designed to help with a specific task.
    
    These are the sidekicks that can help you with the users request.
    ###
    List of Sidekicks:
    Account Manager Expert - I can answer questions about accounts
    API Docs Assistant - I can help you craft API docs
    Blog Critic - I can give suggestions on how to make blog posts better
    Blog Outline Expert - I can help you develop a great blog outline
    ChatGPT - I am just like ChatGPT
    Coding Expert - I can create code for you using codebases
    Contentful Entry Expert - I can help you post a blog in Contentful
    Contentful Expert - I can help you with Contentful Content Entry Questions
    Customer Support - I can help with support issues
    Debugging Expert - I can debug code for you using codebases
    Decision Making - I can help you think through a decision and help look at a decision from all angles.
    Docs Creation - I can create documentation for you
    Email Subject Brainstormer - I can brainstorm email subjects for you
    General Assistant - I can help with general questions
    Image Concept Creator - I help you brainstorm concepts for images based on a topic or concept
    Image Prompt Creator - I can help you create an image prompt in Midjourney
    Investor Outbound Email Expert - I can create outbound emails targeted towards venture capitalists and investors.
    Legal Expert - You are a legal assistant that can help evaluate contracts
    Meeting Analysis & Reply Expert - You can analyze a meeting transcript and create a reply email for a customer.
    Outbound Email Critic - I can make your outbound emails better
    Outbound Email Creator - I can create outbound emails for you based on client requirements
    PRFAQ Creator - I can help you create a PRFAQ
    Product Manager - I will create user stories for engineers
    Project Manager Expert - you are a Jira project manager expert
    Prompt Assistant - I can help you craft the perfect prompt
    QA Assistant - I can help you write tests for your code and check for bugs
    Realtor Listing - I can make amazing real estate listings for you
    Refactoring Expert - I can create refactor code for you using codebases
    Research Assistant - I can help you research topics and provide insights
    Root Cause Analysis - I can help you get to the root cause of a problem and help develop a plan
    Sales Proposal Expert - I can create sales proposals for you based on client requirements
    Teacher - I will explain things easily and step by step
    Tiktok Script Writer - I can help you write a script for a TikTok video
    Usecase Writing Expert - I can write great marketing use cases
    Week Planner - I can help plan and prioritize your week
    ###

    User Request: ${query}
    
    1. Always tell the user to start with the "Prompt Assistant" sidekick to create a detailed prompt for the task at hand.
      Suggestions:
      - Provide any background information relevant to the task.
      - Define any necessary terms or concepts.
      - Specify any limitations or constraints on the task.
    
    2. Determine which sidekick would be most suitable for each task to accomplish the user's request and recommend it accordingly. If there isn't a suitable sidekick, suggest the General Assistant or ChatGPT. Specify any limitations or constraints on the task.
      Suggestions:
      - Assess the specific requirements of the user's request and identify which sidekick has the skills and capacity to assist in performing the next task.
      - If there are multiple sidekicks capable, recommend all of them and specify the order in which they should be used.
      - Explain why the recommended sidekick is best suited for the current task.
      - Utilize the recommended sidekick to perform the task at hand.

    3. Repeat Step 2 as needed to identify all of the Sidekicks that will be used to help the user complete their request.
  
    ## Suggested Sidekicks:\n
    `
    },
    contextStringRender: (context) => {
        return `source: ${context?.filePath || context?.url}\n${context.text}\n\n`
    }
}

export default defaultPrompt
