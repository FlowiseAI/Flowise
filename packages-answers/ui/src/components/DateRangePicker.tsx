import React from 'react'
import { Box, Typography, Button } from '@mui/material'
// @ts-ignore
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { format } from 'date-fns'

interface DateRangePickerProps {
    startDate: Date
    endDate: Date
    onStartDateChange: (date: Date) => void
    onEndDateChange: (date: Date) => void
    startDateLabel?: string
    endDateLabel?: string
    sx?: any
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    startDateLabel = 'From Date',
    endDateLabel = 'To Date',
    sx = {}
}) => {
    return (
        <Box sx={{ display: 'flex', gap: 2, ...sx }}>
            <Box>
                <Typography variant='body2' sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                    {startDateLabel}
                </Typography>
                <DatePicker
                    selected={startDate}
                    onChange={onStartDateChange}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    customInput={
                        <Button
                            variant='outlined'
                            sx={{
                                minWidth: 120,
                                color: 'rgba(255, 255, 255, 0.8)',
                                borderColor: 'rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            {format(startDate, 'MMM dd, yyyy')}
                        </Button>
                    }
                />
            </Box>
            <Box>
                <Typography variant='body2' sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                    {endDateLabel}
                </Typography>
                <DatePicker
                    selected={endDate}
                    onChange={onEndDateChange}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    maxDate={new Date()}
                    customInput={
                        <Button
                            variant='outlined'
                            sx={{
                                minWidth: 120,
                                color: 'rgba(255, 255, 255, 0.8)',
                                borderColor: 'rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            {format(endDate, 'MMM dd, yyyy')}
                        </Button>
                    }
                />
            </Box>
        </Box>
    )
}

export default DateRangePicker
