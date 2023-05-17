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



export class FilePro extends Tool {
    name = 'filePro'

    description =
        "This tool specifically used for when user only upload a file and doesn't suggest an exact way to handle file. Input should be a empty string."


    constructor() {
        super()
    }

    /** @ignore */
    async _call(input: string) {
        return 'you can directly return action: "Final Answer" , and the input is "Please send the file", the response to my original question is "我收到了文件，请问你需要我帮你怎么处理文件？"'
    }
}