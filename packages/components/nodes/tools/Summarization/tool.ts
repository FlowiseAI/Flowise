import { BaseLanguageModel } from 'langchain/base_language'
import { MapReduceDocumentsChain, loadQAMapReduceChain, loadSummarizationChain } from 'langchain/chains'
import { Tool } from 'langchain/tools'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextSplitter } from 'langchain/text_splitter'
import { PromptTemplate } from 'langchain/prompts'
import fs from 'fs'

interface SummaryTool {
    llm: BaseLanguageModel
    splitter: TextSplitter
    // loader: PDFLoader
}

export const parseInputs = (inputs: string): [string, string] => {
    const [filePath, task] = inputs.split(",").map((input) => {
      let t = input.trim();
      t = t.startsWith('"') ? t.slice(1) : t;
      t = t.endsWith('"') ? t.slice(0, -1) : t;
      // it likes to put / at the end of urls, wont matter for task
      t = t.endsWith("/") ? t.slice(0, -1) : t;
      return t.trim();
    });
  
    return [filePath, task];
  };

export class SummarizationTool extends Tool implements SummaryTool {
    llm: BaseLanguageModel

    name = 'summarization'

    description =
        `This tool specifically used for when you need to handle user uploaded file. input should be a comma separated list of "a file absolute path from the USER'S INPUT or Human", "What the user wants to do with the upload file, or empty string when user didn't ask for it"`

    splitter: TextSplitter

    loader: PDFLoader

    chain: MapReduceDocumentsChain

    cachaMap: Map<string, string> = new Map()

    constructor(fields: SummaryTool) {
        super()
        this.llm = fields.llm
        this.splitter = fields.splitter
        this.chain = loadQAMapReduceChain(this.llm) as MapReduceDocumentsChain
    }

    /** @ignore */
    async _call(input: string) {
        try {
            if (!input) {
                return 'Please send me a file.'
            }
            if (this.cachaMap.has(input)) {
                return this.cachaMap.get(input)
            }
            const [filePath, task] = parseInputs(input)
            // 判断filePath是否是一个文件
            let isExist;
            try {
                await fs.promises.access(filePath, fs.constants.F_OK)
                isExist = true
              } catch {
                console.error('cannot access');
                isExist = false
              }
            if (!isExist) {
                return 'you can directly return action: "Final Answer", the response to my original question is "抱歉，没有实际文件我无法处理需求。 请将文件发给我，我很乐意协助您。"'
            }
            if (isExist && !task) {
                return 'you can directly return action: "Final Answer", the response to my original question is "我收到了文件，请问你需要我帮你怎么处理文件？"'
            }
            const loader = new PDFLoader(filePath)

            const docs = await loader.loadAndSplit(this.splitter)
            const res = await this.chain.call({
                input_documents: docs,
                question: `请使用中文回答：${task}, `
            })
            this.cachaMap.set(input, res.text)
            console.log('res', res)
            return res.text
        } catch (error) {
            console.log(error)
            return 'you can directly return action: "Final Answer" , and the input is "Please send the file", the response to my original question is "抱歉，没有实际文件我无法总结合同文件。 请将文件发给我，我很乐意协助您进行总结。"'
        }
    }
}


export class FilePro extends Tool {
    name = 'filePro'

    description =
        "This tool specifically used for when user only upload a file and doesn't suggest an exact way to handle file. Input should be a empty string."

    chain: MapReduceDocumentsChain

    constructor() {
        super()
    }

    /** @ignore */
    async _call(input: string) {
        return 'you can directly return action: "Final Answer" , and the input is "Please send the file", the response to my original question is "我收到了文件，请问你需要我帮你怎么处理文件？"'
    }
}