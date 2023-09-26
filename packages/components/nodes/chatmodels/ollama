import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Ollama } from 'langchain/llms/ollama'
import { OllamaInput } from 'langchain/llms/base'

class OllamaLocalAI implements INode {
label: string
name: string
version: number
type: string
icon: string
category: string
description: string
baseClasses: string[]
inputs: INodeParams[]

constructor() {  
    this.label = 'OllamaLocalAI'  
    this.name = 'ollamaLocalAI'  
    this.version = 1.0  
    this.type = 'OllamaLocalAI'  
    this.icon = 'ollama.png'  
    this.category = 'Language Models'  
    this.description = 'Use local LLMs like llama.cpp, gpt4all using LocalAI'  
    this.baseClasses = [this.type, 'BaseLLM', ...getBaseClasses(Ollama)]  
    this.inputs = [  
        {  
            label: 'Base URL',  
            name: 'baseUrl',  
            type: 'string',  
            placeholder: 'http://localhost:11434'  
        },  
        {  
            label: 'Model Name',  
            name: 'modelName',  
            type: 'string',  
            placeholder: 'llama2'  
        },  
        {  
            label: 'Temperature',  
            name: 'temperature',  
            type: 'number',  
            step: 0.1,  
            default: 0.9,  
            optional: true  
        },  
        {  
            label: 'Top K',  
            name: 'topK',  
            type: 'number',  
            step: 1,  
            optional: true,  
            additionalParams: true  
        },  
        {  
            label: 'Top P',  
            name: 'topP',  
            type: 'number',  
            step: 0.1,  
            optional: true,  
            additionalParams: true  
        },  
        {  
            label: 'Frequency Penalty',  
            name: 'frequencyPenalty',  
            type: 'number',  
            step: 0.1,  
            optional: true,  
            additionalParams: true  
        }  
    ]  
}  

async init(nodeData: INodeData): Promise<any> {  
    const temperature = nodeData.inputs?.temperature as string  
    const modelName = nodeData.inputs?.modelName as string  
    const topK = nodeData.inputs?.topK as string  
    const topP = nodeData.inputs?.topP as string  
    const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string  
    const baseUrl = nodeData.inputs?.baseUrl as string  

    const obj: Partial<OllamaInput> = {  
        temperature: parseFloat(temperature),  
        model: modelName,  
        baseUrl: baseUrl  
    }  

    if (topK) obj.topK = parseInt(topK, 10)  
    if (topP) obj.topP = parseFloat(topP)  
    if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)  

    const model = new Ollama(obj)  

    return model  
}  
}

module.exports = { nodeClass: OllamaLocalAI }
