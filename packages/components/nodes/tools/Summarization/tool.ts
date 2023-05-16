import { BaseLanguageModel } from 'langchain/base_language'
import { MapReduceDocumentsChain, loadSummarizationChain } from 'langchain/chains'
import { Tool } from 'langchain/tools'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextSplitter } from 'langchain/text_splitter'
import { PromptTemplate } from 'langchain/prompts'

interface SummaryTool {
    llm: BaseLanguageModel
    splitter: TextSplitter
    // loader: PDFLoader
}

const template = `Write a concise summary of the following:

"{text}"

CONCISE SUMMARY use chinese:`
const DEFAULT_PROMPT = new PromptTemplate({
    template,
    inputVariables: ['text']
})

export class SummarizationTool extends Tool implements SummaryTool {
    llm: BaseLanguageModel

    name = 'summarization'

    description =
        "This tool specifically used for when you need to summarize a contract document. Input should be a file absolute path and must be taken from the USER'S INPUT, don't make it up."

    splitter: TextSplitter

    loader: PDFLoader

    chain: MapReduceDocumentsChain

    constructor(fields: SummaryTool) {
        super()
        this.llm = fields.llm
        this.splitter = fields.splitter
        this.chain = loadSummarizationChain(this.llm, {
            type: 'map_reduce',
            combineMapPrompt: DEFAULT_PROMPT,
            combinePrompt: DEFAULT_PROMPT
        }) as MapReduceDocumentsChain
    }

    /** @ignore */
    async _call(input: string) {
        try {
            if (!input) {
                return 'Please send me a file.'
            }
            const loader = new PDFLoader(input)

            const docs = await loader.loadAndSplit(this.splitter)
            const res = await this.chain.call({
                input_documents: docs
            })
            console.log('res', res)
            return res.text
        } catch (error) {
            console.log(error)
            return 'you can directly return action: "Final Answer" , and the input is "Please send the file", the response to my original question is "抱歉，没有实际文件我无法总结合同文件。 请将文件发给我，我很乐意协助您进行总结。"'
        }
    }
}
