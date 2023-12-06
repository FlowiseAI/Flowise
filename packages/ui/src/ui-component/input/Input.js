import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { FormControl, OutlinedInput, Popover } from '@mui/material'
import ExpandTextDialog from 'ui-component/dialog/ExpandTextDialog'
import SelectVariable from 'ui-component/json/SelectVariable'
import { getAvailableNodesForVariable } from 'utils/genericHelper'

export const Input = ({
    inputParam,
    value,
    nodes,
    edges,
    nodeId,
    onChange,
    disabled = false,
    showDialog,
    dialogProps,
    onDialogCancel,
    onDialogConfirm
}) => {
    const [myValue, setMyValue] = useState(value ?? '')
    const [anchorEl, setAnchorEl] = useState(null)
    const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
    const ref = useRef(null)

    const openPopOver = Boolean(anchorEl)

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const setNewVal = (val) => {
        const newVal = myValue + val.substring(2)
        onChange(newVal)
        setMyValue(newVal)
    }

    const getInputType = (type) => {
        switch (type) {
            case 'string':
                return 'text'
            case 'password':
                return 'password'
            case 'number':
                return 'number'
            default:
                return 'text'
        }
    }

    useEffect(() => {
        if (!disabled && nodes && edges && nodeId && inputParam) {
            const nodesForVariable = inputParam?.acceptVariable ? getAvailableNodesForVariable(nodes, edges, nodeId, inputParam.id) : []
            setAvailableNodesForVariable(nodesForVariable)
        }
    }, [disabled, inputParam, nodes, edges, nodeId])

    useEffect(() => {
        if (typeof myValue === 'string' && myValue && myValue.endsWith('{{')) {
            setAnchorEl(ref.current)
        }
    }, [myValue])

    return (
        <>
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                <OutlinedInput
                    id={inputParam.name}
                    size='small'
                    disabled={disabled}
                    type={getInputType(inputParam.type)}
                    placeholder={inputParam.placeholder}
                    multiline={!!inputParam.rows}
                    rows={inputParam.rows ?? 1}
                    value={myValue}
                    name={inputParam.name}
                    onChange={(e) => {
                        setMyValue(e.target.value)
                        onChange(e.target.value)
                    }}
                    inputProps={{
                        step: inputParam.step ?? 1,
                        style: {
                            height: inputParam.rows ? '90px' : 'inherit'
                        }
                    }}
                />
            </FormControl>
            {showDialog && (
                <ExpandTextDialog
                    show={showDialog}
                    dialogProps={dialogProps}
                    onCancel={onDialogCancel}
                    onConfirm={(newValue, inputParamName) => {
                        setMyValue(newValue)
                        onDialogConfirm(newValue, inputParamName)
                    }}
                ></ExpandTextDialog>
            )}
            <div ref={ref}></div>
            {inputParam?.acceptVariable && (
                <Popover
                    open={openPopOver}
                    anchorEl={anchorEl}
                    onClose={handleClosePopOver}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left'
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left'
                    }}
                >
                    <SelectVariable
                        disabled={disabled}
                        availableNodesForVariable={availableNodesForVariable}
                        onSelectAndReturnVal={(val) => {
                            setNewVal(val)
                            handleClosePopOver()
                        }}
                    />
                </Popover>
            )}
        </>
    )
}

Input.propTypes = {
    inputParam: PropTypes.object,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    showDialog: PropTypes.bool,
    dialogProps: PropTypes.object,
    nodes: PropTypes.array,
    edges: PropTypes.array,
    nodeId: PropTypes.string,
    onDialogCancel: PropTypes.func,
    onDialogConfirm: PropTypes.func
}
