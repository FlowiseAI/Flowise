import { FormControl, Switch, Typography } from '@mui/material'

export interface SwitchInputProps {
    label?: string
    value: boolean | string | undefined
    onChange: (checked: boolean) => void
    disabled?: boolean
}

/**
 * A reusable switch input with optional label.
 * Mirrors the original Flowise SwitchInput component.
 */
export function SwitchInput({ label, value, onChange, disabled = false }: SwitchInputProps) {
    const checked = value !== undefined ? !!value : false

    return (
        <FormControl
            sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            size='small'
        >
            {label && <Typography>{label}</Typography>}
            <Switch
                disabled={disabled}
                checked={checked}
                onChange={(event) => {
                    onChange(event.target.checked)
                }}
            />
        </FormControl>
    )
}
