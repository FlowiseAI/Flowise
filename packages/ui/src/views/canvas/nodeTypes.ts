import { NodeTypes } from 'reactflow'
import CanvasNode from './CanvasNode'
import StickyNote from './StickyNote'

// 基础节点类型
export const baseNodeTypes: NodeTypes = {
    customNode: CanvasNode,
    stickyNote: StickyNote
}

// 获取完整节点类型的函数
export const getNodeTypes = (additionalTypes: NodeTypes = {}): NodeTypes => ({
    ...baseNodeTypes,
    ...additionalTypes
})

// 为了向后兼容，保留 nodeTypes 导出
export const nodeTypes = baseNodeTypes
