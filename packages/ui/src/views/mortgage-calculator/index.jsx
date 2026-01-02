import { useState, useEffect } from 'react'
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    TextField,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    InputAdornment,
    Slider,
    Stack,
    Chip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MainCard from '@/ui-component/cards/MainCard'
import { IconCalculator, IconChartLine, IconHome, IconCoin, IconCalendar } from '@tabler/icons-react'

const MortgageCalculator = () => {
    const theme = useTheme()

    // Input states
    const [loanAmount, setLoanAmount] = useState(300000)
    const [interestRate, setInterestRate] = useState(6.5)
    const [loanTerm, setLoanTerm] = useState(30)
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

    // Results states
    const [monthlyPayment, setMonthlyPayment] = useState(0)
    const [totalPayment, setTotalPayment] = useState(0)
    const [totalInterest, setTotalInterest] = useState(0)
    const [amortizationSchedule, setAmortizationSchedule] = useState([])
    const [yearlySchedule, setYearlySchedule] = useState([])

    // Calculate mortgage
    const calculateMortgage = () => {
        const principal = parseFloat(loanAmount)
        const annualRate = parseFloat(interestRate) / 100
        const monthlyRate = annualRate / 12
        const numberOfPayments = parseFloat(loanTerm) * 12

        if (principal <= 0 || annualRate <= 0 || numberOfPayments <= 0) {
            return
        }

        // Calculate monthly payment using the formula: M = P[r(1+r)^n]/[(1+r)^n-1]
        const monthly = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                       (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

        setMonthlyPayment(monthly)
        setTotalPayment(monthly * numberOfPayments)
        setTotalInterest(monthly * numberOfPayments - principal)

        // Generate amortization schedule
        let balance = principal
        const schedule = []
        const yearlyData = []
        let yearlyPrincipal = 0
        let yearlyInterest = 0
        let yearNumber = 1

        const start = new Date(startDate)

        for (let i = 1; i <= numberOfPayments; i++) {
            const interestPayment = balance * monthlyRate
            const principalPayment = monthly - interestPayment
            balance -= principalPayment

            const paymentDate = new Date(start)
            paymentDate.setMonth(paymentDate.getMonth() + i)

            schedule.push({
                payment: i,
                date: paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                principalPayment: principalPayment,
                interestPayment: interestPayment,
                totalPayment: monthly,
                remainingBalance: Math.max(0, balance)
            })

            yearlyPrincipal += principalPayment
            yearlyInterest += interestPayment

            // Store yearly summary
            if (i % 12 === 0 || i === numberOfPayments) {
                yearlyData.push({
                    year: yearNumber,
                    principalPaid: yearlyPrincipal,
                    interestPaid: yearlyInterest,
                    totalPaid: yearlyPrincipal + yearlyInterest,
                    remainingBalance: Math.max(0, balance)
                })
                yearNumber++
                yearlyPrincipal = 0
                yearlyInterest = 0
            }
        }

        setAmortizationSchedule(schedule)
        setYearlySchedule(yearlyData)
    }

    useEffect(() => {
        calculateMortgage()
    }, [loanAmount, interestRate, loanTerm, startDate])

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value)
    }

    const formatPercent = (value) => {
        return value.toFixed(2) + '%'
    }

    return (
        <MainCard title="Mortgage Calculator" contentSX={{ p: 3 }}>
            <Container maxWidth="xl">
                {/* Header Section */}
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <IconHome size={40} stroke={1.5} color={theme.palette.primary.main} />
                        <Typography variant="h2" sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 700
                        }}>
                            Mortgage Calculator
                        </Typography>
                    </Stack>
                    <Typography variant="body1" color="text.secondary">
                        Calculate your monthly mortgage payments and view detailed amortization schedule
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* Input Section */}
                    <Grid item xs={12} md={4}>
                        <Card elevation={0} sx={{
                            border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : theme.palette.grey[200]}`,
                            borderRadius: 2
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconCalculator size={24} />
                                    Loan Details
                                </Typography>

                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Loan Amount
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            value={loanAmount}
                                            onChange={(e) => setLoanAmount(e.target.value)}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            }}
                                            variant="outlined"
                                        />
                                        <Slider
                                            value={loanAmount}
                                            onChange={(e, newValue) => setLoanAmount(newValue)}
                                            min={50000}
                                            max={2000000}
                                            step={10000}
                                            sx={{ mt: 2 }}
                                        />
                                    </Box>

                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Annual Interest Rate
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            value={interestRate}
                                            onChange={(e) => setInterestRate(e.target.value)}
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            }}
                                            variant="outlined"
                                            inputProps={{ step: 0.1 }}
                                        />
                                        <Slider
                                            value={interestRate}
                                            onChange={(e, newValue) => setInterestRate(newValue)}
                                            min={1}
                                            max={15}
                                            step={0.1}
                                            sx={{ mt: 2 }}
                                        />
                                    </Box>

                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Loan Term (Years)
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            value={loanTerm}
                                            onChange={(e) => setLoanTerm(e.target.value)}
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end">years</InputAdornment>,
                                            }}
                                            variant="outlined"
                                        />
                                        <Slider
                                            value={loanTerm}
                                            onChange={(e, newValue) => setLoanTerm(newValue)}
                                            min={5}
                                            max={40}
                                            step={5}
                                            marks={[
                                                { value: 10, label: '10' },
                                                { value: 15, label: '15' },
                                                { value: 20, label: '20' },
                                                { value: 30, label: '30' }
                                            ]}
                                            sx={{ mt: 2 }}
                                        />
                                    </Box>

                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Start Date
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            variant="outlined"
                                        />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Results Section */}
                    <Grid item xs={12} md={8}>
                        <Stack spacing={3}>
                            {/* Summary Cards */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                        color: 'white',
                                        height: '100%'
                                    }}>
                                        <CardContent>
                                            <Stack spacing={1}>
                                                <IconCoin size={32} />
                                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                    Monthly Payment
                                                </Typography>
                                                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(monthlyPayment)}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{
                                        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                                        color: 'white',
                                        height: '100%'
                                    }}>
                                        <CardContent>
                                            <Stack spacing={1}>
                                                <IconHome size={32} />
                                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                    Total Payment
                                                </Typography>
                                                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(totalPayment)}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{
                                        background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                                        color: 'white',
                                        height: '100%'
                                    }}>
                                        <CardContent>
                                            <Stack spacing={1}>
                                                <IconChartLine size={32} />
                                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                    Total Interest
                                                </Typography>
                                                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(totalInterest)}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{
                                        background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                                        color: 'white',
                                        height: '100%'
                                    }}>
                                        <CardContent>
                                            <Stack spacing={1}>
                                                <IconCalendar size={32} />
                                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                    Interest Rate
                                                </Typography>
                                                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                                    {formatPercent(interestRate)}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* Yearly Summary Table */}
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : theme.palette.grey[200]}`,
                                borderRadius: 2
                            }}>
                                <CardContent>
                                    <Typography variant="h4" sx={{ mb: 2 }}>
                                        Yearly Summary
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>Year</strong></TableCell>
                                                    <TableCell align="right"><strong>Principal Paid</strong></TableCell>
                                                    <TableCell align="right"><strong>Interest Paid</strong></TableCell>
                                                    <TableCell align="right"><strong>Total Paid</strong></TableCell>
                                                    <TableCell align="right"><strong>Remaining Balance</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {yearlySchedule.slice(0, 10).map((row) => (
                                                    <TableRow key={row.year} hover>
                                                        <TableCell>
                                                            <Chip label={`Year ${row.year}`} size="small" color="primary" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell align="right">{formatCurrency(row.principalPaid)}</TableCell>
                                                        <TableCell align="right">{formatCurrency(row.interestPaid)}</TableCell>
                                                        <TableCell align="right"><strong>{formatCurrency(row.totalPaid)}</strong></TableCell>
                                                        <TableCell align="right">{formatCurrency(row.remainingBalance)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    {yearlySchedule.length > 10 && (
                                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Showing first 10 years of {yearlySchedule.length} total years
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Monthly Amortization Schedule */}
                            <Card elevation={0} sx={{
                                border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : theme.palette.grey[200]}`,
                                borderRadius: 2
                            }}>
                                <CardContent>
                                    <Typography variant="h4" sx={{ mb: 2 }}>
                                        Monthly Payment Schedule
                                    </Typography>
                                    <TableContainer sx={{ maxHeight: 400 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>#</strong></TableCell>
                                                    <TableCell><strong>Date</strong></TableCell>
                                                    <TableCell align="right"><strong>Principal</strong></TableCell>
                                                    <TableCell align="right"><strong>Interest</strong></TableCell>
                                                    <TableCell align="right"><strong>Total Payment</strong></TableCell>
                                                    <TableCell align="right"><strong>Balance</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {amortizationSchedule.map((row) => (
                                                    <TableRow key={row.payment} hover>
                                                        <TableCell>{row.payment}</TableCell>
                                                        <TableCell>{row.date}</TableCell>
                                                        <TableCell align="right">{formatCurrency(row.principalPayment)}</TableCell>
                                                        <TableCell align="right">{formatCurrency(row.interestPayment)}</TableCell>
                                                        <TableCell align="right"><strong>{formatCurrency(row.totalPayment)}</strong></TableCell>
                                                        <TableCell align="right">{formatCurrency(row.remainingBalance)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>
        </MainCard>
    )
}

export default MortgageCalculator
