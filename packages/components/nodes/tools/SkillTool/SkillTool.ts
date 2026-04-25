import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { convertSchemaToZod, getBaseClasses } from '../../../src/utils'
import { SkillLangChainTool } from './core'
import { z } from 'zod'
import { DataSource } from 'typeorm'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

class SkillTool_Tools implements INode {
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
        this.label = 'Skill Tool'
        this.name = 'skillTool'
        this.version = 1.0
        this.type = 'SkillTool'
        this.icon = 'skilltool.svg'
        this.category = 'Tools'
        this.description =
            'Execute a Skill — a markdown-defined sub-agent that runs in its own context, keeping the parent agent context lightweight'
        this.inputs = [
            {
                label: 'Select Skills',
                name: 'selectedSkills',
                type: 'asyncMultiOptions',
                loadMethod: 'listSkills',
                refresh: true
            },
            {
                label: 'Skill Model',
                name: 'skillModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true,
                optional: true,
                description: "Model to run this skill. Leave blank to use the orchestration agent's model."
            }
        ]
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(SkillLangChainTool)]
    }

    //@ts-ignore
    loadMethods = {
        async listSkills(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const skills = await appDataSource.getRepository(databaseEntities['Skill']).findBy(searchOptions)

            for (let i = 0; i < skills.length; i += 1) {
                returnData.push({
                    label: skills[i].name,
                    name: skills[i].id,
                    description: skills[i].description
                } as INodeOptionsValue)
            }
            return returnData
        },

        async listModels(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as { [key: string]: INode }
            const returnOptions: INodeOptionsValue[] = []

            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Chat Models') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // Parse multi-selection
        const _selectedSkills = nodeData.inputs?.selectedSkills
        let selectedSkillIds: string[] = []
        if (_selectedSkills) {
            try {
                selectedSkillIds = typeof _selectedSkills === 'string' ? JSON.parse(_selectedSkills) : _selectedSkills
            } catch {
                selectedSkillIds = []
            }
        }

        if (selectedSkillIds.length === 0) return []

        // Fall back to the orchestration agent's model if no skill-specific model is selected
        const model = (nodeData.inputs?.skillModel || nodeData.inputs?.agentModel || nodeData.inputs?.model) as string
        const modelConfig = (nodeData.inputs?.skillModelConfig ||
            nodeData.inputs?.agentModelConfig ||
            nodeData.inputs?.modelConfig) as ICommonObject

        if (!model) {
            throw new Error('SkillTool: No model found. Please select a Skill Model or ensure the parent Agent has a model configured.')
        }

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

        // Init LLM once — shared across all skills on this node
        const nodeInstanceFilePath = options.componentNodes[model].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newLLMNodeInstance = new nodeModule.nodeClass()
        const newNodeData = {
            ...nodeData,
            credential: modelConfig?.['FLOWISE_CREDENTIAL_ID'],
            inputs: {
                ...nodeData.inputs,
                ...modelConfig
            }
        }
        const llm = (await newLLMNodeInstance.init(newNodeData, '', options)) as BaseChatModel

        // Fetch all selected skills and build one SkillLangChainTool per skill
        const skills = await appDataSource.getRepository(databaseEntities['Skill']).findByIds(selectedSkillIds)

        return skills.map((skill) => {
            let schema: z.ZodObject<any, any, any, any>
            if (skill.inputSchema) {
                try {
                    schema = z.object(convertSchemaToZod(JSON.parse(skill.inputSchema)))
                } catch {
                    schema = z.object({ input: z.string().describe('Input for the skill') })
                }
            } else {
                schema = z.object({ input: z.string().describe('Input for the skill') })
            }

            return new SkillLangChainTool({
                name: skill.name,
                description: skill.description,
                markdown: skill.markdown,
                schema,
                llm
            })
        })
    }
}

module.exports = { nodeClass: SkillTool_Tools }
