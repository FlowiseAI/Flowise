"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../src/utils");
const ollama_1 = require("langchain/llms/ollama");
class OllamaLocalAI {
    constructor() {
        this.label = 'OllamaLocalAI';
        this.name = 'ollamaLocalAI';
        this.version = 1.0;
        this.type = 'OllamaLocalAI';
        this.icon = 'ollama.png';
        this.category = 'Language Models';
        this.description = 'Use local LLMs like llama.cpp, gpt4all using LocalAI';
        this.baseClasses = [this.type, 'BaseLLM', ...(0, utils_1.getBaseClasses)(ollama_1.Ollama)];
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
        ];
    }
    async init(nodeData) {
        const temperature = nodeData.inputs?.temperature;
        const modelName = nodeData.inputs?.modelName;
        const topK = nodeData.inputs?.topK;
        const topP = nodeData.inputs?.topP;
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty;
        const baseUrl = nodeData.inputs?.baseUrl;
        const obj = {
            temperature: parseFloat(temperature),
            model: modelName,
            baseUrl: baseUrl
        };
        if (topK)
            obj.topK = parseInt(topK, 10);
        if (topP)
            obj.topP = parseFloat(topP);
        if (frequencyPenalty)
            obj.frequencyPenalty = parseFloat(frequencyPenalty);
        const model = new ollama_1.Ollama(obj);
        return model;
    }
}
module.exports = { nodeClass: OllamaLocalAI };
//# sourceMappingURL=ollama.js.map