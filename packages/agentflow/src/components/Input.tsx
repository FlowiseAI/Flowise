import React from 'react'
import { TextField } from '@mui/material'

interface InputProps {
    inputParam: any
    onChange: (value: string) => void
    value: string
    placeholder?: string
    nodes?: any[]
    edges?: any[]
    nodeId?: string
}

export const Input: React.FC<InputProps> = ({ inputParam, onChange, value, placeholder }) => {
    return (
        <TextField
            multiline
            fullWidth
            minRows={3}
            maxRows={10}
            placeholder={placeholder || inputParam.placeholder || 'Enter text...'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            variant='standard'
            InputProps={{
                disableUnderline: true,
                style: {
                    fontSize: '0.875rem',
                    padding: '8px'
                }
            }}
            sx={{
                width: '250px',
                '& .MuiInputBase-root': {
                    fontSize: '0.875rem'
                }
            }}
        />
    )
}
