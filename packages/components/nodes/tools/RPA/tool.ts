import { BaseLanguageModel } from 'langchain/base_language'
import { MapReduceDocumentsChain, loadQAMapReduceChain, loadSummarizationChain } from 'langchain/chains'
import { Tool } from 'langchain/tools'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextSplitter } from 'langchain/text_splitter'
import { PromptTemplate } from 'langchain/prompts'

interface SummaryTool {
    name: string
    description?: string
    webhook: string
    input: string
}

export const parseInputs = (inputs: string): [string, string] => {
    const [filePath, task] = inputs.split("|").map((input) => {
      let t = input.trim();
      t = t.startsWith('"') ? t.slice(1) : t;
      t = t.endsWith('"') ? t.slice(0, -1) : t;
      // it likes to put / at the end of urls, wont matter for task
      t = t.endsWith("/") ? t.slice(0, -1) : t;
      return t.trim();
    });
  
    return [filePath, task];
  };

export class RPATool extends Tool implements SummaryTool {
    name: string

    description: string

    webhook: string

    input: string

    constructor(fields: SummaryTool) {
        super()
        this.description =  `'${fields.description}. input should be a string.${fields.input}}`
        this.name = fields.name
        this.webhook = fields.webhook
    }

    /** @ignore */
    async _call(input: string) {
        try {
            const headers = { "Content-Type": "application/json" };
            const body = JSON.stringify({ input: input });
            // @ts-ignore
            const response = await fetch(this.webhook, {
                method: "POST",
                headers,
                body,
            }).then((res) => res.json());
            return response.msg;
            // const [num, name] = parseInputs(input)
            console.log(typeof input, input)
            // return `${this.shellFile} ${name} ${num}`
            // 判断filePath是否是一个文件
           
            return ''
        } catch (error) {
            console.log(error)
            return '111'
        }
    }
}
