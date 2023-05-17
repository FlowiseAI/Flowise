import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { FilePro } from './tool'

class FilePro_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = '文件处理'
        this.name = 'FilePro'
        this.type = 'filePro'
        this.icon = 'chaintool.svg'
        this.category = 'Tools'
        this.description = '文件处理'
        this.baseClasses = [this.type, ...getBaseClasses(FilePro)]
        this.inputs = [
            
        ]
    }

    async init(nodeData: INodeData): Promise<any> {

        const tool = new FilePro()

        return tool
    }
}

module.exports = { nodeClass: FilePro_Tools }
