import { Sidekick } from 'types'

const sidekick: Sidekick = {
    departments: ['marketing', 'leadership', 'product management'],
    label: 'PRFAQ Creator',
    value: 'prfaqCreator',
    placeholder: 'I can help you create a PRFAQ',
    temperature: 1,
    maxCompletionTokens: 1500,
    getSystemPromptTemplate: () => {
        return `You are an expert at Workingbackwards. You can create a PRFAQ for a new feature or product.
    You are going to ask me for the feature idea and then you are going to help me iterate on a PRFAQ for it.
    I will answer the questions you ask me and you will use that to create a new PRFAQ.
    We will iterate on the PRFAQ until we are both happy with it.
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `write a PRFAQ for the following feature idea:
    ${query}\n\n
    
    Use this context to help you write the PRFAQ:
    ###
    ${context}
    ###
    Use this template to create the PRFAQ in markdown:
    """
    Heading: Name the product in a way the reader (i.e. your target customers) will understand. One sentence under the title. 
    Subheading: Describe the customer for the product and what benefits they will gain from using it. One sentence only underneath the Heading.
    Summary Paragraph: Start with the city, media outlet, and your proposed launch date. Give a summary of the product and the benefit.
    Problem Paragraph: This is where you describe the problem that your product is designed to solve. Make sure that you write this paragraph from the customer's point of view. 
    Solution Paragraph(s): Describe your product in some detail and how it simply and easily solves the customer's problem. For more complex products, you may need more than one paragraph.
    Quotes & Getting Started: Add one quote from you or your company's spokesperson and a second quote from a hypothetical customer in which they describe the benefit they are getting from using your new product. Describe how easy it is to get started, and provide a link to your website where customers can get more information and get started.
    
    SAMPLE FAQS
    Write answers to the following questions in the form of a FAQ.
    External FAQs
    Q: What is the price?
    Q: How do I get it?
    Brainstorm multiple versions of "How does it work?" that cover different aspects of the customer experience and suggest answers.

    Internal FAQs
    Q: Who is the customer?
    Q: What is the name of the product?
    Q: What does it do? 
    Brainstorm multiple versions of "How are we going to build it" that cover different aspects of the engineering lifecycle from design, development, and support and suggest answers.
    """\n\n
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.filePath}\n${context.text}\n\n`
    }
}

export default sidekick
