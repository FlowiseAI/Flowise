import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Box, Chip, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const LAST_DAY_TOKEN = 'L'
const DAYS_OF_MONTH = [...Array.from({ length: 31 }, (_, i) => String(i + 1)), LAST_DAY_TOKEN]

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

    // Sort numeric days ascending, keep "L" (last day) at the end.
    const sortDays = (arr) =>
        [...arr].sort((a, b) => {
            if (a === LAST_DAY_TOKEN) return 1
            if (b === LAST_DAY_TOKEN) return -1
            return Number(a) - Number(b)
        })

    const [selected, setSelected] = useState(sortDays(parseValue(value)))

    useEffect(() => {
        setSelected(sortDays(parseValue(value)))
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
        next = sortDays(next)
        setSelected(next)
        onChange(next.join(','))
    }

    const renderChip = (valueToken, label) => {
        const isSelected = selected.includes(valueToken)
        const isLastDay = valueToken === LAST_DAY_TOKEN
        const chip = (
            <Chip
                key={valueToken}
                label={label}
                size='small'
                disabled={disabled}
                onClick={() => toggle(valueToken)}
                sx={{
                    cursor: disabled ? 'default' : 'pointer',
                    minWidth: 32,
                    gridColumn: isLastDay ? 'span 2' : 'span 1',
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
        if (isLastDay) {
            return (
                <Tooltip
                    key={valueToken}
                    title='Always runs on the last day of every month — automatically resolves to 28, 29, 30, or 31 (handles short months and leap years). Unlike picking 31, this fires every month.'
                    placement='top'
                    arrow
                >
                    <span style={{ gridColumn: 'span 2', display: 'inline-flex' }}>{chip}</span>
                </Tooltip>
            )
        }
        return chip
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
            {DAYS_OF_MONTH.map((day) => renderChip(day, day === LAST_DAY_TOKEN ? 'Last Day' : day))}
        </Box>
    )
}

MonthDaysPicker.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
}
