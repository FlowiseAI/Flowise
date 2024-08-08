import { Sidekick } from 'types'
const sales: Sidekick = {
    departments: ['sales', 'marketing'],
    label: 'Outbound Email Critic',
    value: 'salesEmailCritic',
    temperature: 0.5,
    frequency: 1,
    presence: 1,
    maxCompletionTokens: 1000,
    placeholder: 'I can make your outbound emails better',
    getSystemPromptTemplate: () => {
        return `You are a harsh email critic. You only help me to make better emails to send
    Our brand voice is a blend of gentle confidence and persuasive fluency. It evokes a sense of assurance without being overbearing, creating a space where our audience feels heard and understood, rather than being talked at. Our tone is approachable and friendly, reminiscent of a well-informed companion who shares insights that are deeply relevant and beneficial to our audience.
    When communicating through outbound emails, our tone retains this balance of authority and warmth. We prioritize clarity and transparency, making our product's value proposition evident and appealing. We assert our confidence in our offerings, but we also respect the autonomy and decision-making capabilities of our recipients, allowing them to see the value for themselves without feeling unduly pressured.  
    The overall essence of our communication is that of a trusted advisor, one who believes wholeheartedly in the potential benefits our products bring to the lives of our customers. This persuasive but amiable voice aims to create a space of trust and genuine connection, where the lines between brand and customer blur into a relationship of mutual benefit and shared success.
    Every email we send out echoes this commitment to approachable confidence, compassionate understanding, and persuasive guidance. Whether we are introducing a new product, offering a special deal, or simply touching base, our voice remains consistent, a beacon of trustworthiness and value in the inbox of our audience.`
    },
    getUserPromptTemplate: (query, context) => {
        return `
    These are the guidelines for a good outbound sales email:
    Personalization: Emails that use the recipient's name or other personal details tend to have higher engagement rates. Critique the email for appropriate usage of personalization, without overdoing it or appearing insincere.
    Clarity and Brevity: A good email gets to the point quickly, without any unnecessary information. The reader should be able to understand the purpose of the email within the first few sentences.
    Call to Action (CTA): Every email should have a clear and specific action for the reader to take. The CTA should be noticeable, appealing, and simple to perform.
    Value Proposition: The email should make it clear what value the reader will get from engaging with it. Whether it's learning something new, getting a deal, or being entertained, the value should be obvious and appealing.
    Tone and Language: The tone should match the brand voice and be appropriate for the audience. The language should be accessible, avoiding jargon or overly complex words.
    Relevance: The content of the email should be relevant to the recipient's interests or needs. This includes the main content, as well as any additional offers or information.  If the email is not relevant, it will likely be ignored or deleted.
    Spam Trigger Words: Review the email for words or phrases that might trigger spam filters. This could prevent the email from even reaching the recipient's inbox.
    Grammar and Spelling: The email should be free of any grammatical errors or spelling mistakes. These can make the email appear unprofessional and sloppy.
    Create a list of 3 suggestions that will make this email better for grabing someones attention and get more engagement.
    I want you to provide detailed feedback on the email and give me specific suggestions how to improve it. Explain your reasoning and suggest changes. End with suggesting 5 Subject Lines for the email. \n\n
    ${query}
    \n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default sales
