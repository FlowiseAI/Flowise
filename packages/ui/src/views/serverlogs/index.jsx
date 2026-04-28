import { useState, useEffect, forwardRef } from 'react'
import PropTypes from 'prop-types'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import DatePicker from 'react-datepicker'
import { gridSpacing } from '@/store/constant'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { sublime } from '@uiw/codemirror-theme-sublime'

// material-ui
import { Box, Skeleton, Stack, Select, MenuItem, ListItemButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// ui
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

import useApi from '@/hooks/useApi'
import logsApi from '@/api/log'
import { useError } from '@/store/context/ErrorContext'

import LogsEmptySVG from '@/assets/images/logs_empty.svg'
import 'react-datepicker/dist/react-datepicker.css'

const DatePickerCustomInput = forwardRef(function DatePickerCustomInput({ value, onClick }, ref) {
    return (
        <ListItemButton style={{ borderRadius: 15, border: '1px solid #e0e0e0' }} onClick={onClick} ref={ref}>
            {value}
        </ListItemButton>
    )
})

DatePickerCustomInput.propTypes = {
    value: PropTypes.string,
    onClick: PropTypes.func
}

const searchTimeRanges = [
    'Last hour',
    'Last 4 hours',
    'Last 24 hours',
    'Last 2 days',
    'Last 7 days',
    'Last 14 days',
    'Last 1 month',
    'Last 2 months',
    'Last 3 months',
    'Custom'
]

const getDateBefore = (unit, value) => {
    const now = new Date()
    if (unit === 'hours') now.setHours(now.getHours() - value)
    if (unit === 'days') now.setDate(now.getDate() - value)
    if (unit === 'months') now.setMonth(now.getMonth() - value)
    return now
}

const getDateTimeFormatted = (date) => {
    const now = date ? date : new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0') // +1 because getMonth() returns 0 for January, 1 for February, etc.
    const day = now.getDate().toString().padStart(2, '0')
    const hour = now.getHours().toString().padStart(2, '0')

    return `${year}-${month}-${day}-${hour}`
}

const subtractTime = (months, days, hours) => {
    let checkDate = new Date()

    if (months > 0) {
        checkDate.setMonth(checkDate.getMonth() - months)
    } else {
        checkDate.setMonth(checkDate.getMonth())
    }

    if (days > 0) {
        checkDate.setDate(checkDate.getDate() - days)
    } else {
        checkDate.setDate(checkDate.getDate())
    }

    if (hours > 0) {
        checkDate.setHours(checkDate.getHours() - hours)
    } else {
        checkDate.setHours(checkDate.getHours())
    }

    const year = checkDate.getFullYear()
    const month = (checkDate.getMonth() + 1).toString().padStart(2, '0')
    const day = checkDate.getDate().toString().padStart(2, '0')
    const hour = checkDate.getHours().toString().padStart(2, '0')

    return `${year}-${month}-${day}-${hour}`
}

const Logs = () => {
    const colorTheme = useTheme()

    const customStyle = EditorView.baseTheme({
        '&': {
            color: '#191b1f',
            padding: '10px',
            borderRadius: '15px'
        },
        '.cm-placeholder': {
            color: 'rgba(120, 120, 120, 0.5)'
        },
        '.cm-content': {
            fontFamily: 'Roboto, sans-serif',
            fontSize: '0.95rem',
            letterSpacing: '0em',
            fontWeight: 400,
            lineHeight: '1.5em',
            color: colorTheme.darkTextPrimary
        }
    })

    const getLogsApi = useApi(logsApi.getLogs)
    const { error } = useError()

    const [isLoading, setLoading] = useState(true)
    const [logData, setLogData] = useState('')
    const [selectedTimeSearch, setSelectedTimeSearch] = useState('Last hour')
    const [startDate, setStartDate] = useState(getDateBefore('hours', 1))
    const [endDate, setEndDate] = useState(new Date())

    const handleTimeSelectionChange = (event) => {
        setSelectedTimeSearch(event.target.value)
        switch (event.target.value) {
            case 'Last hour':
                getLogsApi.request(subtractTime(0, 0, 1), getDateTimeFormatted())
                break
            case 'Last 4 hours':
                getLogsApi.request(subtractTime(0, 0, 4), getDateTimeFormatted())
                break
            case 'Last 24 hours':
                getLogsApi.request(subtractTime(0, 0, 24), getDateTimeFormatted())
                break
            case 'Last 2 days':
                getLogsApi.request(subtractTime(0, 2, 0), getDateTimeFormatted())
                break
            case 'Last 7 days':
                getLogsApi.request(subtractTime(0, 7, 0), getDateTimeFormatted())
                break
            case 'Last 14 days':
                getLogsApi.request(subtractTime(0, 14, 0), getDateTimeFormatted())
                break
            case 'Last 1 month':
                getLogsApi.request(subtractTime(1, 0, 0), getDateTimeFormatted())
                break
            case 'Last 2 months':
                getLogsApi.request(subtractTime(2, 0, 0), getDateTimeFormatted())
                break
            case 'Last 3 months':
                getLogsApi.request(subtractTime(3, 0, 0), getDateTimeFormatted())
                break
            case 'Custom':
                setStartDate(getDateBefore('hours', 1))
                setEndDate(new Date())
                getLogsApi.request(subtractTime(0, 0, 1), getDateTimeFormatted())
                break
            default:
                break
        }
    }

    const onStartDateSelected = (date) => {
        setStartDate(date)
        getLogsApi.request(getDateTimeFormatted(date), getDateTimeFormatted(endDate))
    }

    const onEndDateSelected = (date) => {
        setEndDate(date)
        getLogsApi.request(getDateTimeFormatted(startDate), getDateTimeFormatted(date))
    }

    useEffect(() => {
        const currentTimeFormatted = getDateTimeFormatted()
        const startTimeFormatted = subtractTime(0, 0, 1)
        getLogsApi.request(startTimeFormatted, currentTimeFormatted)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getLogsApi.loading)
    }, [getLogsApi.loading])

    useEffect(() => {
        if (getLogsApi.data && getLogsApi.data.length > 0) {
            let totalLogs = ''
            for (const logData of getLogsApi.data) {
                totalLogs += logData + '\n'
            }
            setLogData(totalLogs)
        }
    }, [getLogsApi.data])

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 2 }}>
                    <ViewHeader title='Logs' />
                    {isLoading ? (
                        <Box display='flex' flexDirection='column' gap={gridSpacing}>
                            <Skeleton width='25%' height={32} />
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <Stack sx={{ alignItems: 'center', justifyContent: 'flex-start', gap: 2 }} flexDirection='row'>
                                <Select
                                    size='small'
                                    sx={{ minWidth: '200px' }}
                                    value={selectedTimeSearch}
                                    onChange={handleTimeSelectionChange}
                                >
                                    {searchTimeRanges.map((range) => (
                                        <MenuItem key={range} value={range}>
                                            {range}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {selectedTimeSearch === 'Custom' && (
                                    <>
                                        <Stack sx={{ alignItems: 'center', justifyContent: 'flex-start', gap: 2 }} flexDirection='row'>
                                            <b>From</b>
                                            <DatePicker
                                                selected={startDate}
                                                onChange={(date) => onStartDateSelected(date)}
                                                selectsStart
                                                startDate={startDate}
                                                endDate={endDate}
                                                maxDate={endDate}
                                                showTimeSelect
                                                timeFormat='HH:mm'
                                                timeIntervals={60}
                                                dateFormat='yyyy MMMM d, h aa'
                                                customInput={<DatePickerCustomInput />}
                                            />
                                        </Stack>
                                        <Stack sx={{ alignItems: 'center', justifyContent: 'flex-start', gap: 2 }} flexDirection='row'>
                                            <b>To</b>
                                            <DatePicker
                                                selected={endDate}
                                                onChange={(date) => onEndDateSelected(date)}
                                                selectsEnd
                                                showTimeSelect
                                                timeFormat='HH:mm'
                                                timeIntervals={60}
                                                startDate={startDate}
                                                endDate={endDate}
                                                minDate={startDate}
                                                maxDate={new Date()}
                                                dateFormat='yyyy MMMM d, h aa'
                                                customInput={<DatePickerCustomInput />}
                                            />
                                        </Stack>
                                    </>
                                )}
                            </Stack>
                            {logData ? (
                                <CodeMirror
                                    value={logData}
                                    height={'calc(100vh - 220px)'}
                                    theme={sublime}
                                    extensions={[markdown(), EditorView.lineWrapping, customStyle]}
                                    readOnly={true}
                                    basicSetup={{
                                        searchKeymap: true,
                                        lineNumbers: false,
                                        foldGutter: false,
                                        autocompletion: false,
                                        highlightActiveLine: false
                                    }}
                                />
                            ) : (
                                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                    <Box sx={{ p: 2, height: 'auto' }}>
                                        <img
                                            style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                            src={LogsEmptySVG}
                                            alt='LogsEmptySVG'
                                        />
                                    </Box>
                                    <div>No Logs Yet</div>
                                </Stack>
                            )}
                        </>
                    )}
                </Stack>
            )}
        </MainCard>
    )
}

export default Logs
