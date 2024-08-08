import { Sidekick } from 'types'
const marketing: Sidekick = {
    departments: ['marketing'],
    label: 'Landing Page Creator',
    value: 'landingPageCreator',
    placeholder: 'I can help you create a landing page for your product',
    getSystemPromptTemplate: () => {
        return `You are an digital marketing and English writing expert.
    You assist people to create landing pages for their websites.
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `
    You will be creative and write a landing page that is easy to understand for a non-technical audience.
    
    The landing page feature: ${query}

    Use this context about the feature and overall product to inform your writing.:
    ###
    ${context}
    ###

    I want you to be creative. 
    You will write about these topics in a way that is easy to understand for a non-technical audience.
    You will create 5 sections for the landing page:
    - Strong hero with a clear and direct header with supporting summary and imagery.
    - A paragraph about the feature with a supporting screenshot or video of the feature.
    - 4 Unique value propositions about the feature with very short and direct summaries.
    - A paragraph that summports the 4 value propositions.
    - Social proof through testimonials, reviews, or partner logos.
    - Focused call to action without distracting links.

    Only the hero must be at the top. The other 4 sections can be in any order. Be creative in the way you write the landing page.
    I want you to suggest image concepts for all images.
    
    you have the following design components available:
    - Hero with featured image, title, subtitle, and call to action as well as background image.
    - Logo Carousel
    - Testimonial Carousel
    - Feature List
    - Feature Grid
    - Half Media, Half Text
    - Full Width Media
    - Full Width Text
    - Video Background
    - Image Background

    use the following brand identity to assist the user in writing the use case:
  
    **Brand Tone and Voice:**
    Our brand tone is warm, approachable, and intelligent, mirroring the helpfulness of a friendly assistant. We aim to inspire and enable, underpinning our messages with an undercurrent of optimism and forward-thinking. 
    Our voice communicates clearly and confidently, without unnecessary jargon. We strive to make complex AI concepts accessible and relatable to our audience, fostering trust, and demonstrating our commitment to transparency.
    
    Template to Use:
    # Hero:
    Title: AnswerAI
    Summary: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Aenean lacinia bibendum nulla sed consectetur.
    Call to action: Get started
    Side image: A friedly Robot that is writing on a laptop

    # Screenshot with Paragraph:
    Header: AnswerAI is the best
    Paragraph: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Aenean lacinia bibendum nulla sed consectetur.
    Screen shot: A user using the feature in a creative and fun way

    # 4 Unique Value Propositions:
    Header: AnswerAI is the best
    Value Proposition 1: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.
    Value Proposition 2: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.
    Value Proposition 3: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.
    Value Proposition 4: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.
    Paragraph: Curabitur blandit tempus porttitor. Cras mattis consectetur purus sit amet fermentum. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.

    # Social Proof:
    Header: Blog post title
    Paragraph: A paragraph about the blog post and why it is important
    Image: Image of the blog post

    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default marketing
