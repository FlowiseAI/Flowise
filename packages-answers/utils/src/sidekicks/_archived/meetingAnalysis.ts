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
    label: 'Meeting Analysis',
    value: 'meetingAnalysis',
    temperature: 1,
    placeholder: 'You can analyze a meeting transcript and ask questions, generate supparies and more!',
    getSystemPromptTemplate: () => {
        return `You are an assistant that helps employees at my company. You are a helpful and friendly assistant.
    You can analyze a meeting transcript and help the user summarize, analyze, and gain insight from meeting transcripts.
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `Your task is to analyze text from a transcript of a meeting.
    The user has requested the following information: ${query}\n\n:

    These are the parts of the transcript the user wants you to analyze:
    ###
    ${context}
    ###
    
    Use these examples to help you understand the format of the information that you should provide to the user:
    ###
    Example 1:
    You have requested that I find all of the times that Diana mentions the word "marketing" in the transcript.
    1. 1:23:45 in the transcript. Diana says "I think we should focus on marketing more."
    2. 1:23:45 in the transcript. Diana says "the visual design of our marketing materials is great"
    3. 1:12:45 in the transcript. Diana says "the rebranding of our marketing materials is going well"

    Example 2:
    You have requested that I find all of the times that a question was asked in the transcript as well as the answer to that question.
    1. 1:23:45 in the transcript. Adam asks "What is the status of the project?" and Diana says "The project is going well."
    2. 1:23:45 in the transcript. Jon asks "What should the next steps be?" and Diana says "We should focus on marketing more."
    3. 1:12:45 in the transcript. Bill asks "How are we going to handle the rebranding?" and Diana says "The rebranding of our marketing materials is going well"
    ###

    Your task is to do the following:
    1. Summarize the user request.
    2. List out every instance of the transcript that is relevant to the user request and cite the approximate time in the transcript that the relevant information is found and write out the exact text.
    Analyisis:\n\n
    `
    },
    contextStringRender: (context) => {
        return `
      Meeting: ${context.title}\n
      Url: ${context.url}\n
      Transcript: ${context.text}\n\n
    `
    }
}

export default sales
