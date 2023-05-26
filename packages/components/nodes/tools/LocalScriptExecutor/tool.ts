import { BaseLanguageModel } from 'langchain/base_language'
import { MapReduceDocumentsChain, loadQAMapReduceChain, loadSummarizationChain } from 'langchain/chains'
import { Tool } from 'langchain/tools'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextSplitter } from 'langchain/text_splitter'
import { PromptTemplate } from 'langchain/prompts'

interface SummaryTool {
    name: string
    description?: string
    shellFile: string
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

export class SummarizationTool extends Tool implements SummaryTool {
    name: string

    description: string

    shellFile: string

    constructor(fields: SummaryTool) {
        super()
        this.description =  `'${fields.description || 'This tool specifically used for when you need to handle user uploaded file'}. input should be a string.`
        this.name = fields.name
        this.shellFile = fields.shellFile
        this.returnDirect = true
    }

    /** @ignore */
    async _call(input: string) {
        try {
            const [num, name] = parseInputs(input)
            console.log(typeof input, input)
            return `${this.shellFile} ${name} ${num}`
            JSON.stringify(
                {
                    shellFile: this.shellFile,
                    param: input
                }
            )
            // 判断filePath是否是一个文件
           
            return ''
        } catch (error) {
            console.log(error)
            return 'you can directly return action: "Final Answer" , and the input is "Please send the file", the response to my original question is "抱歉，没有实际文件我无法总结合同文件。 请将文件发给我，我很乐意协助您进行总结。"'
        }
    }
}
