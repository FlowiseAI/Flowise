import { createContext, useState } from 'react'
import PropTypes from 'prop-types'

const initialValue = {
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    deleteNode: () => {}
}

export const flowContext = createContext(initialValue)

export const ReactFlowContext = ({ children }) => {
    const [reactFlowInstance, setReactFlowInstance] = useState(null)

    const deleteNode = (id) => {
        reactFlowInstance.setNodes(reactFlowInstance.getNodes().filter((n) => n.id !== id))
        reactFlowInstance.setEdges(reactFlowInstance.getEdges().filter((ns) => ns.source !== id && ns.target !== id))
    }

    return (
        <flowContext.Provider
            value={{
                reactFlowInstance,
                setReactFlowInstance,
                deleteNode
            }}
        >
            {children}
        </flowContext.Provider>
    )
}

ReactFlowContext.propTypes = {
    children: PropTypes.any
}
