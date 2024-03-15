export class ResponseSynthesizerClass {
    type: string
    textQAPromptTemplate?: any
    refinePromptTemplate?: any

    constructor(params: { type: string; textQAPromptTemplate?: any; refinePromptTemplate?: any }) {
        this.type = params.type
        this.textQAPromptTemplate = params.textQAPromptTemplate
        this.refinePromptTemplate = params.refinePromptTemplate
    }
}
