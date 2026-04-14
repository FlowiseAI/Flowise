import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// Material
import {
    Stack,
    Chip,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Dialog,
    DialogContent,
    DialogTitle,
    Paper,
    Button,
    TableCell
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconVectorBezier2, IconMinimize } from '@tabler/icons-react'
import LLMIcon from '@mui/icons-material/ModelTraining'
import AlarmIcon from '@mui/icons-material/AlarmOn'
import TokensIcon from '@mui/icons-material/AutoAwesomeMotion'
import PaidIcon from '@mui/icons-material/Paid'

// Project imports
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'

// i18n
import { useTranslation } from 'react-i18next'

// const

const EvalsResultDialog = ({ show, dialogProps, onCancel, openDetailsDrawer }) => {
    const { t } = useTranslation()
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()

    const getColSpan = (evaluationsShown, llmEvaluations) => {
        let colSpan = 1
        if (evaluationsShown) colSpan++
        if (llmEvaluations) colSpan++
        return colSpan
    }

    const getOpenLink = (index) => {
        if (index === undefined) {
            return ''
        }
        if (dialogProps.data?.additionalConfig?.chatflowTypes) {
            switch (dialogProps.data.additionalConfig.chatflowTypes[index]) {
                case 'Chatflow':
                    return '/canvas/' + dialogProps.data.evaluation.chatflowId[index]
                case 'Custom Assistant':
                    return '/assistants/custom/' + dialogProps.data.evaluation.chatflowId[index]
                case 'Agentflow v2':
                    return '/v2/agentcanvas/' + dialogProps.data.evaluation.chatflowId[index]
            }
        }
        return '/canvas/' + dialogProps.data.evaluation.chatflowId[index]
    }

    const component = show ? (
        <Dialog fullScreen open={show} onClose={onCancel} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
            <DialogTitle id='alert-dialog-title'>
                <Stack direction='row' justifyContent={'space-between'}>
                    {dialogProps.data && dialogProps.data.evaluation.chatflowName?.length > 0 && (
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
                                {t('evaluations.dialogs.evalResult.flowsUsed')}
                            </div>
                            {(dialogProps.data.evaluation.chatflowName || []).map((chatflowUsed, index) => (
                                <Chip
                                    key={index}
                                    clickable
                                    style={{
                                        width: 'max-content',
                                        borderRadius: '25px',
                                        boxShadow: customization.isDarkMode
                                            ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                            : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                                    }}
                                    label={chatflowUsed}
                                    onClick={() => window.open(getOpenLink(index), '_blank')}
                                ></Chip>
                            ))}
                        </Stack>
                    )}
                    <Button variant='outlined' sx={{ width: 'max-content' }} startIcon={<IconMinimize />} onClick={() => onCancel()}>
                        {t('evaluations.actions.minimize')}
                    </Button>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <TableContainer
                    sx={{
                        height: 'calc(100vh - 100px)',
                        marginTop: 1,
                        border: 1,
                        borderColor: theme.palette.grey[900] + 25,
                        borderRadius: 2
                    }}
                    component={Paper}
                >
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead
                            sx={{
                                backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                height: 16
                            }}
                        >
                            <TableRow>
                                <TableCell rowSpan='2'>&nbsp;</TableCell>
                                <TableCell rowSpan='2'>{t('evaluations.input')}</TableCell>
                                <TableCell rowSpan='2'>{t('evaluations.dialogs.evalResult.expectedOutput')}</TableCell>
                                {dialogProps.data &&
                                    dialogProps.data.evaluation.chatflowId?.map((chatflowId, index) => (
                                        <React.Fragment key={index}>
                                            <TableCell
                                                colSpan={getColSpan(
                                                    dialogProps.data.customEvalsDefined && dialogProps.data.showCustomEvals,
                                                    dialogProps.data.evaluation?.evaluationType === 'llm'
                                                )}
                                                style={{
                                                    borderLeftStyle: 'dashed',
                                                    borderLeftColor: 'lightgrey',
                                                    borderLeftWidth: 1
                                                }}
                                            >
                                                {dialogProps.data.evaluation.chatflowName[index]}
                                                {dialogProps.data.rows.length > 0 && dialogProps.data.rows[0].metrics[index].model && (
                                                    <Chip
                                                        variant='outlined'
                                                        icon={<LLMIcon />}
                                                        color={'info'}
                                                        size='small'
                                                        label={
                                                            dialogProps.data.rows[0].metrics[index].model +
                                                            (dialogProps.data.rows[0].metrics[index].provider
                                                                ? ' [' + dialogProps.data.rows[0].metrics[index].provider + ']'
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
                                {dialogProps.data &&
                                    dialogProps.data.evaluation.chatflowId?.map((chatflowId, index) => (
                                        <React.Fragment key={index}>
                                            <TableCell
                                                style={{ borderLeftStyle: 'dashed', borderLeftColor: 'lightgrey', borderLeftWidth: 1 }}
                                            >
                                                {t('evaluations.dialogs.evalResult.actualOutput')}
                                            </TableCell>
                                            {dialogProps.data.customEvalsDefined && dialogProps.data.showCustomEvals && (
                                                <TableCell>{t('evaluations.dialogs.evalResult.evaluator')}</TableCell>
                                            )}
                                            {dialogProps.data.evaluation?.evaluationType === 'llm' && (
                                                <TableCell>{t('evaluations.dialogs.evalResult.LLMEvaluation')}</TableCell>
                                            )}
                                        </React.Fragment>
                                    ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <>
                                {dialogProps.data &&
                                    dialogProps.data.rows.length > 0 &&
                                    dialogProps.data.rows.map((item, index) => (
                                        <StyledTableRow
                                            onClick={() => openDetailsDrawer(item)}
                                            hover
                                            key={index}
                                            sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <StyledTableCell sx={{ width: 2 }}>{index + 1}</StyledTableCell>
                                            <StyledTableCell sx={{ minWidth: '250px' }}>{item.input}</StyledTableCell>
                                            <StyledTableCell sx={{ minWidth: '250px' }}>{item.expectedOutput}</StyledTableCell>
                                            {dialogProps.data.evaluation.chatflowId?.map((_, index) => (
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
                                                                        label={t('evaluations.dialogs.evalResult.totalCost', {
                                                                            value:
                                                                                item.metrics[index]?.totalCost ||
                                                                                t('evaluations.notAvailable')
                                                                        })}
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                    />
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        icon={<TokensIcon />}
                                                                        label={t('evaluations.dialogs.evalResult.totalTokens', {
                                                                            value:
                                                                                item.metrics[index]?.totalTokens ||
                                                                                t('evaluations.notAvailable')
                                                                        })}
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                    />
                                                                    {dialogProps.data.showTokenMetrics && (
                                                                        <>
                                                                            <Chip
                                                                                variant='outlined'
                                                                                size='small'
                                                                                icon={<TokensIcon />}
                                                                                label={t('evaluations.dialogs.evalResult.promptTokens', {
                                                                                    value:
                                                                                        item.metrics[index]?.promptTokens ||
                                                                                        t('evaluations.notAvailable')
                                                                                })}
                                                                                sx={{ mr: 1, mb: 1 }}
                                                                            />{' '}
                                                                            <Chip
                                                                                variant='outlined'
                                                                                size='small'
                                                                                icon={<TokensIcon />}
                                                                                label={t(
                                                                                    'evaluations.dialogs.evalResult.completionTokens',
                                                                                    {
                                                                                        value:
                                                                                            item.metrics[index]?.completionTokens ||
                                                                                            t('evaluations.notAvailable')
                                                                                    }
                                                                                )}
                                                                                sx={{ mr: 1, mb: 1 }}
                                                                            />{' '}
                                                                        </>
                                                                    )}
                                                                    {dialogProps.data.showCostMetrics && (
                                                                        <>
                                                                            <Chip
                                                                                variant='outlined'
                                                                                size='small'
                                                                                icon={<PaidIcon />}
                                                                                label={t('evaluations.dialogs.evalResult.promptCost', {
                                                                                    value:
                                                                                        item.metrics[index]?.promptCost ||
                                                                                        t('evaluations.notAvailable')
                                                                                })}
                                                                                sx={{ mr: 1, mb: 1 }}
                                                                            />{' '}
                                                                            <Chip
                                                                                variant='outlined'
                                                                                size='small'
                                                                                icon={<PaidIcon />}
                                                                                label={t('evaluations.dialogs.evalResult.completionCost', {
                                                                                    value:
                                                                                        item.metrics[index]?.completionCost ||
                                                                                        t('evaluations.notAvailable')
                                                                                })}
                                                                                sx={{ mr: 1, mb: 1 }}
                                                                            />{' '}
                                                                        </>
                                                                    )}
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        icon={<AlarmIcon />}
                                                                        label={t('evaluations.dialogs.evalResult.apiLatency', {
                                                                            value:
                                                                                item.metrics[index]?.apiLatency ||
                                                                                t('evaluations.notAvailable')
                                                                        })}
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                    />{' '}
                                                                    {dialogProps.data.showLatencyMetrics && (
                                                                        <>
                                                                            {item.metrics[index]?.chain && (
                                                                                <Chip
                                                                                    variant='outlined'
                                                                                    size='small'
                                                                                    icon={<AlarmIcon />}
                                                                                    label={t(
                                                                                        'evaluations.dialogs.evalResult.chainLatency',
                                                                                        {
                                                                                            value:
                                                                                                item.metrics[index]?.chain ||
                                                                                                t('evaluations.notAvailable')
                                                                                        }
                                                                                    )}
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                />
                                                                            )}{' '}
                                                                            {item.metrics[index]?.retriever && (
                                                                                <Chip
                                                                                    variant='outlined'
                                                                                    icon={<AlarmIcon />}
                                                                                    size='small'
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                    label={t(
                                                                                        'evaluations.dialogs.evalResult.retrieverLatency',
                                                                                        { value: item.metrics[index]?.retriever }
                                                                                    )}
                                                                                />
                                                                            )}{' '}
                                                                            {item.metrics[index]?.tool && (
                                                                                <Chip
                                                                                    variant='outlined'
                                                                                    icon={<AlarmIcon />}
                                                                                    size='small'
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                    label={t('evaluations.dialogs.evalResult.toolLatency', {
                                                                                        value: item.metrics[index]?.tool
                                                                                    })}
                                                                                />
                                                                            )}{' '}
                                                                            <Chip
                                                                                variant='outlined'
                                                                                icon={<AlarmIcon />}
                                                                                size='small'
                                                                                label={t('evaluations.dialogs.evalResult.LLMLatency', {
                                                                                    value:
                                                                                        item.metrics[index]?.llm ||
                                                                                        t('evaluations.notAvailable')
                                                                                })}
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
                                                                    backgroundColor: customization.isDarkMode ? '#4a1c1c' : '#ffebee',
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
                                                    {dialogProps.data.customEvalsDefined && dialogProps.data.showCustomEvals && (
                                                        <StyledTableCell>
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
                                                                            color: evaluator.result === 'Error' ? 'black' : 'white',
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
                                                        </StyledTableCell>
                                                    )}
                                                    {dialogProps.data.evaluation?.evaluationType === 'llm' && (
                                                        <StyledTableCell sx={{ minWidth: '350px' }}>
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
                                                                                        <b>{key}</b>: {value}
                                                                                    </span>
                                                                                }
                                                                            />
                                                                        )
                                                                    )}
                                                                </Stack>
                                                            )}
                                                        </StyledTableCell>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </StyledTableRow>
                                    ))}
                            </>
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

EvalsResultDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    openDetailsDrawer: PropTypes.func
}

export default EvalsResultDialog
