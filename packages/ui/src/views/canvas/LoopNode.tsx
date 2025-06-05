import React, { useCallback, useState, useRef, useEffect, useMemo, useContext } from 'react'
import ReactFlow, {
    Position,
    useNodesState,
    useEdgesState,
    Handle,
    NodeResizer,
    Background,
    Controls,
    NodeProps,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    applyNodeChanges,
    applyEdgeChanges,
    ReactFlowProvider,
    useReactFlow,
    Connection,
    EdgeTypes,
    ReactFlowInstance
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useTheme } from '@mui/material/styles'
import { baseNodeTypes } from './nodeTypes'
import { getUniqueNodeId, initNode } from '@/utils/genericHelper'
import { IconButton } from '@mui/material'
import { IconCopy, IconTrash, IconInfoCircle } from '@tabler/icons-react'
import NodeTooltip from '../../ui-component/tooltip/NodeTooltip'
import { isEqual } from 'lodash'
import ButtonEdge from './ButtonEdge'

import { flowContext } from '../../store/context/ReactFlowContext'
import ExpandTextDialog from '../../ui-component/dialog/ExpandTextDialog'

// 定义基础节点数据类型
interface BaseNodeData {
    id: string
    type: string
    isInLoop?: boolean
    parentId?: string
    inputs?: Record<string, any>
    outputs?: Record<string, any>
    [key: string]: any
}

// 定义循环节点数据类型
export interface LoopNodeData extends BaseNodeData {
    title?: string
    description?: string
    loopCount: number
    startNodeId?: string
    children: any[]
    type: 'loop'
    selected?: boolean
    width?: string
    height?: string
    inputAnchors?: any[]
    inputParams?: any[]
    outputs?: Record<string, any>
    outputAnchors?: any[]
    onNodesChange?: (changes: NodeChange[]) => void
    duplicateNode?: (data: object, newData?: LoopNodeData) => void
    deleteNode?: (id: string) => void
}

// 循环节点的样式
const loopNodeStyles = {
    background: '#fff',
    padding: '15px',
    borderRadius: '16px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    width: '900px',
    height: '500px',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const
}

// 定义基础节点类型
// type NodeTypes = {
//     [key: string]: React.ComponentType<NodeProps>
// }

// 基础节点类型
const baseTypes = {
    ...baseNodeTypes
}

