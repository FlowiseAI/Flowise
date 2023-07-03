import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl, Popover } from '@mui/material'
import ReactJson from 'flowise-react-json-view'
import SelectVariable from './SelectVariable'
import { cloneDeep } from 'lodash'
import { getAvailableNodesForVariable } from 'utils/genericHelper'

export const JsonEditorInput = ({ value, onChange, inputParam, nodes, edges, nodeId, disabled = false, isDarkMode = false }) => {
    const [myValue, setMyValue] = useState(value ? JSON.parse(value) : {})
    const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
    const [mouseUpKey, setMouseUpKey] = useState('')

    const [anchorEl, setAnchorEl] = useState(null)
    const openPopOver = Boolean(anchorEl)

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const setNewVal = (val) => {
        const newVal = cloneDeep(myValue)
        newVal[mouseUpKey] = val
        onChange(JSON.stringify(newVal))
        setMyValue((params) => ({
            ...params,
            [mouseUpKey]: val
        }))
    }

    const onClipboardCopy = (e) => {
        const src = e.src
        if (Array.isArray(src) || typeof src === 'object') {
            navigator.clipboard.writeText(JSON.stringify(src, null, '  '))
        } else {
            navigator.clipboard.writeText(src)
        }
    }

    useEffect(() => {
        if (!disabled && nodes && edges && nodeId && inputParam) {
            const nodesForVariable = inputParam?.acceptVariable ? getAvailableNodesForVariable(nodes, edges, nodeId, inputParam.id) : []
            setAvailableNodesForVariable(nodesForVariable)
        }
    }, [disabled, inputParam, nodes, edges, nodeId])

    return (
        <>
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                {disabled && (
                    <ReactJson
                        theme={isDarkMode ? 'ocean' : 'rjv-default'}
                        style={{ padding: 10, borderRadius: 10 }}
                        src={myValue}
                        name={null}
                        enableClipboard={(e) => onClipboardCopy(e)}
                        quotesOnKeys={false}
                        displayDataTypes={false}
                    />
                )}
                {!disabled && (
                    <div key={JSON.stringify(myValue)}>
                        <ReactJson
                            theme={isDarkMode ? 'ocean' : 'rjv-default'}
                            style={{ padding: 10, borderRadius: 10 }}
                            src={myValue}
                            name={null}
                            quotesOnKeys={false}
                            displayDataTypes={false}
                            enableClipboard={(e) => onClipboardCopy(e)}
                            onMouseUp={(event) => {
                                if (inputParam?.acceptVariable) {
                                    setMouseUpKey(event.name)
                                    setAnchorEl(event.currentTarget)
                                }
                            }}
                            onEdit={(edit) => {
                                setMyValue(edit.updated_src)
                                onChange(JSON.stringify(edit.updated_src))
                            }}
                            onAdd={() => {
                                //console.log(add)
                            }}
                            onDelete={(deleteobj) => {
                                setMyValue(deleteobj.updated_src)
                                onChange(JSON.stringify(deleteobj.updated_src))
                            }}
                        />
                    </div>
                )}
            </FormControl>
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

JsonEditorInput.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    isDarkMode: PropTypes.bool,
    inputParam: PropTypes.object,
    nodes: PropTypes.array,
    edges: PropTypes.array,
    nodeId: PropTypes.string
}
