import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { FormControl, OutlinedInput, InputBase, Popover, InputAdornment, IconButton, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import SelectVariable from '@/ui-component/json/SelectVariable'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'
import { REDACTED_CREDENTIAL_VALUE } from '@/store/constant'

export const Input = ({ inputParam, value, nodes, edges, nodeId, onChange, onBlur, disabled = false, onReveal }) => {
    const theme = useTheme()
    const [myValue, setMyValue] = useState(value ?? '')
    const [anchorEl, setAnchorEl] = useState(null)
    const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isRevealing, setIsRevealing] = useState(false)
    const ref = useRef(null)
    const inputElementRef = useRef(null)
    const selectionRangeRef = useRef({ start: null, end: null })
    const maskedUrlRef = useRef(typeof value === 'string' && value.includes('\u2022\u2022\u2022\u2022\u2022\u2022') ? value : null)

    const openPopOver = Boolean(anchorEl)
    const hasPasswordToggle = (inputParam?.type === 'password' || inputParam?.type === 'url') && !!inputParam?.enablePasswordToggle
    const isMaskedUrl = typeof myValue === 'string' && myValue.includes('\u2022\u2022\u2022\u2022\u2022\u2022')
    const isMultilinePassword = !!inputParam?.rows && inputParam?.type === 'password'
    const isRedactedMultiline = isMultilinePassword && myValue === REDACTED_CREDENTIAL_VALUE
    const MULTILINE_PASSWORD_DOTS = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'

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
            case 'url':
                return 'password'
            case 'number':
                return 'number'
            case 'email':
                return 'email'
            default:
                return 'text'
        }
    }

    const handleTogglePasswordVisibility = async () => {
        const inputElement = inputElementRef.current
        if (inputElement) {
            selectionRangeRef.current = {
                start: inputElement.selectionStart,
                end: inputElement.selectionEnd
            }
        }
        if (!isPasswordVisible && onReveal && (myValue === REDACTED_CREDENTIAL_VALUE || isMaskedUrl)) {
            setIsRevealing(true)
            const revealedValue = await onReveal()
            setIsRevealing(false)
            if (revealedValue !== undefined) {
                setMyValue(revealedValue)
                onChange(revealedValue)
            }
        } else if (isPasswordVisible && maskedUrlRef.current) {
            setMyValue(maskedUrlRef.current)
        }
        setIsPasswordVisible((prev) => !prev)
    }

    useEffect(() => {
        if (!hasPasswordToggle) return
        const { start, end } = selectionRangeRef.current
        if (start === null || end === null || !inputElementRef.current) return
        requestAnimationFrame(() => {
            inputElementRef.current?.focus()
            inputElementRef.current?.setSelectionRange(start, end)
        })
    }, [hasPasswordToggle, isPasswordVisible])

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
            {inputParam.name === 'note' ? (
                <FormControl sx={{ width: '100%', height: 'auto' }} size='small'>
                    <InputBase
                        id={nodeId}
                        size='small'
                        disabled={disabled}
                        type={getInputType(inputParam.type)}
                        placeholder={inputParam.placeholder}
                        multiline={!!inputParam.rows}
                        minRows={inputParam.rows ?? 1}
                        value={myValue}
                        name={inputParam.name}
                        onChange={(e) => {
                            setMyValue(e.target.value)
                            onChange(e.target.value)
                        }}
                        onBlur={(e) => {
                            if (onBlur) onBlur(e.target.value)
                        }}
                        inputProps={{
                            step: inputParam.step ?? 1,
                            style: {
                                border: 'none',
                                background: 'none',
                                color: 'inherit'
                            }
                        }}
                        sx={{
                            border: 'none',
                            background: 'none',
                            padding: '10px 14px',
                            textarea: {
                                '&::placeholder': {
                                    color: '#616161'
                                }
                            }
                        }}
                    />
                </FormControl>
            ) : (
                <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                    <OutlinedInput
                        id={inputParam.name}
                        size='small'
                        disabled={disabled}
                        type={hasPasswordToggle ? (isPasswordVisible || isMaskedUrl ? 'text' : 'password') : getInputType(inputParam.type)}
                        placeholder={inputParam.placeholder}
                        multiline={!!inputParam.rows}
                        rows={inputParam.rows ?? 1}
                        value={isRedactedMultiline ? MULTILINE_PASSWORD_DOTS : myValue}
                        name={inputParam.name}
                        inputRef={inputElementRef}
                        onChange={(e) => {
                            setMyValue(e.target.value)
                            onChange(e.target.value)
                        }}
                        onFocus={() => {
                            if (isRedactedMultiline) {
                                setMyValue('')
                                onChange('')
                            }
                        }}
                        onBlur={(e) => {
                            if (isMultilinePassword && e.target.value === '') {
                                setMyValue(REDACTED_CREDENTIAL_VALUE)
                                onChange(REDACTED_CREDENTIAL_VALUE)
                            }
                            if (onBlur) onBlur(e.target.value)
                        }}
                        inputProps={{
                            step: inputParam.step ?? 1,
                            readOnly: hasPasswordToggle && isMaskedUrl && !isPasswordVisible,
                            style: {
                                height: inputParam.rows ? '90px' : 'inherit'
                            }
                        }}
                        endAdornment={
                            hasPasswordToggle ? (
                                <InputAdornment position='end'>
                                    <IconButton
                                        edge='end'
                                        onClick={handleTogglePasswordVisibility}
                                        onMouseDown={(e) => e.preventDefault()}
                                        aria-label={isPasswordVisible ? 'Hide' : 'Show'}
                                        disabled={isRevealing}
                                    >
                                        {isRevealing ? (
                                            <CircularProgress size={16} />
                                        ) : isPasswordVisible ? (
                                            <IconEyeOff size={18} />
                                        ) : (
                                            <IconEye size={18} />
                                        )}
                                    </IconButton>
                                </InputAdornment>
                            ) : undefined
                        }
                        sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.grey[900] + 25
                            }
                        }}
                    />
                </FormControl>
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
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    nodes: PropTypes.array,
    edges: PropTypes.array,
    nodeId: PropTypes.string,
    onReveal: PropTypes.func
}