// 循环节点组件
export const LoopNode: React.FC<NodeProps<LoopNodeData>> = ({ data, id }) => {
    const theme = useTheme()
    const { getNode, getNodes, setNodes: setFlowNodes } = useReactFlow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const flowRef = useRef<HTMLDivElement>(null)
    const [nodes, setNodes] = useNodesState<Node[]>(data?.innerNodes || [])
    const [edges, setEdges] = useEdgesState<Edge[]>(data?.innerEdges || [])
    const [isHovered, setIsHovered] = useState(false)
    const prevNodesRef = useRef<Node[]>([])
    const innerFlowId = useMemo(() => `loop-flow-${id}`, [id])

    const { reactFlowInstance, deleteNode } = useContext(flowContext) as {
        reactFlowInstance: ReactFlowInstance | null
        deleteNode: (id: string) => void
    }

    // 修改状态名称以保持一致
    // 定义默认的输入值
    const defaultInputValue = '// Check if the result meets your criteria\nreturn true'
    const [showExpandDialog, setShowExpandDialog] = useState(false)

    const [expandDialogProps, setExpandDialogProps] = useState({
        value: data.inputs?.successCondition || defaultInputValue,
        inputParam: {
            name: 'successCondition',
            label: 'Success Condition',
            type: 'code',
            rows: 4,
            description: 'JavaScript condition to determine if the result is successful. Return true for success, false for failure.',
            default: defaultInputValue,
            placeholder: defaultInputValue,
            id,
            display: true
        },
        disabled: false,
        nodes: [],
        edges: [],
        nodeId: id,
        cancelButtonName: 'Cancel',
        confirmButtonName: 'Save'
    })

    // 修改边类型
    const edgeTypes: EdgeTypes = useMemo(
        () => ({
            buttonedge: (props) => <ButtonEdge {...props} isLoop={true} dataFlowId={innerFlowId} />
        }),
        []
    )

    // 添加删除节点的处理函数
    const onNodesDelete = useCallback(
        (nodesToDelete: Node[]) => {
            const nodeIdsToDelete = nodesToDelete.map((node: Node) => node.id)

            // 删除相关的边
            setEdges((edges: Edge[]) =>
                edges.filter((edge: Edge) => {
                    return !(nodeIdsToDelete.includes(edge.source) || nodeIdsToDelete.includes(edge.target))
                })
            )

            // 删除节点
            setNodes((nodes: Node[]) => nodes.filter((node: Node) => !nodeIdsToDelete.includes(node.id)))
        },
        [setNodes, setEdges]
    )

    // 添加节点变更处理函数
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // 处理删除类型的变更
            const deletions = changes.filter((change) => change.type === 'remove')

            if (deletions.length > 0) {
                const nodesToDelete = nodes.filter((node: Node) => deletions.some((deletion) => deletion.id === node.id))
                if (nodesToDelete.length > 0) {
                    onNodesDelete(nodesToDelete)
                }
                return
            }
            // 处理其他类型的变更
            setNodes((nds) => applyNodeChanges(changes, nds))
        },
        [nodes, onNodesDelete]
    )

    // 监听节点变化的回调函数
    const handleNodesChange = useCallback(() => {
        setTimeout(() => {
            const allNodes: Node[] = getNodes()
            const currentNode: Node | undefined = allNodes.find((node: Node) => node.id === id)

            // 检查节点数据是否真的发生了变化
            const prevNodes = prevNodesRef.current
            const hasChanged = !isEqual(currentNode?.data?.innerNodes, prevNodes.find((n) => n.id === id)?.data?.innerNodes)

            if (hasChanged && currentNode?.data?.innerNodes) {
                prevNodesRef.current = allNodes
                setNodes(
                    currentNode.data.innerNodes.map((node: Node) => ({
                        ...node,
                        data: {
                            ...node.data,
                            isInLoop: true,
                            parentId: id,
                            onNodesChange
                        }
                    }))
                )
                if (currentNode.data.innerEdges) {
                    setEdges(currentNode.data.innerEdges)
                }
            }
        }, 0)
    }, [getNodes, setNodes, setEdges, onNodesChange])

    // 监听外部节点变化
    useEffect(() => {
        // 初始化时执行一次
        handleNodesChange()

        // 添加自定义事件监听器
        const handleCustomEvent = () => {
            handleNodesChange()
        }

        // 添加对 edges 变化的监听
        const handleEdgesChange = (event: CustomEvent) => {
            const { detail } = event || {}
            const { edgeid, isDelete } = detail || {}
            if (isDelete) {
                setEdges((eds) => {
                    return eds.filter((edge: Edge) => edge.id !== edgeid)
                })
            }

            if (data) {
                const updatedData = {
                    ...data,
                    innerEdges: isDelete ? edges.filter((edge: Edge) => edge.id !== edgeid) : edges
                }

                // 更新 store 中的数据
                const currentNode = getNode(id)
                if (currentNode) {
                    setFlowNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === id) {
                                return { ...node, data: updatedData }
                            }
                            return node
                        })
                    )
                }

                // 直接更新 data 对象
                Object.assign(data, updatedData)
            }
        }
        window.addEventListener('reactflow-nodes-update', handleCustomEvent as EventListener)
        window.addEventListener('reactflow-edges-update', handleEdgesChange as EventListener)

        return () => {
            window.removeEventListener('reactflow-nodes-update', handleCustomEvent as EventListener)
            window.removeEventListener('reactflow-edges-update', handleEdgesChange as EventListener)
        }
    }, [getNode, id, setFlowNodes])

    // const nodeTypesRef = useRef<NodeTypes>(createNodeWrappers(onNodesChange))

    // 保存内部节点到父节点的数据中
    useEffect(() => {
        //添加settimeout防止立即触发导致无法删除
        setTimeout(() => {
            if (data) {
                const updatedData = {
                    ...data,
                    innerNodes: nodes.map((node: Node) => ({
                        ...node,
                        data: {
                            ...node.data,
                            isInLoop: true,
                            parentId: id,
                            onNodesChange
                        }
                    })),
                    innerEdges: edges
                }

                // 更新 store 中的数据
                const currentNode = getNode(id)
                if (currentNode) {
                    reactFlowInstance?.setNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === id) {
                                return { ...node, data: updatedData }
                            }
                            return node
                        })
                    )
                }

                // 直接更新 data 对象
                Object.assign(data, updatedData)
            }
        }, 1)
    }, [nodes, edges, id, getNode, setFlowNodes])

    const initNodes = () => {
        if (data?.innerNodes && data?.innerEdges) {
            const restoredNodes = data.innerNodes.map((node: { data: any }) => ({
                ...node,
                data: {
                    ...node.data,
                    isInLoop: true,
                    onNodesChange
                }
            }))
            setNodes(restoredNodes)
            setEdges(data.innerEdges)
        }
    }

    // 初始化时从父节点数据中恢复内部节点
    useEffect(() => {
        initNodes()
    }, [])

    // 添加清理状态的effect
    useEffect(() => {
        // 监听节点是否被删除
        const currentNode = getNode(id)
        if (!currentNode) {
            // 节点已被删除，清理内部状态
            setNodes([])
            setEdges([])
            if (data) {
                data.innerNodes = []
                data.innerEdges = []
            }
        }
    }, [id, getNode, setNodes, setEdges, data])

    // 修改删除按钮的处理函数
    const handleDelete = useCallback(() => {
        // 先清理内部状态
        setNodes([])
        setEdges([])
        if (data) {
            data.innerNodes = []
            data.innerEdges = []
        }
        // 调用删除函数
        deleteNode(id)
    }, [data, id, setNodes, setEdges])

    // 确保 data 对象包含必要的属性
    if (!data.inputs) {
        data.inputs = {}
    }
    if (!data.inputAnchors) {
        data.inputAnchors = []
    }
    if (!data.inputParams) {
        data.inputParams = []
    }
    if (!data.outputs) {
        data.outputs = {}
    }
    if (!data.outputAnchors) {
        data.outputAnchors = []
    }

    // 定义输入输出参数
    const inputAnchor = {
        id: `${id}-input-input-string|number|json|array|file`,
        type: 'target',
        position: Position.Left,
        label: 'Input',
        optional: false,
        name: 'input',
        baseClasses: ['string', 'number', 'json', 'array', 'file']
    }

    const inputParam = {
        name: 'input',
        type: 'string|number|json|array|file',
        label: 'Input',
        optional: false,
        acceptVariable: true,
        id: `${id}-input-input-string|number|json|array|file`,
        baseClasses: ['string', 'number', 'json', 'array', 'file']
    }

    const outputAnchor = {
        id: `${id}-output-output-string|number|json|array|file`,
        type: 'source',
        position: Position.Right,
        label: 'Output',
        optional: false,
        name: 'output',
        baseClasses: ['string', 'number', 'json', 'array', 'file']
    }

    // 更新 data 对象
    data.inputAnchors = [inputAnchor]
    data.inputParams = [inputParam]
    data.outputAnchors = [outputAnchor]
    data.outputs = {
        output: 'string|number|json|array|file'
    }

    // 内部ReactFlow的样式
    const innerFlowStyle = {
        background: 'transparent',
        width: '100%',
        height: '100%',
        borderRadius: '4px',
        border: '1px solid #eee'
    }

    // 内部背景样式
    const innerBackgroundStyle = {
        position: 'absolute' as const,
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none' as const,
        zIndex: 0,
        backgroundColor: '#fff'
    }

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            setEdges((eds) => applyEdgeChanges(changes, eds))
            // 触发边更新事件
            window.dispatchEvent(new Event('reactflow-edges-update'))
        },
        [setEdges]
    )

    interface NodeStyle {
        background: string
        padding: string
        borderRadius: string
        boxShadow: string
        width: string
        height: string
        display: string
        flexDirection: 'column'
        position: 'relative'
        border: string
    }

    const initialNodeStyle: NodeStyle = {
        ...loopNodeStyles,
        border: '1px solid #e5e5e5',
        width: data?.width || '900px',
        height: data?.height || '500px'
    }

    const [nodeStyle, setNodeStyle] = useState<NodeStyle>(initialNodeStyle)

    // 初始化节点样式
    useEffect(() => {
        if (data?.width && data?.height) {
            const width = typeof data.width === 'string' ? data.width : '900px'
            const height = typeof data.height === 'string' ? data.height : '500px'

            setNodeStyle((prev: NodeStyle) => ({
                ...prev,
                width,
                height
            }))
        }
    }, [data?.width, data?.height])

    const onResize = useCallback(
        (event: any, params: { width: number; height: number }) => {
            const { width, height } = params
            const newWidth = `${width}px`
            const newHeight = `${height}px`

            setNodeStyle((prev: NodeStyle) => ({
                ...prev,
                width: newWidth,
                height: newHeight
            }))

            // 更新当前节点的数据
            const currentNode = getNode(id)
            if (currentNode && data) {
                data.width = newWidth
                data.height = newHeight

                // 更新 store 中的节点数据
                setFlowNodes((nds) =>
                    nds.map((node) => {
                        if (node.id === id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    width: newWidth,
                                    height: newHeight
                                }
                            }
                        }
                        return node
                    })
                )
            }
        },
        [data, id, getNode, setFlowNodes]
    )

    // 添加连接验证函数
    const isValidConnection = useCallback(
        (connection: any) => {
            // 防止自连接
            if (connection.source === connection.target) {
                return false
            }

            // 获取源节点和目标节点
            const sourceNode = getNode(connection.source || '')
            const targetNode = getNode(connection.target || '')

            // 获取源句柄和目标句柄的类型
            const sourceTypes = connection.sourceHandle?.split('-').pop()?.split('|') || []
            const targetTypes = connection.targetHandle?.split('-').pop()?.split('|') || []

            // 检查类型是否匹配
            const hasMatchingType = sourceTypes.some((type: string) => targetTypes.includes(type))

            return hasMatchingType
        },
        [getNode]
    )

    // 内部拖拽处理
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    // 修改句柄ID的生成逻辑
    const getInnerHandleId = useCallback((baseId: string) => `${innerFlowId}-${baseId}`, [innerFlowId])

    // 修改 onDrop 函数中的节点 ID 生成
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()
            event.stopPropagation()

            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
            if (!reactFlowBounds) return

            let nodeData = event.dataTransfer.getData('application/reactflow')
            if (!nodeData) return

            try {
                const parsedNodeData = JSON.parse(nodeData)

                // 计算放置位置
                const position = {
                    x: event.clientX - reactFlowBounds.left - 100,
                    y: event.clientY - reactFlowBounds.top - 50
                }

                // 生成唯一ID，添加内部流程标识
                const baseId = getUniqueNodeId(parsedNodeData, nodes)
                const newNodeId = `${innerFlowId}_${baseId}`

                // 创建新节点，添加 isInLoop 标记和节点列表
                const newNode = {
                    id: newNodeId,
                    position,
                    positionAbsolute: position,
                    type: parsedNodeData.type === 'StickyNote' ? 'stickyNote' : parsedNodeData.type === 'group' ? 'group' : 'customNode',
                    data: {
                        ...initNode(parsedNodeData, newNodeId),
                        position,
                        positionAbsolute: position,
                        isInLoop: true,
                        onNodesChange: onNodesChange as unknown as (changes: NodeChange[]) => void,
                        parentId: id,
                        nodes: nodes as Node[],
                        flowId: innerFlowId
                    }
                }

                // 添加节点
                setNodes((nds) => nds.concat(newNode))
            } catch (error) {
                console.error('Error adding node:', error)
            }
        },
        [nodes, setNodes, onNodesChange, innerFlowId]
    )

    // 在组件内部添加复制功能
    const handleDuplicate = useCallback(() => {
        if (data.duplicateNode) {
            data.duplicateNode({ id })
        }
    }, [id, data, nodes])

    // 修改 handleConnect 函数
    const handleConnect = useCallback(
        (params: Connection) => {
            console.log('handleConnect', params)
            if (!params.source || !params.target) return

            // 创建新的边ID，包含内部流程标识
            const newEdgeId = `${innerFlowId}-${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`

            // 检查是否已存在相同ID的边
            const edgeExists = edges.some((edge: Edge) => edge.id === newEdgeId)
            if (edgeExists) {
                console.log('边已存在，跳过创建:', newEdgeId)
                return
            }

            // 创建新的边
            const newEdge: Edge = {
                id: newEdgeId,
                source: params.source,
                target: params.target,
                sourceHandle: params.sourceHandle,
                targetHandle: params.targetHandle,
                type: 'buttonedge',
                data: {
                    flowId: innerFlowId // 添加流程标识
                }
            }

            // 查找源节点和目标节点
            const sourceNode = nodes.find((node: Node<any>) => node.id === params.source)
            const targetNode = nodes.find((node: Node<any>) => node.id === params.target)

            console.log('循环节点连接事件:', {
                sourceNode,
                targetNode,
                params,
                flowId: innerFlowId
            })

            // 如果源节点是循环节点
            if (sourceNode?.id === id) {
                // 更新目标节点的数据
                setNodes((nds) =>
                    nds.map((node: Node<any>) => {
                        if (node.id === targetNode?.id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    isInLoop: true,
                                    parentId: id,
                                    flowId: innerFlowId
                                }
                            } as Node<any>
                        }
                        return node
                    })
                )
            }

            // 如果目标节点是循环节点
            if (targetNode?.id === id) {
                // 更新源节点的数据
                setNodes((nds) =>
                    nds.map((node: Node<any>) => {
                        if (node.id === sourceNode?.id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    isInLoop: true,
                                    parentId: id,
                                    flowId: innerFlowId
                                }
                            } as Node<any>
                        }
                        return node
                    })
                )
            }

            // 添加新的边
            console.log('添加新的边', newEdge)
            setEdges((eds) => [...eds, newEdge])
            // 触发边更新事件
            window.dispatchEvent(
                new CustomEvent('reactflow-edges-update', {
                    detail: {
                        flowId: innerFlowId,
                        edge: newEdge
                    }
                })
            )
        },
        [id, nodes, edges, setNodes, setEdges, innerFlowId]
    )

    // 添加鼠标移动事件监听
    useEffect(() => {
        let isDragging = false
        let startHandle: Element | null = null

        const getParentZoom = () => {
            const parent = document.querySelector('.react-flow')
            if (!parent) return 1
            const flowPane = parent.querySelector('.react-flow__viewport')
            const parentTransform = getComputedStyle(flowPane!).transform
            const matrix = parentTransform.match(/matrix.*\((.+)\)/)
            let transformMatrix = [1, 0, 0, 1, 0, 0] // 默认值
            if (matrix) {
                transformMatrix = matrix[1].split(', ').map(Number)
            }
            const zoom = Math.sqrt(transformMatrix[0] * transformMatrix[0] + transformMatrix[1] * transformMatrix[1])
            return zoom
        }

        const getHandlePosition = (handle: Element | null, container: Element | null) => {
            if (!handle || !container) return null

            const handleBounds = handle.getBoundingClientRect()
            const containerBounds = container.getBoundingClientRect()
            const flowPane = container.querySelector('.react-flow__viewport')
            const flowTransform = flowPane ? getComputedStyle(flowPane).transform : 'none'
            let transformMatrix = [1, 0, 0, 1, 0, 0] // 默认值
            if (flowTransform && flowTransform !== 'none') {
                const matrix = flowTransform.match(/matrix.*\((.+)\)/)
                if (matrix) {
                    transformMatrix = matrix[1].split(', ').map(Number)
                }
            }

            // 提取缩放和平移值
            const zoom = Math.sqrt(transformMatrix[0] * transformMatrix[0] + transformMatrix[1] * transformMatrix[1])
            const translateX = transformMatrix[4]
            const translateY = transformMatrix[5]
            const parentZoom = getParentZoom()

            // 计算相对位置，考虑handle的中心点偏移
            const handleOffset = handleBounds.width / 2 // handle的一半宽度
            let x = ((handleBounds.left - containerBounds.left) / parentZoom - translateX) / zoom
            let y = ((handleBounds.top - containerBounds.top) / parentZoom - translateY) / zoom

            // 根据handle的位置添加偏移
            if (handle.getAttribute('data-handlepos') === 'left') {
                x += handleOffset
            } else if (handle.getAttribute('data-handlepos') === 'right') {
                x -= handleOffset
            }
            y += handleBounds.height / 2
            return { x, y }
        }

        const handleMouseDown = (event: Event) => {
            const mouseEvent = event as MouseEvent
            const handle = (mouseEvent.target as Element)?.closest('.react-flow__handle')
            if (handle) {
                const flowId = (mouseEvent.target as Element)?.closest('[data-flow-id]')?.getAttribute('data-flow-id')
                if (flowId === innerFlowId) {
                    isDragging = true
                    startHandle = handle
                }
            }
        }

        const handleMouseUp = () => {
            isDragging = false
            startHandle = null
        }

        const handleMouseMove = (event: Event) => {
            if (!isDragging || !flowRef.current || !startHandle) return
            const mouseEvent = event as MouseEvent

            // 获取 ReactFlow 容器
            const flowElement = flowRef.current
            const tempConnection = flowElement.querySelector('.react-flow__connection')
            if (tempConnection) {
                const pathElement = tempConnection.querySelector('path')
                if (pathElement) {
                    // 阻止 ReactFlow 默认的路径更新

                    // 初始设置路径
                    const sourcePos = getHandlePosition(startHandle, flowElement)
                    if (!sourcePos) return

                    const containerBounds = flowElement.getBoundingClientRect()
                    const flowPane = flowElement.querySelector('.react-flow__viewport')
                    const flowTransform = flowPane ? getComputedStyle(flowPane).transform : 'none'
                    let transformMatrix = [1, 0, 0, 1, 0, 0]
                    if (flowTransform && flowTransform !== 'none') {
                        const matrix = flowTransform.match(/matrix.*\((.+)\)/)
                        if (matrix) {
                            transformMatrix = matrix[1].split(', ').map(Number)
                        }
                    }

                    const zoom = Math.sqrt(transformMatrix[0] * transformMatrix[0] + transformMatrix[1] * transformMatrix[1])
                    const translateX = transformMatrix[4]
                    const translateY = transformMatrix[5]
                    const parentZoom = getParentZoom()

                    const mouseX = ((mouseEvent.clientX - containerBounds.left) / parentZoom - translateX) / zoom
                    const mouseY = ((mouseEvent.clientY - containerBounds.top) / parentZoom - translateY) / zoom

                    const dx = Math.abs(mouseX - sourcePos.x) * 0.5
                    const pathData = `M${sourcePos.x},${sourcePos.y} C${sourcePos.x + dx},${sourcePos.y} ${
                        mouseX - dx
                    },${mouseY} ${mouseX},${mouseY}`

                    requestAnimationFrame(() => {
                        pathElement.setAttribute('d', pathData)
                    })
                }
            }
        }

        const flowElement = flowRef.current
        if (flowElement) {
            flowElement.addEventListener('mousedown', handleMouseDown as EventListener)
            flowElement.addEventListener('mouseup', handleMouseUp as EventListener)
            flowElement.addEventListener('mousemove', handleMouseMove as EventListener)

            return () => {
                flowElement.removeEventListener('mousedown', handleMouseDown as EventListener)
                flowElement.removeEventListener('mouseup', handleMouseUp as EventListener)
                flowElement.removeEventListener('mousemove', handleMouseMove as EventListener)
            }
        }
    }, [innerFlowId])

    // 修改处理函数名称
    const onExpandDialogSave = (newValue: string, inputParamName: string) => {
        setShowExpandDialog(false)
        reactFlowInstance?.setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id === id) {
                    node.data.inputs[inputParamName] = newValue
                }
                return node
            })
        )
    }

    // 修改点击处理函数
    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowExpandDialog(true)
    }

    return (
        <div
            role='button'
            tabIndex={0}
            style={{
                ...nodeStyle,
                pointerEvents: 'all', // 确保事件能被捕获
                userSelect: 'none' // 防止文本被选中
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
                // 阻止事件冒泡，防止节点被选中
                e.stopPropagation()
                // 取消节点的选中状态
                setNodes((nds) =>
                    nds.map((node) => {
                        if (node.id === id) {
                            return {
                                ...node,
                                selected: false,
                                selectable: false // 设置节点不可选
                            }
                        }
                        return node
                    })
                )
            }}
            onKeyDown={(e) => {
                e.stopPropagation()
            }}
            onMouseDown={(e) => {
                // 阻止鼠标按下事件，防止节点被选中
                e.stopPropagation()
            }}
        >
            <NodeResizer
                minWidth={180}
                minHeight={100}
                isVisible={true}
                onResize={onResize}
                handleStyle={{
                    width: 24,
                    height: 24,
                    right: -12,
                    bottom: -12,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'se-resize'
                }}
                lineStyle={{
                    display: 'none'
                }}
            />
            <IconButton
                onClick={handleExpandClick}
                sx={{
                    position: 'absolute',
                    right: '16px',
                    top: '16px',
                    height: '40px',
                    width: '40px',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover
                    },
                    zIndex: 1
                }}
            >
                <svg width='60' height='60' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path
                        d='M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                </svg>
            </IconButton>
            <div className='resize-indicator' />
            <NodeTooltip
                open={isHovered}
                onClose={() => setIsHovered(false)}
                onOpen={() => setIsHovered(true)}
                disableFocusListener={true}
                title={
                    <div
                        style={{
                            background: 'transparent',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <IconButton
                            title='Duplicate'
                            onClick={handleDuplicate}
                            sx={{
                                height: '35px',
                                width: '35px',
                                backgroundColor: theme.palette.background.paper,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    color: theme.palette.primary.main
                                }
                            }}
                        >
                            <IconCopy />
                        </IconButton>
                        <IconButton
                            title='Delete'
                            onClick={handleDelete}
                            sx={{
                                height: '35px',
                                width: '35px',
                                backgroundColor: theme.palette.background.paper,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    color: 'red'
                                }
                            }}
                        >
                            <IconTrash />
                        </IconButton>
                        <IconButton
                            title='Info'
                            onClick={() => {
                                // TODO: 添加信息对话框功能
                            }}
                            sx={{
                                height: '35px',
                                width: '35px',
                                backgroundColor: theme.palette.background.paper,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    color: theme.palette.secondary.main
                                }
                            }}
                        >
                            <IconInfoCircle />
                        </IconButton>
                    </div>
                }
                placement='right-start'
            >
                <div>
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
                        <Handle
                            type='target'
                            position={Position.Left}
                            id={`${id}-input-input-string|number|json|array|file`}
                            data-handlepos='left'
                            style={{
                                height: 16,
                                width: 16,
                                backgroundColor: theme.palette.text.secondary,
                                position: 'absolute',
                                left: '-8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: '2px solid #fff'
                            }}
                        />
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                        <Handle
                            type='source'
                            position={Position.Right}
                            id={`${id}-output-output-string|number|json|array|file`}
                            data-handlepos='right'
                            style={{
                                height: 16,
                                width: 16,
                                backgroundColor: theme.palette.text.secondary,
                                position: 'absolute',
                                right: '-8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: '2px solid #fff'
                            }}
                        />
                    </div>
                </div>
            </NodeTooltip>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px'
                }}
            >
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#1976d2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '10px',
                        flexShrink: 0
                    }}
                >
                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path
                            d='M12 11.5C12 9.567 10.433 8 8.5 8C6.567 8 5 9.567 5 11.5C5 13.433 6.567 15 8.5 15C10.433 15 12 13.433 12 11.5ZM12 11.5C12 13.433 13.567 15 15.5 15C17.433 15 19 13.433 19 11.5C19 9.567 17.433 8 15.5 8C13.567 8 12 9.567 12 11.5Z'
                            stroke='#ffffff'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
                    </svg>
                </div>
                <div
                    style={{
                        fontSize: '21px',
                        fontWeight: 500,
                        color: '#333'
                    }}
                >
                    循环
                </div>
            </div>
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    backgroundColor: 'transparent',
                    padding: '8px',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}
            >
                <ReactFlowProvider>
                    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <div style={innerBackgroundStyle}>
                            <Background color='#aaa' gap={16} size={1} style={{ position: 'absolute', top: 0, left: 0 }} />
                        </div>
                        <div ref={flowRef} style={{ width: '100%', height: '100%' }}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                nodeTypes={baseTypes}
                                edgeTypes={edgeTypes}
                                fitView={true}
                                nodesDraggable={true}
                                nodesConnectable={true}
                                elementsSelectable={true}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                onConnect={handleConnect}
                                zoomOnScroll={true}
                                panOnScroll={false}
                                panOnDrag={true}
                                preventScrolling={true}
                                style={{ ...innerFlowStyle, zIndex: 0 }}
                                maxZoom={1.5}
                                minZoom={0.3}
                                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                                deleteKeyCode={['Delete', 'Backspace']}
                                data-flow-id={innerFlowId}
                            >
                                <Controls
                                    showZoom={true}
                                    showFitView={true}
                                    showInteractive={false}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: '8px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        bottom: '8px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        boxShadow: 'none',
                                        padding: 0
                                    }}
                                    className='react-flow__controls-interactive'
                                />
                            </ReactFlow>
                        </div>
                    </div>
                </ReactFlowProvider>
            </div>
            <ExpandTextDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onCancel={() => setShowExpandDialog(false)}
                onConfirm={onExpandDialogSave}
                onInputHintDialogClicked={() => {}}
            />
        </div>
    )
}

