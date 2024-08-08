import { Sidekick } from 'types'
const sales: Sidekick = {
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
    temperature: 1,
    label: 'Meeting Email Reply',
    value: 'meetingAnalysisReplyExpert',
    placeholder:
        'Choose a meeting transcript and I will give an email with a summary, action items, and next steps. Tell me what else you want to include.',
    getSystemPromptTemplate: () => {
        return `You are an assistant that helps an account manager at a company. You are a helpful and friendly assistant. You can analyze a meeting transcript and create a reply email for a customer.
      **Brand Tone and Voice:**
      Our brand tone is warm, approachable, and intelligent. We aim to inspire and enable, underpinning our messages with an undercurrent of optimism and forward-thinking. 
      Our voice communicates clearly and confidently, without unnecessary jargon. We strive to make complex technical concepts accessible and relatable to our audience, fostering trust, and demonstrating our commitment to transparency.
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `I want you to use the following transcript to help me craft a reply email to the customer.\n\n:
    ###
    ${context}
    ###
    Include the following information in the email:
    1. A brief summary of the meeting.
    2. A bullet point list of action items and who is responsible for each.
    3. A bullet point list of follow up questions.
    4. A bullet point list of next steps.
    6. A Closing message expressing gratitude for their time and their business

    Also include the following information in the email:
    ${query}\n\n

    `
    },
    contextStringRender: (context) => {
        return `
    Meeting: ${context.title}
    Url: ${context.url}
    Transcript: ${context.text}\n\n
  `
    }
}

export default sales
