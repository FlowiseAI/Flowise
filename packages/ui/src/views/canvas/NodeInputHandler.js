import PropTypes from 'prop-types'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import { useEffect, useRef, useState, useContext } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, Typography, Tooltip } from '@mui/material'

import { Dropdown } from 'ui-component/dropdown/Dropdown'
import { Input } from 'ui-component/input/Input'
import { flowContext } from 'store/context/ReactFlowContext'
import { isValidConnection } from 'utils/genericHelper'

// ===========================|| NodeInputHandler ||=========================== //

const NodeInputHandler = ({ inputAnchor, inputParam, data }) => {
    const theme = useTheme()
    const ref = useRef(null)
    const updateNodeInternals = useUpdateNodeInternals()
    const [position, setPosition] = useState(0)
    const { reactFlowInstance } = useContext(flowContext)

    useEffect(() => {
        if (ref.current && ref.current.offsetTop && ref.current.clientHeight) {
            setPosition(ref.current.offsetTop + ref.current.clientHeight / 2)
            updateNodeInternals(data.id)
        }
    }, [data.id, ref, updateNodeInternals])

    useEffect(() => {
        updateNodeInternals(data.id)
    }, [data.id, position, updateNodeInternals])

    return (
        <div ref={ref}>
            {inputAnchor && (
                <>
                    <Tooltip
                        placement='left'
                        title={
                            <Typography sx={{ color: 'white', p: 1 }} variant='h5'>
                                {'Type: ' + inputAnchor.type}
                            </Typography>
                        }
                    >
                        <Handle
                            type='target'
                            position={Position.Left}
                            key={inputAnchor.id}
                            id={inputAnchor.id}
                            isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                            style={{
                                height: 10,
                                width: 10,
                                backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                top: position
                            }}
                        />
                    </Tooltip>
                    <Box sx={{ p: 2 }}>
                        <Typography>
                            {inputAnchor.label}
                            {!inputAnchor.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                        </Typography>
                    </Box>
                </>
            )}

            {inputParam && (
                <>
                    <Box sx={{ p: 2 }}>
                        <Typography>
                            {inputParam.label}
                            {!inputParam.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                        </Typography>
                        {(inputParam.type === 'string' || inputParam.type === 'password' || inputParam.type === 'number') && (
                            <Input
                                inputParam={inputParam}
                                onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                            />
                        )}
                        {inputParam.type === 'options' && (
                            <Dropdown
                                name={inputParam.name}
                                options={inputParam.options}
                                onSelect={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? 'chose an option'}
                            />
                        )}
                    </Box>
                </>
            )}
        </div>
    )
}

NodeInputHandler.propTypes = {
    inputAnchor: PropTypes.object,
    inputParam: PropTypes.object,
    data: PropTypes.object
}

export default NodeInputHandler
