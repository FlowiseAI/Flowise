import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// material-ui
import {
    TableContainer,
    Table,
    TableHead,
    TableBody,
    Divider,
    Chip,
    Paper,
    Stack,
    ButtonGroup,
    Button,
    Grid,
    ListItem,
    Box,
    IconButton,
    TableRow,
    Skeleton,
    TableCell
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import moment from 'moment'
import PaidIcon from '@mui/icons-material/Paid'
import { IconHierarchy, IconUsersGroup, IconRobot } from '@tabler/icons-react'
import LLMIcon from '@mui/icons-material/ModelTraining'
import AlarmIcon from '@mui/icons-material/AlarmOn'
import TokensIcon from '@mui/icons-material/AutoAwesomeMotion'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MetricsItemCard from '@/views/evaluations/MetricsItemCard'
import { ChartLatency } from '@/views/evaluations/ChartLatency'
import { ChartPassPrnt } from '@/views/evaluations/ChartPassPrnt'
import { ChartTokens } from '@/views/evaluations/ChartTokens'
import EvaluationResultSideDrawer from '@/views/evaluations/EvaluationResultSideDrawer'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import EvaluationResultVersionsSideDrawer from '@/views/evaluations/EvaluationResultVersionsSideDrawer'
import EvalsResultDialog from '@/views/evaluations/EvalsResultDialog'
import { PermissionButton } from '@/ui-component/button/RBACButtons'

// API
import useNotifier from '@/utils/useNotifier'
import useApi from '@/hooks/useApi'
import evaluationApi from '@/api/evaluations'

// Hooks
import useConfirm from '@/hooks/useConfirm'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// icons
import {
    IconPercentage,
    IconVectorBezier2,
    IconMaximize,
    IconClock,
    IconAlertTriangle,
    IconRun,
    IconEye,
    IconEyeOff,
    IconX
} from '@tabler/icons-react'

//const
import { useError } from '@/store/context/ErrorContext'

// ==============================|| EvaluationResults ||============================== //

const EvalEvaluationRows = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    useNotifier()
    const { error } = useError()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [rows, setRows] = useState([])
    const [selectedEvaluationName, setSelectedEvaluationName] = useState('')
    const [evaluation, setEvaluation] = useState({})

    const [showCostMetrics, setShowCostMetrics] = useState(false)
    const [showLatencyMetrics, setShowLatencyMetrics] = useState(false)
    const [showTokenMetrics, setShowTokenMetrics] = useState(false)
    const [showCustomEvals, setShowCustomEvals] = useState(false)
    const [showCharts, setShowCharts] = useState(true)

    const [latencyChartData, setLatencyChartData] = useState([])
    const [tokensChartData, setTokensChartData] = useState([])
    const [passPrntChartData, setPassPcntChartData] = useState([])
    const [avgTokensUsed, setAvgTokensUsed] = useState()

    const [showSideDrawer, setShowSideDrawer] = useState(false)
    const [sideDrawerDialogProps, setSideDrawerDialogProps] = useState({})

    const [showVersionSideDrawer, setShowVersionSideDrawer] = useState(false)
    const [versionDrawerDialogProps, setVersionDrawerDialogProps] = useState({})

    const [outdated, setOutdated] = useState(null)

    const getEvaluation = useApi(evaluationApi.getEvaluation)
    const getIsOutdatedApi = useApi(evaluationApi.getIsOutdated)
    const runAgainApi = useApi(evaluationApi.runAgain)

    const [customEvalsDefined, setCustomEvalsDefined] = useState(false)

    const [showExpandTableDialog, setShowExpandTableDialog] = useState(false)
    const [expandTableProps, setExpandTableProps] = useState({})
    const [isTableLoading, setTableLoading] = useState(false)

    const [additionalConfig, setAdditionalConfig] = useState({})

    const openDetailsDrawer = (item) => {
        setSideDrawerDialogProps({
            type: 'View',
            data: item,
            additionalConfig: additionalConfig,
            evaluationType: evaluation.evaluationType,
            evaluationChatflows: evaluation.chatflowName
        })
        setShowSideDrawer(true)
    }

    const closeDetailsDrawer = () => {
        setShowSideDrawer(false)
    }

    const openVersionsDrawer = () => {
        setVersionDrawerDialogProps({
            id: evaluation?.id
        })
        setShowVersionSideDrawer(true)
    }

    const closeVersionsDrawer = () => {
        setShowVersionSideDrawer(false)
    }

    const handleShowChartsChange = () => {
        setShowCharts(!showCharts)
    }

    const handleShowTokenChange = () => {
        setShowTokenMetrics(!showTokenMetrics)
    }

    const handleLatencyMetricsChange = () => {
        setShowLatencyMetrics(!showLatencyMetrics)
    }

    const handleCustomEvalsChange = () => {
        setShowCustomEvals(!showCustomEvals)
    }
    const handleDisplayCostChange = () => {
        setShowCostMetrics(!showCostMetrics)
    }

    const openTableDialog = () => {
        setExpandTableProps({
            data: {
                evaluation,
                rows,
                customEvalsDefined,
                showCustomEvals,
                showTokenMetrics,
                showLatencyMetrics,
                showCostMetrics,
                additionalConfig
            }
        })
        setShowExpandTableDialog(true)
    }

    const runAgain = async () => {
        const confirmPayload = {
            title: `Run Again`,
            description: `Initiate Rerun for Evaluation ${evaluation.name}?`,
            confirmButtonName: 'Yes',
            cancelButtonName: 'No'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            runAgainApi.request(evaluation?.id)
            enqueueSnackbar({
                message: "Evaluation '" + evaluation.name + "' is running. Redirecting to evaluations page.",
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            navigate(`/evaluations`)
        }
    }

    const URLpath = document.location.pathname.toString().split('/')
    const evalId = URLpath[URLpath.length - 1] === 'evaluation_rows' ? '' : URLpath[URLpath.length - 1]

    const goBack = () => {
        navigate(`/evaluations`)
    }

    const getColSpan = (evaluationsShown, llmEvaluations) => {
        let colSpan = 1
        if (evaluationsShown) colSpan++
        if (llmEvaluations) colSpan++
        return colSpan
    }

    useEffect(() => {
        getEvaluation.request(evalId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setTableLoading(getEvaluation.loading)
    }, [getEvaluation.loading])

    useEffect(() => {
        if (getIsOutdatedApi.data) {
            if (getIsOutdatedApi.data.isOutdated) {
                setOutdated(getIsOutdatedApi.data)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getIsOutdatedApi.data])

    useEffect(() => {
        if (getEvaluation.data) {
            const data = getEvaluation.data
            setSelectedEvaluationName(data.name)
            getIsOutdatedApi.request(data.id)
            if (data.additionalConfig) {
                setAdditionalConfig(JSON.parse(data.additionalConfig))
            }
            data.chatflowId = typeof data.chatflowId === 'object' ? data.chatflowId : JSON.parse(data.chatflowId)
            data.chatflowName = typeof data.chatflowName === 'object' ? data.chatflowName : JSON.parse(data.chatflowName)
            const rows = getEvaluation.data.rows
            const latencyChartData = []
            const tokensChartData = []
            let totalTokens = 0
            for (let i = 0; i < rows.length; i++) {
                rows[i].metrics = typeof rows[i].metrics === 'object' ? rows[i].metrics : JSON.parse(rows[i].metrics)
                rows[i].actualOutput = typeof rows[i].actualOutput === 'object' ? rows[i].actualOutput : JSON.parse(rows[i].actualOutput)
                rows[i].customEvals = typeof rows[i].evaluators === 'object' ? rows[i].evaluators : JSON.parse(rows[i].evaluators || [])
                const latencyObj = {
                    y: i + 1
                }
                const tokensObj = {
                    y: i + 1
                }
                for (let m = 0; m < rows[i].metrics.length; m++) {
                    if (rows[i].metrics[m]?.apiLatency > 0) {
                        latencyObj[data.chatflowName[m]] = parseFloat(rows[i].metrics[m]?.apiLatency, 10)
                    }
                    if (rows[i].metrics[m]?.totalTokens) {
                        totalTokens += rows[i].metrics[m]?.totalTokens
                        tokensObj[data.chatflowName[m] + ' Prompt'] = rows[i].metrics[m]?.promptTokens
                        tokensObj[data.chatflowName[m] + ' Completion'] = rows[i].metrics[m]?.completionTokens
                    }
                }
                latencyChartData.push(latencyObj)
                tokensChartData.push(tokensObj)
                if (rows[i].llmEvaluators) {
                    rows[i].llmEvaluators =
                        typeof rows[i].llmEvaluators === 'object' ? rows[i].llmEvaluators : JSON.parse(rows[i].llmEvaluators || [])
                }
                if (
                    rows[i].errors &&
                    typeof rows[i].errors === 'string' &&
                    rows[i].errors.startsWith('[') &&
                    rows[i].errors.endsWith(']')
                ) {
                    rows[i].errors = JSON.parse(rows[i].errors) || []
                }
            }
            setRows(rows)
            setLatencyChartData(latencyChartData)
            setTokensChartData(tokensChartData)
            const evaluation = data
            evaluation.average_metrics =
                typeof evaluation.average_metrics === 'object' ? evaluation.average_metrics : JSON.parse(evaluation.average_metrics)
            const passPntData = []
            setCustomEvalsDefined(data?.average_metrics?.passPcnt >= 0)
            setShowCustomEvals(data?.average_metrics?.passPcnt >= 0)
            if (data?.average_metrics?.passCount >= 0) {
                passPntData.push({
                    name: 'Pass',
                    value: data.average_metrics.passCount
                })
            }
            if (data?.average_metrics?.failCount >= 0) {
                passPntData.push({
                    name: 'Fail',
                    value: data.average_metrics.failCount
                })
            }
            if (data?.average_metrics?.errorCount >= 0) {
                passPntData.push({
                    name: 'Error',
                    value: data.average_metrics.errorCount
                })
            }
            setPassPcntChartData(passPntData)
            setAvgTokensUsed((totalTokens / rows.length).toFixed(2))
            setEvaluation(evaluation)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getEvaluation.data])

    const getOpenLink = (index) => {
        if (index === undefined) {
            return undefined
        }
        const id = evaluation.chatflowId[index]
        // this is to check if the evaluation is deleted!
        if (outdated?.errors?.length > 0 && outdated.errors.find((e) => e.id === id)) {
            return undefined
        }
        if (additionalConfig.chatflowTypes) {
            switch (additionalConfig.chatflowTypes[index]) {
                case 'Chatflow':
                    return '/canvas/' + evaluation.chatflowId[index]
                case 'Custom Assistant':
                    return '/assistants/custom/' + evaluation.chatflowId[index]
                case 'Agentflow v2':
                    return '/v2/agentcanvas/' + evaluation.chatflowId[index]
            }
        }
        return '/canvas/' + evaluation.chatflowId[index]
    }

    const openFlow = (index) => {
        const url = getOpenLink(index)
        if (url) {
            window.open(getOpenLink(index), '_blank')
        }
    }

    const getFlowIcon = (index) => {
        if (index === undefined) {
            return <IconHierarchy size={17} />
        }
        if (additionalConfig.chatflowTypes) {
            switch (additionalConfig.chatflowTypes[index]) {
                case 'Chatflow':
                    return <IconHierarchy size={17} />
                case 'Custom Assistant':
                    return <IconRobot size={17} />
                case 'Agentflow v2':
                    return <IconUsersGroup size={17} />
            }
        }
        return <IconHierarchy />
    }
    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            isEditButton={false}
                            onBack={goBack}
                            search={false}
                            title={'Evaluation: ' + selectedEvaluationName}
                            description={evaluation?.runDate ? moment(evaluation?.runDate).format('DD-MMM-YYYY, hh:mm:ss A') : ''}
                        >
                            {evaluation?.versionCount > 1 && (
                                <Chip
                                    variant='outlined'
                                    size='small'
                                    label={'Version: ' + evaluation.versionNo + '/' + evaluation.versionCount}
                                />
                            )}
                            {evaluation?.versionCount > 1 && (
                                <Button
                                    sx={{ borderRadius: 2 }}
                                    startIcon={<IconClock />}
                                    variant='outlined'
                                    color='primary'
                                    onClick={openVersionsDrawer}
                                >
                                    Version history
                                </Button>
                            )}
                            <PermissionButton
                                permissionId={'evaluations:run'}
                                sx={{ borderRadius: 2 }}
                                startIcon={<IconRun />}
                                variant='contained'
                                color='primary'
                                disabled={outdated?.errors?.length > 0}
                                onClick={runAgain}
                            >
                                Re-run Evaluation
                            </PermissionButton>
                        </ViewHeader>

                        <Divider />
                        {outdated && (
                            <div
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderRadius: 10,
                                    background: 'rgb(254,252,191)',
                                    padding: 10,
                                    paddingTop: 15,
                                    marginTop: 10,
                                    marginBottom: 10
                                }}
                            >
                                <Box sx={{ p: 2 }}>
                                    <IconAlertTriangle size={25} color='orange' />
                                </Box>
                                <Stack flexDirection='column'>
                                    <span style={{ color: 'rgb(116,66,16)' }}>
                                        {outdated?.errors?.length > 0 && (
                                            <b>This evaluation cannot be re-run, due to the following errors</b>
                                        )}
                                        {outdated?.errors?.length === 0 && (
                                            <b>The following items are outdated, re-run the evaluation for the latest results.</b>
                                        )}
                                    </span>
                                    {outdated.dataset && outdated?.errors?.length === 0 && (
                                        <>
                                            <br />
                                            <b style={{ color: 'rgb(116,66,16)' }}>Dataset:</b>
                                            <Chip
                                                clickable
                                                sx={{
                                                    color: 'rgb(116,66,16)',
                                                    mt: 1,
                                                    width: 'max-content',
                                                    borderRadius: '25px',
                                                    boxShadow: customization.isDarkMode
                                                        ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                                        : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                                                }}
                                                variant='outlined'
                                                label={outdated.dataset.name}
                                                onClick={() => window.open(`/dataset_rows/${outdated.dataset.id}`, '_blank')}
                                            ></Chip>
                                        </>
                                    )}
                                    {outdated.chatflows && outdated?.errors?.length === 0 && outdated.chatflows.length > 0 && (
                                        <>
                                            <br />
                                            <b style={{ color: 'rgb(116,66,16)' }}>Flows:</b>
                                            <Stack sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }} flexDirection='row' gap={1}>
                                                {outdated.chatflows.map((chatflow, index) => (
                                                    <Chip
                                                        key={index}
                                                        clickable
                                                        style={{
                                                            color: 'rgb(116,66,16)',
                                                            mt: 1,
                                                            width: 'max-content',
                                                            borderRadius: '25px',
                                                            boxShadow: customization.isDarkMode
                                                                ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                                                : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                                                        }}
                                                        variant='outlined'
                                                        label={chatflow.chatflowName}
                                                        onClick={() =>
                                                            window.open(
                                                                chatflow.chatflowType === 'Chatflow'
                                                                    ? '/canvas/' + chatflow.chatflowId
                                                                    : chatflow.chatflowType === 'Custom Assistant'
                                                                    ? '/assistants/custom/' + chatflow.chatflowId
                                                                    : '/v2/agentcanvas/' + chatflow.chatflowId,
                                                                '_blank'
                                                            )
                                                        }
                                                    ></Chip>
                                                ))}
                                            </Stack>
                                        </>
                                    )}
                                    {outdated.errors.length > 0 &&
                                        outdated.errors.map((error, index) => <ListItem key={index}>{error.message}</ListItem>)}
                                    <IconButton
                                        style={{ position: 'absolute', top: 10, right: 10 }}
                                        size='small'
                                        color='inherit'
                                        onClick={() => setOutdated(null)}
                                    >
                                        <IconX color={'rgb(116,66,16)'} />
                                    </IconButton>
                                </Stack>
                            </div>
                        )}
                        <ButtonGroup>
                            <Button
                                variant='outlined'
                                value={showCharts}
                                title='Show Charts'
                                onClick={handleShowChartsChange}
                                startIcon={showCharts ? <IconEyeOff /> : <IconEye />}
                            >
                                {'Charts'}
                            </Button>
                            {customEvalsDefined && (
                                <Button
                                    variant='outlined'
                                    value={showCustomEvals}
                                    disabled={!customEvalsDefined}
                                    title='Show Custom Evaluator'
                                    onClick={handleCustomEvalsChange}
                                    startIcon={showCustomEvals ? <IconEyeOff /> : <IconEye />}
                                >
                                    {'Custom Evaluator'}
                                </Button>
                            )}
                            <Button
                                variant='outlined'
                                value={showCostMetrics}
                                title='Show Cost Metrics'
                                onClick={handleDisplayCostChange}
                                startIcon={showCostMetrics ? <IconEyeOff /> : <IconEye />}
                            >
                                {'Cost Metrics'}
                            </Button>
                            <Button
                                variant='outlined'
                                value={showTokenMetrics}
                                title='Show Metrics'
                                onClick={handleShowTokenChange}
                                startIcon={showTokenMetrics ? <IconEyeOff /> : <IconEye />}
                            >
                                {'Token Metrics'}
                            </Button>
                            <Button
                                variant='outlined'
                                value={showCustomEvals}
                                title='Show Latency Metrics'
                                onClick={handleLatencyMetricsChange}
                                startIcon={showLatencyMetrics ? <IconEyeOff /> : <IconEye />}
                            >
                                {'Latency Metrics'}
                            </Button>
                        </ButtonGroup>
                        {showCharts && (
                            <Grid container={true} spacing={2}>
                                {customEvalsDefined && (
                                    <Grid item={true} xs={12} sm={12} md={4} lg={4}>
                                        <MetricsItemCard
                                            data={{
                                                header: 'PASS RATE',
                                                value: (evaluation.average_metrics?.passPcnt ?? '0') + '%',
                                                icon: <IconPercentage />
                                            }}
                                            component={<ChartPassPrnt data={passPrntChartData} sx={{ pt: 2 }} />}
                                        />
                                    </Grid>
                                )}
                                {avgTokensUsed !== undefined && !isNaN(avgTokensUsed) && (
                                    <Grid item={true} xs={12} sm={12} md={4} lg={4}>
                                        <MetricsItemCard
                                            data={{
                                                header: 'TOKENS USED',
                                                value: avgTokensUsed,
                                                icon: <TokensIcon />
                                            }}
                                            component={
                                                <ChartTokens
                                                    data={tokensChartData}
                                                    flowNames={evaluation.chatflowName || []}
                                                    sx={{ pt: 2 }}
                                                />
                                            }
                                        />
                                    </Grid>
                                )}
                                {evaluation.average_metrics?.averageLatency !== undefined && (
                                    <Grid item={true} xs={12} sm={12} md={4} lg={4}>
                                        <MetricsItemCard
                                            data={{
                                                header: 'LATENCY (ms)',
                                                value: (evaluation.average_metrics?.averageLatency ?? '0') + ' ms',
                                                icon: <AlarmIcon />
                                            }}
                                            component={
                                                <ChartLatency
                                                    data={latencyChartData}
                                                    flowNames={evaluation.chatflowName || []}
                                                    sx={{ pt: 2 }}
                                                />
                                            }
                                        />
                                    </Grid>
                                )}
                            </Grid>
                        )}
                        <Stack direction='row' justifyContent={'space-between'}>
                            <Stack flexDirection='row' sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        paddingLeft: '15px',
                                        paddingRight: '15px',
                                        paddingTop: '10px',
                                        paddingBottom: '10px',
                                        fontSize: '0.9rem',
                                        width: 'max-content',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}
                                >
                                    <IconVectorBezier2 style={{ marginRight: 5 }} size={17} />
                                    Flows Used:
                                </div>
                                {(evaluation.chatflowName || []).map((chatflowUsed, index) => (
                                    <Chip
                                        key={index}
                                        icon={getFlowIcon(index)}
                                        clickable
                                        style={{
                                            width: 'max-content',
                                            borderRadius: '25px',
                                            boxShadow: customization.isDarkMode
                                                ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                                : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                                        }}
                                        label={chatflowUsed}
                                        onClick={() => openFlow(index)}
                                    ></Chip>
                                ))}
                            </Stack>
                            <Button
                                variant='outlined'
                                sx={{ width: 'max-content' }}
                                startIcon={<IconMaximize />}
                                onClick={() => openTableDialog()}
                            >
                                Expand
                            </Button>
                        </Stack>
                        <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
                            <Table sx={{ minWidth: 650 }}>
                                <TableHead
                                    sx={{
                                        backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100]
                                    }}
                                >
                                    <TableRow>
                                        <TableCell rowSpan='2'>&nbsp;</TableCell>
                                        <TableCell rowSpan='2'>Input</TableCell>
                                        <TableCell rowSpan='2'>Expected Output</TableCell>
                                        {evaluation.chatflowId?.map((chatflowId, index) => (
                                            <React.Fragment key={index}>
                                                <TableCell
                                                    colSpan={getColSpan(
                                                        customEvalsDefined && showCustomEvals,
                                                        evaluation?.evaluationType === 'llm'
                                                    )}
                                                    style={{ borderLeftStyle: 'dotted', borderLeftColor: 'lightgrey', borderLeftWidth: 1 }}
                                                >
                                                    {evaluation.chatflowName[index]}
                                                    {rows.length > 0 && rows[0].metrics[index].model && (
                                                        <Chip
                                                            variant='outlined'
                                                            icon={<LLMIcon />}
                                                            color={'info'}
                                                            size='small'
                                                            label={
                                                                rows[0].metrics[index].model +
                                                                (rows[0].metrics[index].provider
                                                                    ? ' [' + rows[0].metrics[index].provider + ']'
                                                                    : '')
                                                            }
                                                            sx={{ ml: 2 }}
                                                        />
                                                    )}
                                                </TableCell>
                                            </React.Fragment>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        {evaluation.chatflowId?.map((chatflowId, index) => (
                                            <React.Fragment key={index}>
                                                <TableCell
                                                    style={{ borderLeftStyle: 'dashed', borderLeftColor: 'lightgrey', borderLeftWidth: 1 }}
                                                >
                                                    Actual Output
                                                </TableCell>
                                                {customEvalsDefined && showCustomEvals && <TableCell>Evaluator</TableCell>}
                                                {evaluation?.evaluationType === 'llm' && <TableCell>LLM Evaluation</TableCell>}
                                            </React.Fragment>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isTableLoading ? (
                                        <>
                                            <StyledTableRow>
                                                <StyledTableCell sx={{ width: 2 }}>
                                                    <Skeleton variant='text' />
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Skeleton variant='text' />
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Skeleton variant='text' />
                                                </StyledTableCell>
                                            </StyledTableRow>
                                            <StyledTableRow>
                                                <StyledTableCell sx={{ width: 2 }}>
                                                    <Skeleton variant='text' />
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Skeleton variant='text' />
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Skeleton variant='text' />
                                                </StyledTableCell>
                                            </StyledTableRow>
                                        </>
                                    ) : (
                                        <>
                                            {rows.length > 0 &&
                                                rows.map((item, index) => (
                                                    <TableRow
                                                        onClick={() => openDetailsDrawer(item)}
                                                        hover
                                                        key={index}
                                                        sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                                    >
                                                        <TableCell style={{ width: 2 }}>{index + 1}</TableCell>
                                                        <TableCell style={{ minWidth: '250px' }}>{item.input}</TableCell>
                                                        <TableCell style={{ minWidth: '250px' }}>{item.expectedOutput}</TableCell>
                                                        {evaluation.chatflowId?.map((_, index) => (
                                                            <React.Fragment key={index}>
                                                                <TableCell
                                                                    style={{
                                                                        minWidth: '350px',
                                                                        borderLeftStyle: 'dashed',
                                                                        borderLeftColor: 'lightgrey',
                                                                        borderLeftWidth: 1
                                                                    }}
                                                                >
                                                                    {item.errors[index] === '' ? (
                                                                        <>
                                                                            <div style={{ padding: 2, marginBottom: 5 }}>
                                                                                {item.actualOutput[index]}
                                                                            </div>
                                                                            <Stack
                                                                                flexDirection='row'
                                                                                sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap' }}
                                                                            >
                                                                                <Chip
                                                                                    variant='outlined'
                                                                                    icon={<PaidIcon />}
                                                                                    size='small'
                                                                                    label={
                                                                                        item.metrics[index]?.totalCost
                                                                                            ? 'Total Cost: ' +
                                                                                              item.metrics[index]?.totalCost
                                                                                            : 'Total Cost: N/A'
                                                                                    }
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                />
                                                                                <Chip
                                                                                    variant='outlined'
                                                                                    size='small'
                                                                                    icon={<TokensIcon />}
                                                                                    label={
                                                                                        item.metrics[index]?.totalTokens
                                                                                            ? 'Total Tokens: ' +
                                                                                              item.metrics[index]?.totalTokens
                                                                                            : 'Total Tokens: N/A'
                                                                                    }
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                />
                                                                                {showTokenMetrics && (
                                                                                    <>
                                                                                        <Chip
                                                                                            variant='outlined'
                                                                                            size='small'
                                                                                            icon={<TokensIcon />}
                                                                                            label={
                                                                                                item.metrics[index]?.promptTokens
                                                                                                    ? 'Prompt Tokens: ' +
                                                                                                      item.metrics[index]?.promptTokens
                                                                                                    : 'Prompt Tokens: N/A'
                                                                                            }
                                                                                            sx={{ mr: 1, mb: 1 }}
                                                                                        />{' '}
                                                                                        <Chip
                                                                                            variant='outlined'
                                                                                            size='small'
                                                                                            icon={<TokensIcon />}
                                                                                            label={
                                                                                                item.metrics[index]?.completionTokens
                                                                                                    ? 'Completion Tokens: ' +
                                                                                                      item.metrics[index]?.completionTokens
                                                                                                    : 'Completion Tokens: N/A'
                                                                                            }
                                                                                            sx={{ mr: 1, mb: 1 }}
                                                                                        />{' '}
                                                                                    </>
                                                                                )}
                                                                                {showCostMetrics && (
                                                                                    <>
                                                                                        <Chip
                                                                                            variant='outlined'
                                                                                            size='small'
                                                                                            icon={<PaidIcon />}
                                                                                            label={
                                                                                                item.metrics[index]?.promptCost
                                                                                                    ? 'Prompt Cost: ' +
                                                                                                      item.metrics[index]?.promptCost
                                                                                                    : 'Prompt Cost: N/A'
                                                                                            }
                                                                                            sx={{ mr: 1, mb: 1 }}
                                                                                        />{' '}
                                                                                        <Chip
                                                                                            variant='outlined'
                                                                                            size='small'
                                                                                            icon={<PaidIcon />}
                                                                                            label={
                                                                                                item.metrics[index]?.completionCost
                                                                                                    ? 'Completion Cost: ' +
                                                                                                      item.metrics[index]?.completionCost
                                                                                                    : 'Completion Cost: N/A'
                                                                                            }
                                                                                            sx={{ mr: 1, mb: 1 }}
                                                                                        />{' '}
                                                                                    </>
                                                                                )}
                                                                                <Chip
                                                                                    variant='outlined'
                                                                                    size='small'
                                                                                    icon={<AlarmIcon />}
                                                                                    label={
                                                                                        item.metrics[index]?.apiLatency
                                                                                            ? 'API Latency: ' +
                                                                                              item.metrics[index]?.apiLatency
                                                                                            : 'API Latency: N/A'
                                                                                    }
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                />{' '}
                                                                                {showLatencyMetrics && (
                                                                                    <>
                                                                                        {item.metrics[index]?.chain && (
                                                                                            <Chip
                                                                                                variant='outlined'
                                                                                                size='small'
                                                                                                icon={<AlarmIcon />}
                                                                                                label={
                                                                                                    item.metrics[index]?.chain
                                                                                                        ? 'Chain Latency: ' +
                                                                                                          item.metrics[index]?.chain
                                                                                                        : 'Chain Latency: N/A'
                                                                                                }
                                                                                                sx={{ mr: 1, mb: 1 }}
                                                                                            />
                                                                                        )}{' '}
                                                                                        {item.metrics[index]?.retriever && (
                                                                                            <Chip
                                                                                                variant='outlined'
                                                                                                icon={<AlarmIcon />}
                                                                                                size='small'
                                                                                                sx={{ mr: 1, mb: 1 }}
                                                                                                label={
                                                                                                    'Retriever Latency: ' +
                                                                                                    item.metrics[index]?.retriever
                                                                                                }
                                                                                            />
                                                                                        )}{' '}
                                                                                        {item.metrics[index]?.tool && (
                                                                                            <Chip
                                                                                                variant='outlined'
                                                                                                icon={<AlarmIcon />}
                                                                                                size='small'
                                                                                                sx={{ mr: 1, mb: 1 }}
                                                                                                label={
                                                                                                    'Tool Latency: ' +
                                                                                                    item.metrics[index]?.tool
                                                                                                }
                                                                                            />
                                                                                        )}{' '}
                                                                                        <Chip
                                                                                            variant='outlined'
                                                                                            icon={<AlarmIcon />}
                                                                                            size='small'
                                                                                            label={
                                                                                                item.metrics[index]?.llm
                                                                                                    ? 'LLM Latency: ' +
                                                                                                      item.metrics[index]?.llm
                                                                                                    : 'LLM Latency: N/A'
                                                                                            }
                                                                                            sx={{ mr: 1, mb: 1 }}
                                                                                        />{' '}
                                                                                    </>
                                                                                )}
                                                                            </Stack>
                                                                        </>
                                                                    ) : (
                                                                        <Chip
                                                                            sx={{
                                                                                height: 'auto',
                                                                                backgroundColor: customization.isDarkMode
                                                                                    ? '#4a1c1c'
                                                                                    : '#ffebee',
                                                                                color: customization.isDarkMode ? '#ffdbd3' : '#d32f2f',
                                                                                '& .MuiChip-label': {
                                                                                    display: 'block',
                                                                                    whiteSpace: 'normal'
                                                                                },
                                                                                p: 1,
                                                                                border: 'none'
                                                                            }}
                                                                            variant='outlined'
                                                                            size='small'
                                                                            label={item.errors[index]}
                                                                        />
                                                                    )}
                                                                </TableCell>
                                                                {customEvalsDefined && showCustomEvals && (
                                                                    <TableCell>
                                                                        {(item.customEvals[index] || []).map((evaluator, index) => (
                                                                            <Stack
                                                                                key={index}
                                                                                sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
                                                                                flexDirection='row'
                                                                                gap={1}
                                                                            >
                                                                                <Chip
                                                                                    sx={{
                                                                                        width: 'max-content',
                                                                                        color:
                                                                                            evaluator.result === 'Error'
                                                                                                ? 'black'
                                                                                                : 'white',
                                                                                        backgroundColor:
                                                                                            evaluator.result === 'Pass'
                                                                                                ? '#00c853'
                                                                                                : evaluator.result === 'Fail'
                                                                                                ? '#ff1744'
                                                                                                : '#ffe57f'
                                                                                    }}
                                                                                    variant={'contained'}
                                                                                    size='small'
                                                                                    label={`${evaluator.name}`}
                                                                                ></Chip>
                                                                            </Stack>
                                                                        ))}
                                                                    </TableCell>
                                                                )}
                                                                {evaluation?.evaluationType === 'llm' && (
                                                                    <TableCell sx={{ minWidth: '350px' }}>
                                                                        {item.llmEvaluators[index] && (
                                                                            <Stack
                                                                                flexDirection='row'
                                                                                gap={1}
                                                                                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                                                                            >
                                                                                {Object.entries(item.llmEvaluators[index]).map(
                                                                                    ([key, value], index) => (
                                                                                        <Chip
                                                                                            key={index}
                                                                                            variant='outlined'
                                                                                            size='small'
                                                                                            color={'primary'}
                                                                                            sx={{
                                                                                                height: 'auto',
                                                                                                '& .MuiChip-label': {
                                                                                                    display: 'block',
                                                                                                    whiteSpace: 'normal'
                                                                                                },
                                                                                                p: 0.5
                                                                                            }}
                                                                                            label={
                                                                                                <span>
                                                                                                    <b>{key.toUpperCase()}</b>: {value}
                                                                                                </span>
                                                                                            }
                                                                                        />
                                                                                    )
                                                                                )}
                                                                            </Stack>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {showSideDrawer && (
                            <EvaluationResultSideDrawer
                                show={showSideDrawer}
                                dialogProps={sideDrawerDialogProps}
                                onClickFunction={closeDetailsDrawer}
                            />
                        )}
                        {showVersionSideDrawer && (
                            <EvaluationResultVersionsSideDrawer
                                show={showVersionSideDrawer}
                                dialogProps={versionDrawerDialogProps}
                                onClickFunction={closeVersionsDrawer}
                                onSelectVersion={(versionId) => {
                                    setShowVersionSideDrawer(false)
                                    navigate(`/evaluation_results/${versionId}`)
                                    navigate(0)
                                }}
                            />
                        )}
                    </Stack>
                )}
            </MainCard>
            <ConfirmDialog />
            <EvalsResultDialog
                show={showExpandTableDialog}
                dialogProps={expandTableProps}
                onCancel={() => setShowExpandTableDialog(false)}
                openDetailsDrawer={(item) => {
                    openDetailsDrawer(item)
                }}
            />
        </>
    )
}

export default EvalEvaluationRows
