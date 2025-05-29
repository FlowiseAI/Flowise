import { NodeTypes } from 'reactflow'
import { LoopNode } from './LoopNode'
import { InnerNode } from './InnerNode'
import CanvasNode from './CanvasNode'
import StickyNote from './StickyNote'

export const nodeTypes: NodeTypes = {
    customNode: CanvasNode,
    stickyNote: StickyNote,
    loop: LoopNode,
    innerNode: InnerNode
}
