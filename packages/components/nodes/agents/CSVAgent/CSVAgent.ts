import { ICommonObject, INode, INodeData, INodeParams, PromptTemplate } from '../../../src/Interface'
import { AgentExecutor } from 'langchain/agents'
import { getBaseClasses } from '../../../src/utils'
import { LoadPyodide, finalSystemPrompt, systemPrompt } from './core'
import { LLMChain } from 'langchain/chains'
import { BaseLanguageModel } from 'langchain/base_language'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'

class CSV_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'CSV Agent'
        this.name = 'csvAgent'
        this.version = 1.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'csvagent.png'
        this.description = 'Agent used to to answer queries on CSV data'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Csv File',
                name: 'csvFile',
                type: 'file',
                fileType: '.csv'
            },
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder:
                    'I want you to act as a document that I am having a conversation with. Your name is "AI Assistant". You will provide me with answers from the given info. If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. Refuse to answer any question not about the info. Never break character.'
            }
        ]
    }

    async init(): Promise<any> {
        // Not used
        return undefined
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const csvFileBase64 = nodeData.inputs?.csvFile as string
        const model = nodeData.inputs?.model as BaseLanguageModel
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
        const callbacks = await additionalCallbacks(nodeData, options)

        let files: string[] = []

        if (csvFileBase64.startsWith('[') && csvFileBase64.endsWith(']')) {
            files = JSON.parse(csvFileBase64)
        } else {
            files = [csvFileBase64]
        }

        let base64String = ''

        for (const file of files) {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            base64String = splitDataURI.pop() ?? ''
        }

        const pyodide = await LoadPyodide()

        // First load the csv file and get the dataframe dictionary of column types
        // For example using titanic.csv: {'PassengerId': 'int64', 'Survived': 'int64', 'Pclass': 'int64', 'Name': 'object', 'Sex': 'object', 'Age': 'float64', 'SibSp': 'int64', 'Parch': 'int64', 'Ticket': 'object', 'Fare': 'float64', 'Cabin': 'object', 'Embarked': 'object'}
        let dataframeColDict = ''
        try {
            const code = `import pandas as pd
import base64
from io import StringIO
import json

base64_string = "${base64String}"

decoded_data = base64.b64decode(base64_string)

csv_data = StringIO(decoded_data.decode('utf-8'))

df = pd.read_csv(csv_data)
my_dict = df.dtypes.astype(str).to_dict()
print(my_dict)
json.dumps(my_dict)`
            dataframeColDict = await pyodide.runPythonAsync(code)
        } catch (error) {
            throw new Error(error)
        }

        // Then tell GPT to come out with ONLY python code
        // For example: len(df), df[df['SibSp'] > 3]['PassengerId'].count()
        let pythonCode = ''
        if (dataframeColDict) {
            const chain = new LLMChain({
                llm: model,
                prompt: PromptTemplate.fromTemplate(systemPrompt),
                verbose: process.env.DEBUG === 'true' ? true : false
            })
            const inputs = {
                dict: dataframeColDict,
                question: input
            }
            const res = await chain.call(inputs, [loggerHandler, ...callbacks])
            pythonCode = res?.text
        }

        // Then run the code using Pyodide
        let finalResult = ''
        if (pythonCode) {
            try {
                const code = `import pandas as pd\n${pythonCode}`
                finalResult = await pyodide.runPythonAsync(code)
            } catch (error) {
                throw new Error(`Sorry, I'm unable to find answer for question: "${input}" using follwoing code: "${pythonCode}"`)
            }
        }

        // Finally, return a complete answer
        if (finalResult) {
            const chain = new LLMChain({
                llm: model,
                prompt: PromptTemplate.fromTemplate(
                    systemMessagePrompt ? `${systemMessagePrompt}\n${finalSystemPrompt}` : finalSystemPrompt
                ),
                verbose: process.env.DEBUG === 'true' ? true : false
            })
            const inputs = {
                question: input,
                answer: finalResult
            }

            if (options.socketIO && options.socketIOClientId) {
                const result = await chain.call(inputs, [loggerHandler, handler, ...callbacks])
                return result?.text
            } else {
                const result = await chain.call(inputs, [loggerHandler, ...callbacks])
                return result?.text
            }
        }

        return pythonCode
    }
}

module.exports = { nodeClass: CSV_Agents }
