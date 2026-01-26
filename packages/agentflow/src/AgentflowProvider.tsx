import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { store, SET_COMPONENT_NODES } from './store'
import { createAgentflowTheme } from './theme'
import { FlowData } from './types'

// Flow context for ReactFlow instance (compatible with flowise-ui components)
interface FlowContextValue {
    reactFlowInstance: any
    setReactFlowInstance: (instance: any) => void
    deleteNode: (nodeId: string) => void
    duplicateNode: (nodeId: string) => void
    deleteEdge: (edgeId: string) => void
}

export const flowContext = createContext<FlowContextValue>({
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    deleteNode: () => {},
    duplicateNode: () => {},
    deleteEdge: () => {}
})

// Agentflow context
interface AgentflowContextValue {
    flow: FlowData | null
    setFlow: (flow: FlowData) => void
    availableComponents: any[]
    setAvailableComponents: (components: any[]) => void
    reactFlowInstance: any
    setReactFlowInstance: (instance: any) => void
}

const AgentflowContext = createContext<AgentflowContextValue | undefined>(undefined)

export const useAgentflowContext = () => {
    const context = useContext(AgentflowContext)
    if (!context) {
        throw new Error('useAgentflowContext must be used within AgentflowProvider')
    }
    return context
}

interface AgentflowProviderProps {
    children: ReactNode
    initialFlow?: FlowData | null
    isDarkMode?: boolean
}

export const AgentflowProvider: React.FC<AgentflowProviderProps> = ({ children, initialFlow = null, isDarkMode = false }) => {
    const [flow, setFlow] = useState<FlowData | null>(initialFlow)
    const [availableComponents, setAvailableComponents] = useState<any[]>([])
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

    // Update component nodes in Redux store when they change
    const handleSetAvailableComponents = useCallback((components: any[]) => {
        setAvailableComponents(components)
        store.dispatch(SET_COMPONENT_NODES(components))
    }, [])

    // Flow context functions
    const deleteNode = useCallback(
        (nodeId: string) => {
            if (reactFlowInstance) {
                const nodes = reactFlowInstance.getNodes().filter((node: any) => node.id !== nodeId)
                reactFlowInstance.setNodes(nodes)
            }
        },
        [reactFlowInstance]
    )

    const duplicateNode = useCallback(
        (nodeId: string) => {
            if (reactFlowInstance) {
                const node = reactFlowInstance.getNode(nodeId)
                if (node) {
                    const newNode = {
                        ...node,
                        id: `${node.id}_copy_${Date.now()}`,
                        position: {
                            x: node.position.x + 50,
                            y: node.position.y + 50
                        },
                        data: {
                            ...node.data,
                            id: `${node.data.id}_copy_${Date.now()}`
                        }
                    }
                    reactFlowInstance.addNodes(newNode)
                }
            }
        },
        [reactFlowInstance]
    )

    const deleteEdge = useCallback(
        (edgeId: string) => {
            if (reactFlowInstance) {
                const edges = reactFlowInstance.getEdges().filter((edge: any) => edge.id !== edgeId)
                reactFlowInstance.setEdges(edges)
            }
        },
        [reactFlowInstance]
    )

    const flowContextValue = useMemo(
        () => ({
            reactFlowInstance,
            setReactFlowInstance,
            deleteNode,
            duplicateNode,
            deleteEdge
        }),
        [reactFlowInstance, deleteNode, duplicateNode, deleteEdge]
    )

    const agentflowContextValue = useMemo(
        () => ({
            flow,
            setFlow,
            availableComponents,
            setAvailableComponents: handleSetAvailableComponents,
            reactFlowInstance,
            setReactFlowInstance
        }),
        [flow, availableComponents, handleSetAvailableComponents, reactFlowInstance]
    )

    const theme = useMemo(() => createAgentflowTheme(isDarkMode), [isDarkMode])

    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <flowContext.Provider value={flowContextValue}>
                    <AgentflowContext.Provider value={agentflowContextValue}>{children}</AgentflowContext.Provider>
                </flowContext.Provider>
            </ThemeProvider>
        </Provider>
    )
}
