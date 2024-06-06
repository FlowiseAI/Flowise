const legaDocumentTagging = {
    name: 'legaDocumentTagging',
    description: 'Categorize and label documents based on the content of the document, such as legal filings, correspondence, reports, evidence, supporting documents, or unknown.',
    // chatflowId: '6b5da243-c3b8-4ddf-9076-22178f0d5c65', // Production
    chatflowId: 'a8d28e49-3b6b-49cc-9e56-c3632e0b5e8c', // Localhost
    sourceContentTypeId: 'originalDocuments',
    humanMessagePromptField: 'textContent',
    instructions: `
    User will provide a document and the agent will categorize the document based on the following criteria:

    1. Document Type (Single Select):
    key: documentType
    Used to classify the general nature or source of the document within a business context.
    Only choose from these options: ['Financial', 'Human Resources', 'Legal', 'Marketing', 'Operations', 'Research', 'Unknown']
    - Financial: Includes financial statements, budgets, invoices, and other monetary-related documents.
    - Human Resources: Covers employee records, policies, training materials, and recruitment documents.
    - Legal: Encompasses contracts, agreements, patents, and other legal-related paperwork.
    - Marketing: Includes marketing plans, campaign materials, market research reports, and brand guidelines.
    - Operations: Covers operational procedures, logistics documents, supply chain management, and quality control reports.
    - Research: Encompasses product development documents, technical specifications, and research findings.
    - Unknown: For any documents that you are unsure of its purpose or type, tag it as unknown for human review.

    2. Business Objective (Multi-select):
    key: businessObjective
    This tag should reflect the purpose or intended use of the document in the business context, helping to identify how each document serves the company's goals.
    Select multiple options from only these options: ['Strategic Planning', 'Compliance', 'Risk Management', 'Performance Improvement', 'Innovation', 'Stakeholder Communication']
    - Strategic Planning: For documents related to long-term business goals and strategies.
    - Compliance: Useful for proving adherence to regulations, standards, or internal policies.
    - Risk Management: Documents that identify, assess, or mitigate business risks.
    - Performance Improvement: Tags for documents aimed at enhancing efficiency, productivity, or quality.
    - Innovation: Highlights documents related to new ideas, products, or processes.
    - Stakeholder Communication: For documents intended to inform or engage with internal or external stakeholders.

    Return your response in JSON format
    
    `,
    responseOutput: `z.object({
        documentType: z.enum([
            "Financial", "Human Resources", "Legal", "Marketing", 
            "Operations", "Research", "Unknown"
        ]), // Single select enum for document types
        businessObjective: z.enum([
            "Strategic Planning", "Compliance", "Risk Management", 
            "Performance Improvement", "Innovation", "Stakeholder Communication"
        ]).array(), // Multi-select, array of business objectives from the defined enum
    })`
}

module.exports = legaDocumentTagging
