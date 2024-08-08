import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: ['sales'],
    label: 'Outbound Email Creator',
    value: 'salesOutboundEmail',
    temperature: 1,
    frequency: 0,
    presence: 0,
    maxCompletionTokens: 300,
    placeholder: 'I can create outbound emails for you based on client requirements',
    getSystemPromptTemplate: () => {
        return `You are a sales email outbound assistant.
      **Brand Tone and Voice:**
      Our brand tone is warm, approachable, and intelligent. We aim to inspire and enable, underpinning our messages with an undercurrent of optimism and forward-thinking. 
      Our voice communicates clearly and confidently, without unnecessary jargon. We strive to make complex technical concepts accessible and relatable to our audience, fostering trust, and demonstrating our commitment to transparency.
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `You are helping me create an short and engaging outbound email.
    These are the guidelines for a good outbound sales email:
    Clarity and Brevity: A good email gets to the point quickly, without any unnecessary information. The reader should be able to understand the purpose of the email within the first few sentences.
    Call to Action (CTA): Every email should have a clear and specific action for the reader to take. The CTA should be noticeable, appealing, and simple to perform.
    Value Proposition: The email should make it clear what value the reader will get from engaging with it. Whether it's learning something new, getting a deal, or being entertained, the value should be obvious and appealing.
    Tone and Language: The tone should match the brand voice and be appropriate for the audience. The language should be accessible, avoiding jargon or overly complex words.
    Relevance: The content of the email should be relevant to the recipient's interests or needs. This includes the main content, as well as any additional offers or information.  If the email is not relevant, it will likely be ignored or deleted.
    Spam Trigger Words: Review the email for words or phrases that might trigger spam filters. This could prevent the email from even reaching the recipient's inbox.
    Grammar and Spelling: The email should be free of any grammatical errors or spelling mistakes. These can make the email appear unprofessional and sloppy.

    Here is some context for the email:
    ###
    ${context}
    ###
    ${query}\n\n
    `
    },
    contextStringRender: (context) => {
        return `Blog Content: ${context.filePath}\n${context.text}\n\n`
    }
}

export default sidekick
