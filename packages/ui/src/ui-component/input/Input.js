import { useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl, OutlinedInput } from '@mui/material'
import EditPromptValuesDialog from 'ui-component/dialog/EditPromptValuesDialog'

export const Input = ({ inputParam, value, onChange, disabled = false, showDialog, dialogProps, onDialogCancel, onDialogConfirm }) => {
    const [myValue, setMyValue] = useState(value ?? '')

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
                        style: {
                            height: inputParam.rows ? '90px' : 'inherit'
                        }
                    }}
                />
            </FormControl>
            {showDialog && (
                <EditPromptValuesDialog
                    show={showDialog}
                    dialogProps={dialogProps}
                    onCancel={onDialogCancel}
                    onConfirm={(newValue, inputParamName) => {
                        setMyValue(newValue)
                        onDialogConfirm(newValue, inputParamName)
                    }}
                ></EditPromptValuesDialog>
            )}
        </>
    )
}

Input.propTypes = {
    inputParam: PropTypes.object,
    value: PropTypes.string,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    showDialog: PropTypes.bool,
    dialogProps: PropTypes.object,
    onDialogCancel: PropTypes.func,
    onDialogConfirm: PropTypes.func
}
