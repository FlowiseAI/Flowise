import PropTypes from 'prop-types'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import { useEffect, useRef, useState, useContext } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, Typography, Tooltip } from '@mui/material'
import { flowContext } from 'store/context/ReactFlowContext'
import { isValidConnection } from 'utils/genericHelper'

// ===========================|| NodeOutputHandler ||=========================== //

const NodeOutputHandler = ({ outputAnchor, data }) => {
    const theme = useTheme()
    const ref = useRef(null)
    const updateNodeInternals = useUpdateNodeInternals()
    const [position, setPosition] = useState(0)
    const { reactFlowInstance } = useContext(flowContext)

    useEffect(() => {
        if (ref.current && ref.current?.offsetTop && ref.current?.clientHeight) {
            setTimeout(() => {
                setPosition(ref.current?.offsetTop + ref.current?.clientHeight / 2)
                updateNodeInternals(data.id)
            }, 0)
        }
    }, [data.id, ref, updateNodeInternals])

    useEffect(() => {
        setTimeout(() => {
            updateNodeInternals(data.id)
        }, 0)
    }, [data.id, position, updateNodeInternals])

    return (
        <div ref={ref}>
            <Tooltip
                placement='right'
                title={
                    <Typography sx={{ color: 'white', p: 1 }} variant='h5'>
                        {'Type: ' + outputAnchor.type}
                    </Typography>
                }
            >
                <Handle
                    type='source'
                    position={Position.Right}
                    key={outputAnchor.id}
                    id={outputAnchor.id}
                    isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                    style={{
                        height: 10,
                        width: 10,
                        backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                        top: position
                    }}
                />
            </Tooltip>
            <Box sx={{ p: 2, textAlign: 'end' }}>
                <Typography>{outputAnchor.label}</Typography>
            </Box>
        </div>
    )
}

NodeOutputHandler.propTypes = {
    outputAnchor: PropTypes.object,
    data: PropTypes.object
}

export default NodeOutputHandler
