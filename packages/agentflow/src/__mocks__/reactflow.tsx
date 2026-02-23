/**
 * Mock for ReactFlow library
 *
 * Provides mock implementations of ReactFlow components and hooks for testing.
 * Prevents canvas/layout issues and provides stable references to avoid infinite loops.
 */

import React from 'react'

const MockReactFlow = ({ children }: { children: React.ReactNode }) => <div data-testid='react-flow'>{children}</div>

// Mock components with forwardRef for MUI styled() compatibility
const NodeToolbar = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid='node-toolbar' {...props}>
        {children}
    </div>
))
NodeToolbar.displayName = 'NodeToolbar'

const Handle = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid='handle' {...props}>
        {children}
    </div>
))
Handle.displayName = 'Handle'

export default MockReactFlow

export const ReactFlowProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>

export const Controls = ({ className }: { className?: string }) => <div data-testid='controls' className={className} />

export const MiniMap = () => <div data-testid='minimap' />

export const Background = () => <div data-testid='background' />

export { Handle, NodeToolbar }

export const Position = { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' }

// Use React's useState to maintain stable references and prevent infinite loops
export const useNodesState = (initialNodes: any) => {
    const [nodes, setNodes] = React.useState(initialNodes || [])
    return [nodes, setNodes, jest.fn()]
}

export const useEdgesState = (initialEdges: any) => {
    const [edges, setEdges] = React.useState(initialEdges || [])
    return [edges, setEdges, jest.fn()]
}

export const useReactFlow = () => ({
    screenToFlowPosition: jest.fn((pos) => pos),
    project: jest.fn((pos) => pos),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    getNodes: jest.fn(() => []),
    getEdges: jest.fn(() => []),
    getNode: jest.fn(),
    getEdge: jest.fn()
})

// Hook to update node internals (used for dynamic handle positioning)
export const useUpdateNodeInternals = () => jest.fn()

// Hook to access ReactFlow store state
export const useStore = (selector?: any) => (selector ? selector({}) : {})

// Edge utilities
export const addEdge = (connection: any, edges: any[]) => [...edges, connection]

export const getBezierPath = jest.fn(({ sourceX, sourceY, targetX, targetY }: any) => [
    `M ${sourceX},${sourceY} L ${targetX},${targetY}`,
    (sourceX + targetX) / 2,
    (sourceY + targetY) / 2
])

export const EdgeLabelRenderer = ({ children }: { children: React.ReactNode }) => <div data-testid='edge-label-renderer'>{children}</div>

export const NodeResizer = () => <div data-testid='node-resizer' />
