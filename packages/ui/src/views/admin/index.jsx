'use client'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Box,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    useTheme,
    Tabs,
    Tab,
    Typography
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import plansApi from '@/api/plans'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import EmptySvg from '@/assets/images/workflow_empty.svg'

// const
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div role='tabpanel' hidden={value !== index} id={`admin-tabpanel-${index}`} aria-labelledby={`admin-tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

const Admin = () => {
    const theme = useTheme()
    useNotifier()

    const rawAmountFormatter = Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0
    })

    const formatCurrency = (amount, currency) => {
        const formatter = Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        })
        return formatter.format(amount)
    }

    const formatAmount = (amount) => {
        return rawAmountFormatter.format(amount)
    }

    const [currentPlan, setCurrentPlan] = useState(null)
    const [planHistory, setPlanHistory] = useState([])

    const customization = useSelector((state) => state.customization)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [tabValue, setTabValue] = useState(0)

    const getCurrentPlan = useApi(plansApi.getCurrentPlan)
    const getHistoricPlans = useApi(plansApi.getHistoricPlans)

    useEffect(() => {
        getCurrentPlan.request()
        getHistoricPlans.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getCurrentPlan.loading || getHistoricPlans.loading)
    }, [getCurrentPlan.loading, getHistoricPlans.loading])

    useEffect(() => {
        if (getCurrentPlan.error) {
            setError(getCurrentPlan.error)
        }
        if (getHistoricPlans.error) {
            setError(getHistoricPlans.error)
        }
    }, [getCurrentPlan.error, getHistoricPlans.error])

    useEffect(() => {
        if (getCurrentPlan.data && Array.isArray(getCurrentPlan.data)) {
            setCurrentPlan(getCurrentPlan.data)
        }
    }, [getCurrentPlan.data])

    useEffect(() => {
        if (getHistoricPlans.data && Array.isArray(getHistoricPlans.data)) {
            setPlanHistory(getHistoricPlans.data)
        }
    }, [getHistoricPlans.data])

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : isLoading ? (
                    <Skeleton variant='text' />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader search={false} title='Admin'></ViewHeader>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label='admin tabs'>
                                <Tab label='Current Plan' />
                                <Tab label='Plan History' />
                            </Tabs>
                        </Box>
                        <TabPanel value={tabValue} index={0}>
                            {!currentPlan ? (
                                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                    <Box sx={{ p: 2, height: 'auto' }}>
                                        <img
                                            style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                            src={EmptySvg}
                                            alt='No Executions Yet'
                                        />
                                    </Box>
                                    <div>No valid plan</div>
                                </Stack>
                            ) : (
                                <Stack spacing={2}>
                                    {currentPlan.type === 'Paid' ? (
                                        <>
                                            <Typography variant='h6'>Paid Plan</Typography>
                                            <Typography variant='h6'>
                                                Amount Paid: {formatCurrency(currentPlan.amount, currentPlan.currency)}
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <Typography variant='h6'>Free Trial</Typography>
                                        </>
                                    )}

                                    <Typography variant='h6'>Total Executions: {formatAmount(currentPlan.availableExecutions)}</Typography>
                                    <Typography variant='h6'>Used Executions: {formatAmount(currentPlan.usedExecutions)}</Typography>
                                    <Typography variant='h6'>
                                        Remaining Executions: {formatAmount(currentPlan.availableExecutions - currentPlan.usedExecutions)}
                                    </Typography>
                                </Stack>
                            )}
                        </TabPanel>
                        <TabPanel value={tabValue} index={1}>
                            <TableContainer
                                sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                component={Paper}
                            >
                                <Table sx={{ minWidth: 650 }} aria-label='plan history'>
                                    <TableHead
                                        sx={{
                                            backgroundColor: customization.isDarkMode
                                                ? theme.palette.common.black
                                                : theme.palette.grey[100],
                                            height: 56
                                        }}
                                    >
                                        <TableRow>
                                            <StyledTableCell>Plan created date</StyledTableCell>
                                            <StyledTableCell>Available Executions</StyledTableCell>
                                            <StyledTableCell>Used Executions</StyledTableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {planHistory.map((plan, index) => (
                                            <StyledTableRow key={index}>
                                                <StyledTableCell>{new Date(plan.createdDate).toLocaleDateString()}</StyledTableCell>
                                                <StyledTableCell>{formatAmount(plan.availableExecutions)}</StyledTableCell>
                                                <StyledTableCell>{formatAmount(plan.usedExecutions)}</StyledTableCell>
                                            </StyledTableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </TabPanel>
                    </Stack>
                )}
            </MainCard>

            <ConfirmDialog />
        </>
    )
}

export default Admin
