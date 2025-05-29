import { useContext } from 'react'
import PropTypes from 'prop-types'
import { Box } from '@mui/material'
import { Handle, Position } from 'reactflow'
import { useTheme } from '@mui/material/styles'
import { flowContext } from '@/store/context/ReactFlowContext'

const LoopFunction = ({ data, onChange }) => {
    const theme = useTheme()
    const { reactFlowInstance } = useContext(flowContext)

    const isValidConnection = (connection) => {
        const source = reactFlowInstance?.getNode(connection.source)
        if (!source) return false
        const sourceHandle = connection.sourceHandle
        const targetHandle = connection.targetHandle
        return sourceHandle === 'output' && targetHandle === 'input'
    }

    return (
        <Box sx={{ position: 'relative' }}>
            <Handle
                type='target'
                position={Position.Left}
                id='input'
                style={{
                    height: 10,
                    width: 10,
                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                    left: -5
                }}
                isValidConnection={isValidConnection}
            />
            <Handle
                type='source'
                position={Position.Right}
                id='output'
                style={{
                    height: 10,
                    width: 10,
                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                    right: -5
                }}
            />
        </Box>
    )
}

LoopFunction.propTypes = {
    data: PropTypes.shape({
        selected: PropTypes.bool
    }),
    onChange: PropTypes.func
}

export default LoopFunction
