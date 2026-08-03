import { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { FormControl, OutlinedInput, InputAdornment, IconButton, CircularProgress, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { REDACTED_CREDENTIAL_VALUE } from '@/store/constant'

const MASKED_CHARS = '\u2022\u2022\u2022\u2022\u2022\u2022'
const MULTILINE_DOTS = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'

export const SensitiveInput = ({ inputParam, value, onChange, disabled = false, onReveal }) => {
    const theme = useTheme()
    const [myValue, setMyValue] = useState(value ?? '')
    const [isVisible, setIsVisible] = useState(false)
    const [isRevealing, setIsRevealing] = useState(false)
    const maskedUrlRef = useRef(typeof value === 'string' && value.includes(MASKED_CHARS) ? value : null)

    const isUrl = inputParam?.type === 'url'
    const isMultilinePassword = !!inputParam?.rows && inputParam?.type === 'password'
    const isMaskedUrl = isUrl && typeof myValue === 'string' && myValue.includes(MASKED_CHARS)
    const isRedactedMultiline = isMultilinePassword && myValue === REDACTED_CREDENTIAL_VALUE

    const handleToggle = async () => {
        if (!isVisible && onReveal && (myValue === REDACTED_CREDENTIAL_VALUE || isMaskedUrl)) {
            setIsRevealing(true)
            const revealed = await onReveal()
            setIsRevealing(false)
            if (revealed !== undefined) {
                setMyValue(revealed)
                onChange(revealed)
            }
        } else if (isVisible && maskedUrlRef.current) {
            setMyValue(maskedUrlRef.current)
        }
        setIsVisible((prev) => !prev)
    }

    const inputSx = {
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.grey[900] + 25
        }
    }

    // URL in ADD mode: plain text input, no masking needed
    if (isUrl && !onReveal) {
        return (
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                <OutlinedInput
                    id={inputParam.name}
                    size='small'
                    disabled={disabled}
                    type='text'
                    placeholder={inputParam.placeholder}
                    value={myValue}
                    name={inputParam.name}
                    onChange={(e) => {
                        setMyValue(e.target.value)
                        onChange(e.target.value)
                    }}
                    sx={inputSx}
                />
            </FormControl>
        )
    }

    return (
        <>
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                <OutlinedInput
                    id={inputParam.name}
                    size='small'
                    disabled={disabled}
                    type={isUrl ? (isVisible || isMaskedUrl ? 'text' : 'password') : 'password'}
                    placeholder={inputParam.placeholder}
                    multiline={isMultilinePassword}
                    rows={isMultilinePassword ? inputParam.rows ?? 1 : undefined}
                    value={isRedactedMultiline ? MULTILINE_DOTS : myValue}
                    name={inputParam.name}
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
                    }}
                    inputProps={{
                        readOnly: isUrl && isMaskedUrl && !isVisible
                    }}
                    endAdornment={
                        isUrl && onReveal ? (
                            <InputAdornment position='end'>
                                <IconButton
                                    edge='end'
                                    onClick={handleToggle}
                                    onMouseDown={(e) => e.preventDefault()}
                                    aria-label={isVisible ? 'Hide' : 'Show'}
                                    disabled={isRevealing}
                                >
                                    {isRevealing ? (
                                        <CircularProgress size={16} />
                                    ) : isVisible ? (
                                        <IconEyeOff size={18} />
                                    ) : (
                                        <IconEye size={18} />
                                    )}
                                </IconButton>
                            </InputAdornment>
                        ) : undefined
                    }
                    sx={inputSx}
                />
            </FormControl>
            {isUrl && onReveal && (
                <Typography variant='caption' sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                    Click the eye icon to reveal the value before editing.
                </Typography>
            )}
        </>
    )
}

SensitiveInput.propTypes = {
    inputParam: PropTypes.object,
    value: PropTypes.string,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    onReveal: PropTypes.func
}
