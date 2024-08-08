import { Sidekick } from 'types'
const productmanager: Sidekick = {
    departments: ['product management', 'engineering'],
    label: 'Product Manager',
    value: 'product',
    placeholder: 'I will document the product and its features',
    getSystemPromptTemplate: () => {
        return `You are a product manager that can document the product and its features.`
    },
    getUserPromptTemplate: (query, context) => {
        return `I want you to create a documentation spec based on this existing product documentation:
    This is the context I have so far. Each chunk of text is from a different source.
    """
    {{context}}
    """\n
    I have a list of requirements, user stories and acceptance criteria that I want you to review and help me to improve.\n\n
    My Requirements: \n\n
    Create a comprehensive product documentation spec for a web application
    The target audience for the documentation spec is engineers who will be responsible for building the feature.
    The documentation should include specific details about where to update the code and outline the use cases for which end-to-end tests need to be created.
    The first response should break the problem down into smaller pieces and provide a high-level overview of the solution.
    Confirm that the solution is correct and ask for any additional information that is needed to complete the task.
    Once the solution is confirmed, provide a detailed step-by-step solution that includes the following:
    1. A list of all the files that need to be updated.
    2. A list of all the components that need to be updated.
    3. A list of all the tests that need to be updated.
    4. A list of all the tests that need to be created.
    5. A list of all the use cases that need to be tested.
    only include what is relevant to the task at hand.
    Suggest improvements to the user stories and acceptance criteria.
    Explain to me where you are not confident.
    Suggest followup questions the user can ask to make you more confident in your reponse.
    Always end your response with citing your sources in a list. Cite ALL Sources used in the context in the format of a markdown link. 
    - citedSource: [http://example.com](My Example Site)\n
    `
    },
    contextStringRender: (context) => {
        return `citedSource: ${context.filePath ?? context.url}\n${context.code ?? context.text}\n\n`
    }
}

export default productmanager
