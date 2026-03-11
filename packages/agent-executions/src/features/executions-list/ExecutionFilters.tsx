import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
    Box,
    Stack,
    TextField,
    MenuItem,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    IconButton,
    Tooltip,
    useTheme
} from '@mui/material'
import { IconTrash } from '@tabler/icons-react'
import { useConfigContext } from '../../infrastructure/store/ConfigContext'
import type { ExecutionFilters as ExecutionFiltersType } from '../../types'

interface ExecutionFiltersProps {
    filters: ExecutionFiltersType
    onFilterChange: (field: string, value: unknown) => void
    onDateChange: (field: string, date: Date) => void
    onApply: () => void
    onReset: () => void
    onDelete: () => void
    selectedCount: number
}

export const ExecutionFilters = ({
    filters,
    onFilterChange,
    onDateChange,
    onApply,
    onReset,
    onDelete,
    selectedCount
}: ExecutionFiltersProps) => {
    const theme = useTheme()
    const config = useConfigContext()
    const borderColor = theme.palette.grey[900] + 25
    const hasDeletePermission = config.permissions?.includes('executions:delete')

    return (
        <Box sx={{ mb: 2, width: '100%' }}>
            <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={2}>
                    <FormControl fullWidth size='small'>
                        <InputLabel id='state-select-label'>State</InputLabel>
                        <Select
                            labelId='state-select-label'
                            value={filters.state}
                            label='State'
                            onChange={(e) => onFilterChange('state', e.target.value)}
                            size='small'
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': { borderColor },
                                '& .MuiSvgIcon-root': { color: config.isDarkMode ? '#fff' : 'inherit' }
                            }}
                        >
                            <MenuItem value=''>All</MenuItem>
                            <MenuItem value='INPROGRESS'>In Progress</MenuItem>
                            <MenuItem value='FINISHED'>Finished</MenuItem>
                            <MenuItem value='ERROR'>Error</MenuItem>
                            <MenuItem value='TERMINATED'>Terminated</MenuItem>
                            <MenuItem value='TIMEOUT'>Timeout</MenuItem>
                            <MenuItem value='STOPPED'>Stopped</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                    <DatePicker
                        selected={filters.startDate}
                        onChange={(date: Date) => onDateChange('startDate', date)}
                        selectsStart
                        startDate={filters.startDate}
                        className='form-control'
                        wrapperClassName='datePicker'
                        maxDate={new Date()}
                        customInput={
                            <TextField
                                size='small'
                                label='Start date'
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor } }}
                            />
                        }
                    />
                </Grid>
                <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                    <DatePicker
                        selected={filters.endDate}
                        onChange={(date: Date) => onDateChange('endDate', date)}
                        selectsEnd
                        endDate={filters.endDate}
                        className='form-control'
                        wrapperClassName='datePicker'
                        minDate={filters.startDate}
                        maxDate={new Date()}
                        customInput={
                            <TextField
                                size='small'
                                label='End date'
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor } }}
                            />
                        }
                    />
                </Grid>
                <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                    <TextField
                        fullWidth
                        label='Agentflow'
                        value={filters.agentflowName}
                        onChange={(e) => onFilterChange('agentflowName', e.target.value)}
                        size='small'
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor } }}
                    />
                </Grid>
                <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                    <TextField
                        fullWidth
                        label='Session ID'
                        value={filters.sessionId}
                        onChange={(e) => onFilterChange('sessionId', e.target.value)}
                        size='small'
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor } }}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Stack direction='row' spacing={1}>
                        <Button variant='contained' color='primary' onClick={onApply} size='small'>
                            Apply
                        </Button>
                        <Button variant='outlined' onClick={onReset} size='small'>
                            Reset
                        </Button>
                        {hasDeletePermission && (
                            <Tooltip title='Delete selected executions'>
                                <span>
                                    <IconButton
                                        sx={{ height: 30, width: 30 }}
                                        size='small'
                                        color='error'
                                        onClick={onDelete}
                                        edge='end'
                                        disabled={selectedCount === 0}
                                    >
                                        <IconTrash />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    )
}
