import PropTypes from 'prop-types'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import { useEffect, useRef, useState, useContext } from 'react'

// material-ui
import { useTheme, styled } from '@mui/material/styles'
import { Box, Typography, Tooltip } from '@mui/material'
import { tooltipClasses } from '@mui/material/Tooltip'
import { flowContext } from '@/store/context/ReactFlowContext'
import { isValidConnection } from '@/utils/genericHelper'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

const CustomWidthTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 500
    }
})

// ===========================|| NodeOutputHandler ||=========================== //

const NodeOutputHandler = ({ outputAnchor, data, disabled = false }) => {
    const theme = useTheme()
    const ref = useRef(null)
    const updateNodeInternals = useUpdateNodeInternals()
    const [position, setPosition] = useState(0)
    const [clientHeight, setClientHeight] = useState(0)
    const [offsetTop, setOffsetTop] = useState(0)
    const [dropdownValue, setDropdownValue] = useState(null)
    const { reactFlowInstance } = useContext(flowContext)

    const getAvailableOptions = (options = []) => {
        return options.filter((option) => !option.hidden && !option.isAnchor)
    }

    const getAnchorOptions = (options = []) => {
        return options.filter((option) => !option.hidden && option.isAnchor)
    }

    const getAnchorPosition = (options, index) => {
        const spacing = clientHeight / (getAnchorOptions(options).length + 1)
        return offsetTop + spacing * (index + 1)
    }

    useEffect(() => {
        if (ref.current && ref.current?.offsetTop && ref.current?.clientHeight) {
            setTimeout(() => {
                setClientHeight(ref.current?.clientHeight)
                setOffsetTop(ref.current?.offsetTop)
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

    useEffect(() => {
        if (dropdownValue) {
            setTimeout(() => {
                updateNodeInternals(data.id)
            }, 0)
        }
    }, [data.id, dropdownValue, updateNodeInternals])

    return (
        <div ref={ref}>
            {outputAnchor.type !== 'options' && !outputAnchor.options && (
                <>
                    <CustomWidthTooltip placement='right' title={outputAnchor.type}>
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
                    </CustomWidthTooltip>
                    <Box sx={{ p: 2, textAlign: 'end' }}>
                        <Typography>{outputAnchor.label}</Typography>
                    </Box>
                </>
            )}
            {data.name !== 'ifElseFunction' &&
                outputAnchor.type === 'options' &&
                outputAnchor.options &&
                getAnchorOptions(outputAnchor.options).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {getAnchorOptions(outputAnchor.options).map((option, index) => {
                            return (
                                <div key={option.id} style={{ display: 'flex', flexDirection: 'row' }}>
                                    <CustomWidthTooltip placement='right' title={option.type}>
                                        <Handle
                                            type='source'
                                            position={Position.Right}
                                            key={index}
                                            id={option?.id}
                                            isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                                            style={{
                                                height: 10,
                                                width: 10,
                                                backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                                top: getAnchorPosition(outputAnchor.options, index)
                                            }}
                                        />
                                    </CustomWidthTooltip>
                                    <div style={{ flex: 1 }}></div>
                                    <Box sx={{ p: 2, textAlign: 'end' }}>
                                        <Typography>{option.label}</Typography>
                                    </Box>
                                </div>
                            )
                        })}
                    </div>
                )}
            {data.name === 'ifElseFunction' && outputAnchor.type === 'options' && outputAnchor.options && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <CustomWidthTooltip
                            placement='right'
                            title={
                                outputAnchor.options.find((opt) => opt.name === data.outputs?.[outputAnchor.name])?.type ??
                                outputAnchor.type
                            }
                        >
                            <Handle
                                type='source'
                                position={Position.Right}
                                key={outputAnchor.options.find((opt) => opt.name === 'returnTrue')?.id ?? ''}
                                id={outputAnchor.options.find((opt) => opt.name === 'returnTrue')?.id ?? ''}
                                isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                                style={{
                                    height: 10,
                                    width: 10,
                                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                    top: position - 25
                                }}
                            />
                        </CustomWidthTooltip>
                        <div style={{ flex: 1 }}></div>
                        <Box sx={{ p: 2, textAlign: 'end' }}>
                            <Typography>True</Typography>
                        </Box>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <CustomWidthTooltip
                            placement='right'
                            title={
                                outputAnchor.options.find((opt) => opt.name === data.outputs?.[outputAnchor.name])?.type ??
                                outputAnchor.type
                            }
                        >
                            <Handle
                                type='source'
                                position={Position.Right}
                                key={outputAnchor.options.find((opt) => opt.name === 'returnFalse')?.id ?? ''}
                                id={outputAnchor.options.find((opt) => opt.name === 'returnFalse')?.id ?? ''}
                                isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                                style={{
                                    height: 10,
                                    width: 10,
                                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                    top: position + 25
                                }}
                            />
                        </CustomWidthTooltip>
                        <div style={{ flex: 1 }}></div>
                        <Box sx={{ p: 2, textAlign: 'end' }}>
                            <Typography>False</Typography>
                        </Box>
                    </div>
                </div>
            )}
            {data.name !== 'ifElseFunction' &&
                outputAnchor.type === 'options' &&
                outputAnchor.options &&
                getAvailableOptions(outputAnchor.options).length > 0 && (
                    <>
                        <CustomWidthTooltip
                            placement='right'
                            title={
                                outputAnchor.options.find((opt) => opt.name === data.outputs?.[outputAnchor.name])?.type ??
                                outputAnchor.type
                            }
                        >
                            <Handle
                                type='source'
                                position={Position.Right}
                                id={outputAnchor.options.find((opt) => opt.name === data.outputs?.[outputAnchor.name])?.id ?? ''}
                                isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                                style={{
                                    height: 10,
                                    width: 10,
                                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                    top: position
                                }}
                            />
                        </CustomWidthTooltip>
                        <Box sx={{ p: 2, textAlign: 'end' }}>
                            <Dropdown
                                disabled={disabled}
                                disableClearable={true}
                                name={outputAnchor.name}
                                options={getAvailableOptions(outputAnchor.options)}
                                onSelect={(newValue) => {
                                    setDropdownValue(newValue)
                                    data.outputs[outputAnchor.name] = newValue
                                }}
                                value={data.outputs[outputAnchor.name] ?? outputAnchor.default ?? 'choose an option'}
                            />
                        </Box>
                    </>
                )}
        </div>
    )
}

NodeOutputHandler.propTypes = {
    outputAnchor: PropTypes.object,
    data: PropTypes.object,
    disabled: PropTypes.bool
}

export default NodeOutputHandler
