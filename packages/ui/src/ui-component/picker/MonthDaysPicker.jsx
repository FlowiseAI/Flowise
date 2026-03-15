import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Box, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1)

export const MonthDaysPicker = ({ value, onChange, disabled = false }) => {
    const theme = useTheme()

    const parseValue = (val) => {
        if (!val) return []
        if (Array.isArray(val)) return val.map(String)
        if (typeof val === 'string')
            return val
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
        return []
    }

    const [selected, setSelected] = useState(parseValue(value))

    useEffect(() => {
        setSelected(parseValue(value))
    }, [value])

    const toggle = (day) => {
        if (disabled) return
        const dayStr = String(day)
        let next
        if (selected.includes(dayStr)) {
            next = selected.filter((d) => d !== dayStr)
        } else {
            next = [...selected, dayStr]
        }
        next.sort((a, b) => Number(a) - Number(b))
        setSelected(next)
        onChange(next.join(','))
    }

    return (
        <Box
            sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5
            }}
        >
            {DAYS_OF_MONTH.map((day) => {
                const dayStr = String(day)
                const isSelected = selected.includes(dayStr)
                return (
                    <Chip
                        key={day}
                        label={day}
                        size='small'
                        disabled={disabled}
                        onClick={() => toggle(day)}
                        sx={{
                            cursor: disabled ? 'default' : 'pointer',
                            minWidth: 32,
                            fontWeight: isSelected ? 600 : 400,
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                            borderColor: isSelected ? theme.palette.primary.main : theme.palette.grey[400],
                            backgroundColor: isSelected ? theme.palette.primary.main + '20' : 'transparent',
                            color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                            '&:hover': disabled
                                ? {}
                                : {
                                      backgroundColor: isSelected ? theme.palette.primary.main + '35' : theme.palette.grey[200]
                                  }
                        }}
                    />
                )
            })}
        </Box>
    )
}

MonthDaysPicker.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
}