// 生成循环节点的工具函数
export const createLoopNode = ({
    id = `loop-${Date.now()}`,
    position = { x: 0, y: 0 },
    data = {
        title: '循环节点',
        description: '',
        loopCount: 10,
        children: [],
        type: 'loop' as const
    }
}) => {
    return {
        id,
        type: 'loop',
        position,
        data: {
            ...data,
            inputs: {},
            selected: false
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right
    }
}

// 注册自定义节点类型的函数
export const registerLoopNodes = (nodeTypes: any) => {
    return {
        ...nodeTypes
    }
}

// 使用示例：
/*
import { createLoopNode, registerLoopNodes } from './LoopNode';

// 在你的Canvas组件中：
const Canvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 注册节点类型
  const nodeTypes = registerLoopNodes({
    // 你的其他自定义节点类型...
  });

  // 添加循环节点的函数
  const addLoopNode = useCallback(() => {
    const { loopNode, startNode, edge } = createLoopNode({
      position: { x: 100, y: 100 },
      data: {
        title: '新循环节点',
        loopCount: 5,
        children: [],
        type: 'loop',
      },
    });

    setNodes((nodes) => [...nodes, loopNode, startNode]);
    setEdges((edges) => [...edges, edge]);
  }, [setNodes, setEdges]);

  return (
    <div style={{ height: '100vh' }}>
      <button onClick={addLoopNode}>添加循环节点</button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
      />
    </div>
  );
};
*/
