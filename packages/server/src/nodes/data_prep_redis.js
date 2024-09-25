'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
// const modelLoader_1 = require("../../../src/modelLoader");
// const utils_1 = require("../../../src/utils");
// const llamaindex_1 = require("llamaindex");
class OPEADataPrep {
    constructor() {
        //@ts-ignore
        // this.loadMethods = {
        //     async listModels() {
        //         return await (0, modelLoader_1.getModels)(modelLoader_1.MODEL_TYPE.EMBEDDING, 'openAIEmbedding_LlamaIndex');
        //     }
        // };
        this.label = 'Data Prep'
        this.name = 'opea_data_prep'
        this.version = 1.0
        this.type = 'OpeaDataPrep'
        this.icon = 'openai.svg'
        this.category = 'Data Prep'
        this.description = 'Data Preparation with redis using Langchain'
        this.baseClasses = [this.type]
        // this.baseClasses = [this.type, 'BaseEmbedding_LlamaIndex', ...(0, utils_1.getBaseClasses)(llamaindex_1.OpenAIEmbedding)];
        this.tags = ['OPEA']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'text-embedding-ada-002'
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init() {
        return null
    }
    // async init(nodeData, _, options) {
    // const timeout = nodeData.inputs?.timeout;
    // const modelName = nodeData.inputs?.modelName;
    // const basePath = nodeData.inputs?.basepath;
    // const credentialData = await (0, utils_1.getCredentialData)(nodeData.credential ?? '', options);
    // const openAIApiKey = (0, utils_1.getCredentialParam)('openAIApiKey', credentialData, nodeData);
    // const obj = {
    //     apiKey: openAIApiKey,
    //     model: modelName
    // };
    // if (timeout)
    //     obj.timeout = parseInt(timeout, 10);
    // if (basePath) {
    //     obj.additionalSessionOptions = {
    //         baseURL: basePath
    //     };
    // }
    // const model = new llamaindex_1.OpenAIEmbedding(obj);
    // return model;
    // }
}
module.exports = { nodeClass: OPEADataPrep }
//# sourceMappingURL=OpenAIEmbedding_LlamaIndex.js.map
