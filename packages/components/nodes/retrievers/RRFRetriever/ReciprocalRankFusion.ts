import { Document } from '@langchain/core/documents'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import { BaseDocumentCompressor } from 'langchain/retrievers/document_compressors'

export class ReciprocalRankFusion extends BaseDocumentCompressor {
    private readonly llm: BaseLanguageModel
    private readonly queryCount: number
    private readonly topK: number
    private readonly c: number
    private baseRetriever: VectorStoreRetriever
    constructor(llm: BaseLanguageModel, baseRetriever: VectorStoreRetriever, queryCount: number, topK: number, c: number) {
        super()
        this.queryCount = queryCount
        this.llm = llm
        this.baseRetriever = baseRetriever
        this.topK = topK
        this.c = c
    }
    async compressDocuments(
        documents: Document<Record<string, any>>[],
        query: string,
        _?: Callbacks | undefined
    ): Promise<Document<Record<string, any>>[]> {
        // avoid empty api call
        if (documents.length === 0) {
            return []
        }
        const chatPrompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(
                'You are a helpful assistant that generates multiple search queries based on a single input query.'
            ),
            HumanMessagePromptTemplate.fromTemplate(
                'Generate multiple search queries related to: {input}. Provide these alternative questions separated by newlines, do not add any numbers.'
            ),
            HumanMessagePromptTemplate.fromTemplate('OUTPUT (' + this.queryCount + ' queries):')
        ])
        const llmChain = new LLMChain({
            llm: this.llm,
            prompt: chatPrompt
        })
        const multipleQueries = await llmChain.call({ input: query })
        const queries = []
        queries.push(query)
        multipleQueries.text.split('\n').map((q: string) => {
            queries.push(q)
        })
        const docList: Document<Record<string, any>>[][] = []
        for (let i = 0; i < queries.length; i++) {
            const resultOne = await this.baseRetriever.vectorStore.similaritySearch(queries[i], 5)
            const docs: any[] = []
            resultOne.forEach((doc) => {
                docs.push(doc)
            })
            docList.push(docs)
        }

        return this.reciprocalRankFunction(docList, this.c)
    }

    reciprocalRankFunction(docList: Document<Record<string, any>>[][], k: number): Document<Record<string, any>>[] {
        docList.forEach((docs: Document<Record<string, any>>[]) => {
            docs.forEach((doc: any, index: number) => {
                let rank = index + 1
                if (doc.metadata.relevancy_score) {
                    doc.metadata.relevancy_score += 1 / (rank + k)
                } else {
                    doc.metadata.relevancy_score = 1 / (rank + k)
                }
            })
        })
        const scoreArray: any[] = []
        docList.forEach((docs: Document<Record<string, any>>[]) => {
            docs.forEach((doc: any) => {
                scoreArray.push(doc.metadata.relevancy_score)
            })
        })
        scoreArray.sort((a, b) => b - a)
        const rerankedDocuments: Document<Record<string, any>>[] = []
        const seenScores: any[] = []
        scoreArray.forEach((score) => {
            docList.forEach((docs) => {
                docs.forEach((doc: any) => {
                    if (doc.metadata.relevancy_score === score && seenScores.indexOf(score) === -1) {
                        rerankedDocuments.push(doc)
                        seenScores.push(doc.metadata.relevancy_score)
                    }
                })
            })
        })
        return rerankedDocuments.splice(0, this.topK)
    }
}
