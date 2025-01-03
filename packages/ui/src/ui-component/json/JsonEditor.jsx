import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { FormControl, Popover } from '@mui/material'
import ReactJson from 'flowise-react-json-view'
import JsonKeySelector from './JsonKeySelector'

const JsonEditorInput = (props) => {
    const { value, onChange, inputParam, isDarkMode = false, disabled = false, jsonFileContent } = props

    const [anchorEl, setAnchorEl] = useState(null)
    const [mouseUpKey, setMouseUpKey] = useState('')
    const [localValue, setLocalValue] = useState(value || '')
    const [key, setKey] = useState(0)
    const [localJsonFileContent, setLocalJsonFileContent] = useState(jsonFileContent)
    const openPopOver = Boolean(anchorEl)

    // Debug value changes
    useEffect(() => {
        console.log('jsonFileContent changed:', jsonFileContent)
        if (jsonFileContent) {
            setLocalJsonFileContent(jsonFileContent)
        }
    }, [jsonFileContent])

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const handleJsonChange = (edit) => {
        try {
            const newValue = JSON.stringify(edit.updated_src)
            console.log('handleJsonChange called with:', newValue)
            setLocalValue(newValue)
            onChange(newValue)
        } catch (error) {
            console.error('Error updating JSON:', error)
        }
    }

    const handleVariableSelection = (selectedValue) => {
        try {
            console.log('1. Selected value:', selectedValue)
            console.log('2. Current value:', value)

            const newValue = JSON.stringify(
                {
                    [mouseUpKey]: selectedValue
                },
                null,
                2
            )

            console.log('3. Updated editor with:', newValue)
            setLocalValue(newValue)
            onChange(newValue)
            handleClosePopOver()
        } catch (error) {
            console.error('Error in handleVariableSelection:', error)
        }
    }

    // Update local state when prop changes
    useEffect(() => {
        console.log('Value prop changed:', value)
        setLocalValue(value || '')
        setKey((prev) => prev + 1) // Force ReactJson to re-render with new key
    }, [value])

    return (
        <div style={{ width: '100%', marginTop: '8px' }}>
            <ReactJson
                theme={isDarkMode ? 'ocean' : 'rjv-default'}
                style={{ padding: 10, borderRadius: 10 }}
                src={value ? JSON.parse(value) : {}}
                name={null}
                collapsed={false}
                displayDataTypes={false}
                enableClipboard={false}
                onEdit={handleJsonChange}
                onDelete={handleJsonChange}
                onAdd={handleJsonChange}
                onSelect={(select) => {
                    console.log('onSelect called with:', select)
                    if (inputParam?.acceptVariable && select.name) {
                        setMouseUpKey(select.name)
                        const element = document.activeElement
                        setAnchorEl(element)
                    }
                }}
                displayObjectSize={false}
                onMouseUp={() => { }}
            />
            {inputParam?.acceptVariable && localJsonFileContent && (
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
                    slotProps={{
                        paper: {
                            elevation: 8,
                            sx: {
                                overflow: 'visible',
                                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))'
                            }
                        }
                    }}
                    keepMounted
                    disableEnforceFocus
                    disableAutoFocus
                    disableRestoreFocus
                >
                    {console.log('Popover open:', openPopOver, 'anchorEl:', anchorEl)}
                    <JsonKeySelector
                        jsonContent={localJsonFileContent}
                        onSelectKey={handleVariableSelection}
                        disabled={disabled}
                    />
                </Popover>
            )}
        </div>
    )
}

JsonEditorInput.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    inputParam: PropTypes.object,
    isDarkMode: PropTypes.bool,
    disabled: PropTypes.bool,
    jsonFileContent: PropTypes.string
}

export default JsonEditorInput
