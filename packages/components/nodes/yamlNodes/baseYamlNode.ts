import { INode, INodeData, INodeParams } from '../../src/Interface'
import { getBaseClasses } from '../../src/utils'

class BaseYamlNode implements INode {
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
        this.label = 'Base YAML'
        this.name = 'baseYaml'
        this.version = 1.0
        this.type = 'BaseYaml'
        this.icon = 'yaml.svg'
        this.category = 'Base'
        this.description = '用于处理YAML文件的基础节点'
        this.baseClasses = [this.type, 'yaml', ...getBaseClasses(BaseYamlNode)]
        this.inputs = [
            {
                label: 'YAML文件',
                name: 'yamlFile',
                type: 'file',
                fileType: '.yaml,.yml',
                description: '请上传YAML格式的文件',
                optional: false
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const yamlFile = nodeData.inputs?.yamlFile as string

        // 在这里可以添加对YAML文件的处理逻辑
        if (!yamlFile) {
            throw new Error('请上传YAML文件')
        }

        return yamlFile
    }
}

module.exports = { nodeClass: BaseYamlNode }
