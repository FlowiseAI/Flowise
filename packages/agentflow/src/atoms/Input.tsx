import { ChangeEvent, useState } from 'react'

import { IconButton, InputAdornment, SxProps, TextField, Theme } from '@mui/material'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

import type { InputParam } from '@/core/types'

export interface InputProps {
    inputParam?: InputParam
    value?: string
    placeholder?: string
    disabled?: boolean
    onChange?: (value: string) => void
    sx?: SxProps<Theme>
}

// TODO: Review if still necessary — NodeInputHandler and MUI TextField are used directly elsewhere
/**
 * Basic input component for text, password, and number inputs
 */
export function Input({ inputParam, value = '', placeholder, disabled = false, onChange, sx }: InputProps) {
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value
        onChange?.(newValue)
    }

    const getInputType = () => {
        if (inputParam?.type === 'password') {
            return showPassword ? 'text' : 'password'
        }
        if (inputParam?.type === 'number') {
            return 'number'
        }
        return 'text'
    }

    const isMultiline = Boolean(inputParam?.rows && inputParam.rows > 1)

    return (
        <TextField
            fullWidth
            size='small'
            disabled={disabled}
            type={getInputType()}
            multiline={isMultiline}
            rows={isMultiline ? inputParam?.rows : undefined}
            placeholder={placeholder || inputParam?.placeholder}
            value={value}
            onChange={handleChange}
            sx={{
                mt: 1,
                ...sx
            }}
            InputProps={{
                endAdornment: inputParam?.type === 'password' && (
                    <InputAdornment position='end'>
                        <IconButton
                            aria-label='toggle password visibility'
                            onClick={() => setShowPassword(!showPassword)}
                            edge='end'
                            size='small'
                        >
                            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </IconButton>
                    </InputAdornment>
                )
            }}
        />
    )
}

export default Input
