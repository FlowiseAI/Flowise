import { BaseLanguageModel } from 'langchain/base_language'
import { MapReduceDocumentsChain, loadQAMapReduceChain, loadSummarizationChain } from 'langchain/chains'
import { Tool } from 'langchain/tools'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextSplitter } from 'langchain/text_splitter'
import { PromptTemplate } from 'langchain/prompts'
import fs from 'fs'

interface SummaryTool {
    llm: BaseLanguageModel
    name: string
    splitter: TextSplitter
    description?: string
    systemMessage?: string
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

    name: string

    splitter: TextSplitter

    loader: PDFLoader

    description: string

    chain: MapReduceDocumentsChain
    
    cacheMap: Map<string, string> = new Map()

    docsCacheMap: Map<string, any> = new Map()

    systemMessage: string | undefined

    constructor(fields: SummaryTool) {
        super()
        this.description =  `'This tool used for when user uploaded file.${fields.description || 'This tool specifically used for when you need to handle user uploaded file'}.input is a string,and should be a comma separated list of "a absolute file path taken from Human uploaded","the users original question"`
        this.llm = fields.llm
        this.name = fields.name
        this.returnDirect = true
        this.systemMessage = fields.systemMessage
        this.splitter = fields.splitter
        this.chain = loadQAMapReduceChain(this.llm) as MapReduceDocumentsChain
    }

    /** @ignore */
    async _call(input: string) {
        try {
            if (!input) {
                return '你可以发送一个pdf文件给我，我会对这个文件处理。'
            }
            if (this.cacheMap.has(input)) {
                return this.cacheMap.get(input)
            }
            console.log(typeof input, input)
            const [filePath, task] = Array.isArray(input) ? input : parseInputs(input)
            console.log(filePath, task)
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
                return '抱歉，没有实际文件我无法处理需求。 请将文件发给我，我很乐意协助您。'
            }
            if (isExist && !task) {
                return '我收到了文件，请问你需要我帮你怎么处理文件？'
            }
            let docs;
            if (this.docsCacheMap.has(filePath)) {
                docs = this.docsCacheMap.get(filePath)
            } else {
                const loader = new PDFLoader(filePath)
                docs = await loader.loadAndSplit(this.splitter)
                this.docsCacheMap.set(filePath, docs)
            }
            const res = await this.chain.call({
                input_documents: docs,
                question: `${this.systemMessage || ''}${task}, 请使用中文回答我。`
            })
            this.cacheMap.set(input, res.text)
            console.log('res', res)
            return res.text
        } catch (error) {
            console.log(error)
            return 'you can directly return action: "Final Answer" , and the input is "Please send the file", the response to my original question is "抱歉，没有实际文件我无法总结合同文件。 请将文件发给我，我很乐意协助您进行总结。"'
        }
    }
}
