import { Position, XYPosition, Node, Edge } from 'reactflow'

// 定义基本类型
interface Dimensions {
    width: number
    height: number
}

interface HandlePosition {
    x: number
    y: number
}

interface Rect {
    x: number
    y: number
    width: number
    height: number
}

// 1. 获取节点中心点位置
export function getNodeCenter(node: Node): XYPosition {
    const width = node.width ?? 0
    const height = node.height ?? 0
    return {
        x: node.position.x + width / 2,
        y: node.position.y + height / 2
    }
}

// 2. 计算句柄在节点上的相对位置
export function getHandlePosition(position: Position, dimensions: Dimensions): HandlePosition {
    let x = 0
    let y = 0

    switch (position) {
        case Position.Top:
            x = dimensions.width / 2
            y = 0
            break
        case Position.Right:
            x = dimensions.width
            y = dimensions.height / 2
            break
        case Position.Bottom:
            x = dimensions.width / 2
            y = dimensions.height
            break
        case Position.Left:
            x = 0
            y = dimensions.height / 2
            break
    }

    return { x, y }
}

// 3. 获取节点的边界矩形
export function getNodeRect(node: Node): Rect {
    const width = node.width ?? 0
    const height = node.height ?? 0
    return {
        x: node.position.x,
        y: node.position.y,
        width,
        height
    }
}

// 4. 计算句柄的绝对位置
export function getHandleAbsolutePosition(node: Node, handlePosition: Position, handleOffset: number = 0): XYPosition {
    const nodeRect = getNodeRect(node)
    const handle = getHandlePosition(handlePosition, { width: nodeRect.width, height: nodeRect.height })

    return {
        x: nodeRect.x + handle.x + handleOffset,
        y: nodeRect.y + handle.y + handleOffset
    }
}

// 5. 应用画布变换
export function applyCanvasTransform(position: XYPosition, transform: { x: number; y: number; zoom: number }): XYPosition {
    return {
        x: (position.x - transform.x) / transform.zoom,
        y: (position.y - transform.y) / transform.zoom
    }
}

// 6. 计算控制点（用于贝塞尔曲线）
export function calculateControlPoints(
    source: XYPosition,
    target: XYPosition,
    sourcePosition: Position,
    targetPosition: Position,
    curvature: number = 0.25
): [XYPosition, XYPosition] {
    const deltaX = Math.abs(target.x - source.x)
    const deltaY = Math.abs(target.y - source.y)
    const offset = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * curvature

    const controlPoint1: XYPosition = { x: source.x, y: source.y }
    const controlPoint2: XYPosition = { x: target.x, y: target.y }

    if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
        controlPoint1.x += sourcePosition === Position.Right ? offset : -offset
    } else {
        controlPoint1.y += sourcePosition === Position.Bottom ? offset : -offset
    }

    if (targetPosition === Position.Left || targetPosition === Position.Right) {
        controlPoint2.x += targetPosition === Position.Right ? -offset : offset
    } else {
        controlPoint2.y += targetPosition === Position.Bottom ? -offset : offset
    }

    return [controlPoint1, controlPoint2]
}

// 7. 生成贝塞尔曲线路径
export function getBezierPath(
    sourceX: number,
    sourceY: number,
    sourcePosition: Position,
    targetX: number,
    targetY: number,
    targetPosition: Position,
    curvature: number = 0.25
): string {
    const [controlPoint1, controlPoint2] = calculateControlPoints(
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
        sourcePosition,
        targetPosition,
        curvature
    )

    return `M${sourceX},${sourceY} C${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${targetX},${targetY}`
}

