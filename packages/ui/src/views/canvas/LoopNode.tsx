import React, { useCallback, useState } from 'react'
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
    ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'
import { InnerNode } from './InnerNode'

// 自定义样式
const customStyles = `
  .react-flow__controls-interactive button {
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .react-flow__controls-interactive button:hover {
    background-color: #f5f5f5;
    border-color: #bdbdbd;
  }

  .react-flow__controls-interactive button svg {
    width: 16px;
    height: 16px;
    fill: #666;
  }
`

// 定义循环节点的类型
export interface LoopNodeData {
    title?: string
    description?: string
    loopCount: number
    startNodeId?: string
    children: any[]
    type: 'loop'
    selected?: boolean
    inputs?: Record<string, any>
    width?: string
    height?: string
}

// 循环节点的样式
const loopNodeStyles = {
    background: '#fff',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    width: '900px',
    height: '500px',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
}

// 循环起始节点的样式
const startNodeStyles = {
    background: '#fff',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    minWidth: '120px',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    cursor: 'pointer'
}

// 默认节点
const defaultNodes: Node[] = [
    {
        id: 'start',
        type: 'innerNode',
        position: { x: 100, y: 100 },
        data: { label: '开始' }
    }
]

// 定义内部节点类型
const innerNodeTypes = {
    innerNode: InnerNode
}

// 循环节点组件
export const LoopNode: React.FC<NodeProps<LoopNodeData>> = ({ data, id, selected }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [nodes, setNodes] = useNodesState<Node[]>(defaultNodes)
    const [edges, setEdges] = useEdgesState<Edge[]>([])

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

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds))
        },
        [setNodes]
    )

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            setEdges((eds) => applyEdgeChanges(changes, eds))
        },
        [setEdges]
    )

    const [nodeStyle, setNodeStyle] = useState({
        ...loopNodeStyles,
        border: '1px solid #e5e5e5',
        width: data.width || '900px',
        height: data.height || '500px'
    })

    const onResize = useCallback(
        (event: any, params: { width: number; height: number }) => {
            const { width, height } = params
            setNodeStyle((prev) => ({
                ...prev,
                width: `${width}px`,
                height: `${height}px`
            }))
            if (data) {
                data.width = `${width}px`
                data.height = `${height}px`
            }
        },
        [data]
    )

    return (
        <div style={nodeStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <style>{customStyles}</style>
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
            />
            <Handle type='target' position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} id={`${id}-target`} />
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
                        borderRadius: '4px',
                        backgroundColor: '#1976d2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '10px',
                        flexShrink: 0
                    }}
                >
                    <div style={{ fontSize: '18px', color: '#fff' }}>🔄</div>
                </div>
                <div
                    style={{
                        fontSize: '14px',
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
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}
            >
                <ReactFlowProvider>
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <div style={innerBackgroundStyle}>
                            <Background color='#aaa' gap={16} size={1} style={{ position: 'absolute', top: 0, left: 0 }} />
                        </div>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={innerNodeTypes}
                            fitView
                            nodesDraggable={true}
                            nodesConnectable={true}
                            elementsSelectable={true}
                            zoomOnScroll={false}
                            panOnScroll={false}
                            preventScrolling={true}
                            style={innerFlowStyle}
                            maxZoom={1.5}
                            minZoom={0.5}
                            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                            zIndex={0}
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
                </ReactFlowProvider>
            </div>
            <Handle type='source' position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} id={`${id}-source`} />
        </div>
    )
}

// 循环起始节点组件
export const LoopStartNode: React.FC<{
    id: string
    selected?: boolean
}> = ({ id, selected }) => {
    return (
        <div
            style={{
                ...startNodeStyles,
                border: selected ? '2px solid #1976d2' : '1px solid #e5e5e5'
            }}
        >
            <Handle type='target' position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} id={`${id}-target`} />
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            ></div>
            <Handle type='source' position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} id={`${id}-source`} />
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
        ...nodeTypes,
        loop: LoopNode
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
