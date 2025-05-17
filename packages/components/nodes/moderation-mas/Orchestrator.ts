import { INode, INodeOutputsValue } from '../../src/Interface'
import { getBaseClasses } from '../../src/utils'

class Orchestrator_Node implements INode {
  label = 'MAS Orchestrator'
  name = 'masOrchestrator'
  version = 1.0
  type = 'Agent'
  icon = 'mas-orchestrator.svg'
  category = 'MAS'
  description = 'Route messages among MAS tools'
  baseClasses = ['Plugin']

  // 前端可配置字段
  inputs = [
    { label: 'PostText', name: 'postText', type: 'string' }
  ]
  outputs = [
    { label: 'ModerationResult', name: 'result', type: 'object' } as INodeOutputsValue
  ]

// 为 input 参数显式指定类型，避免隐式 any 类型
async run(input: any) {
    // 简化示例：串行调用五个子节点
    const text = input.postText as string
    // 调用子节点 via this.executeNode, 详见官方示例
    // ...
    return { ok: true }
  }
}
module.exports = { nodeClass: Orchestrator_Node }