// 8. 计算边的完整位置信息
export function calculateEdgePosition(
    sourceNode: Node,
    targetNode: Node,
    sourceHandlePosition: Position,
    targetHandlePosition: Position,
    handleOffset: number = 0,
    transform: { x: number; y: number; zoom: number }
): {
    sourceX: number
    sourceY: number
    targetX: number
    targetY: number
    controlPoints: [XYPosition, XYPosition]
} {
    // 1. 获取源节点和目标节点的句柄绝对位置
    const sourcePos = getHandleAbsolutePosition(sourceNode, sourceHandlePosition, handleOffset)
    const targetPos = getHandleAbsolutePosition(targetNode, targetHandlePosition, handleOffset)

    // 2. 应用画布变换
    const transformedSourcePos = applyCanvasTransform(sourcePos, transform)
    const transformedTargetPos = applyCanvasTransform(targetPos, transform)

    // 3. 计算控制点
    const controlPoints = calculateControlPoints(transformedSourcePos, transformedTargetPos, sourceHandlePosition, targetHandlePosition)

    return {
        sourceX: transformedSourcePos.x,
        sourceY: transformedSourcePos.y,
        targetX: transformedTargetPos.x,
        targetY: transformedTargetPos.y,
        controlPoints
    }
}

// 9. 计算两点之间的距离
export function calculateDistance(point1: XYPosition, point2: XYPosition): number {
    const deltaX = point2.x - point1.x
    const deltaY = point2.y - point1.y
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
}

// 10. 计算边的中点
export function calculateEdgeCenter(sourceX: number, sourceY: number, targetX: number, targetY: number): XYPosition {
    return {
        x: sourceX + (targetX - sourceX) / 2,
        y: sourceY + (targetY - sourceY) / 2
    }
}

// 11. 判断点是否在节点内部
export function isPointInNode(point: XYPosition, node: Node): boolean {
    const nodeRect = getNodeRect(node)
    return (
        point.x >= nodeRect.x && point.x <= nodeRect.x + nodeRect.width && point.y >= nodeRect.y && point.y <= nodeRect.y + nodeRect.height
    )
}

// 12. 计算嵌套流程中的相对位置
export function calculateNestedFlowPosition(position: XYPosition, parentContainer: HTMLElement, flowContainer: HTMLElement): XYPosition {
    const parentRect = parentContainer.getBoundingClientRect()
    const flowRect = flowContainer.getBoundingClientRect()
    console.log(`position: `, position)
    console.log(`flowRect.left - parentRect.left: `, flowRect.left - parentRect.left)
    return {
        x: position.x - (flowRect.left - parentRect.left),
        y: position.y - (flowRect.top - parentRect.top)
    }
}

// 13. 获取边的方向
export function getEdgeDirection(sourcePosition: Position, targetPosition: Position): 'horizontal' | 'vertical' | 'mixed' {
    const isSourceHorizontal = sourcePosition === Position.Left || sourcePosition === Position.Right
    const isTargetHorizontal = targetPosition === Position.Left || targetPosition === Position.Right

    if (isSourceHorizontal && isTargetHorizontal) return 'horizontal'
    if (!isSourceHorizontal && !isTargetHorizontal) return 'vertical'
    return 'mixed'
}

// 14. 计算边的角度
export function calculateEdgeAngle(source: XYPosition, target: XYPosition): number {
    const deltaX = target.x - source.x
    const deltaY = target.y - source.y
    return (Math.atan2(deltaY, deltaX) * 180) / Math.PI
}

// 15. 优化边的路径
export type EdgeWithPosition = Edge & {
    sourceX?: number
    sourceY?: number
    targetX?: number
    targetY?: number
    sourcePosition?: Position
    targetPosition?: Position
}

export function optimizeEdgePath(
    sourceNode: Node,
    targetNode: Node,
    edge: EdgeWithPosition,
    nodes: Node[],
    curvature: number = 0.25
): {
    path: string
    adjustedCurvature: number
} {
    // 1. 检查是否有节点阻挡
    const intersectingNodes = nodes.filter((node) => {
        if (node.id === sourceNode.id || node.id === targetNode.id) return false
        // 这里可以添加更复杂的相交检测逻辑
        return false
    })

    // 2. 根据阻挡调整曲率
    let adjustedCurvature = curvature
    if (intersectingNodes.length > 0) {
        adjustedCurvature = Math.min(curvature * 1.5, 0.5)
    }

    // 3. 生成优化后的路径
    const path = getBezierPath(
        edge.sourceX || 0,
        edge.sourceY || 0,
        edge.sourcePosition || Position.Bottom,
        edge.targetX || 0,
        edge.targetY || 0,
        edge.targetPosition || Position.Top,
        adjustedCurvature
    )

    return {
        path,
        adjustedCurvature
    }
}
