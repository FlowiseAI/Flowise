import { ICommonObject, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'

class StartFunction_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    result: any

    constructor() {
        this.label = '开始'
        this.name = 'startFunction'
        this.version = 1.0
        this.type = 'StartFunction'
        this.icon = 'start.svg'
        this.category = 'Utilities'
        this.description = '工作流的起始节点，用于接收输入参数'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
        this.inputs = [
            {
                label: 'inputValue',
                name: 'inputValue',
                type: 'string',
                description: '输入参数值',
                optional: false,
                placeholder: '请输入参数值'
            },
            {
                label: 'sys.files',
                name: 'sysFiles',
                type: 'file',
                description: '系统文件',
                optional: true,
                list: true
            },
            {
                label: 'sys.user_id',
                name: 'sysUserId',
                type: 'string',
                description: '系统用户ID',
                optional: true,
                placeholder: '用户ID'
            },
            {
                label: 'sys.app_id',
                name: 'sysAppId',
                type: 'string',
                description: '系统应用ID',
                optional: true,
                placeholder: '应用ID'
            },
            {
                label: 'sys.workflow_id',
                name: 'sysWorkflowId',
                type: 'string',
                description: '工作流ID',
                optional: true,
                placeholder: '工作流ID'
            },
            {
                label: 'sys.workflow_run_id',
                name: 'sysWorkflowRunId',
                type: 'string',
                description: '工作流运行ID',
                optional: true,
                placeholder: '工作流运行ID'
            }
        ]
        this.outputs = [
            {
                label: 'Output',
                name: 'output',
                baseClasses: ['string', 'number', 'json', 'array', 'file']
            }
        ]
    }

    async init(nodeData: INodeData, _input: string, _options: ICommonObject): Promise<any> {
        const inputValue = nodeData.inputs?.inputValue as string
        const sysFiles = nodeData.inputs?.sysFiles
        const sysUserId = nodeData.inputs?.sysUserId
        const sysAppId = nodeData.inputs?.sysAppId
        const sysWorkflowId = nodeData.inputs?.sysWorkflowId
        const sysWorkflowRunId = nodeData.inputs?.sysWorkflowRunId

        // 构建输出对象
        const output = {
            inputValue,
            sys: {
                files: sysFiles,
                user_id: sysUserId,
                app_id: sysAppId,
                workflow_id: sysWorkflowId,
                workflow_run_id: sysWorkflowRunId
            }
        }

        // 保存结果到节点实例
        this.result = output

        return output
    }
}

module.exports = { nodeClass: StartFunction_Utilities }
