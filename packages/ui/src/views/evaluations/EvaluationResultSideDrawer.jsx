import PropTypes from 'prop-types'
import {
    CardContent,
    Card,
    Box,
    SwipeableDrawer,
    Stack,
    Button,
    Chip,
    Divider,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableBody
} from '@mui/material'
import { IconHierarchy, IconUsersGroup, IconRobot } from '@tabler/icons-react'

import { useSelector } from 'react-redux'
import { evaluators as evaluatorsOptions, numericOperators } from '../evaluators/evaluatorConstant'
import TableCell from '@mui/material/TableCell'
import { Close } from '@mui/icons-material'

const EvaluationResultSideDrawer = ({ show, dialogProps, onClickFunction }) => {
    const onOpen = () => {}
    const customization = useSelector((state) => state.customization)

    const getEvaluatorValue = (evaluator) => {
        if (evaluator.type === 'text') {
            return '"' + evaluator.value + '"'
        } else if (evaluator.name === 'json') {
            return ''
        } else if (evaluator.type === 'numeric') {
            return evaluator.value
        }
        return ''
    }

    const getFlowIcon = (index) => {
        if (index === undefined) {
            return <IconHierarchy size={24} />
        }
        if (dialogProps.additionalConfig.chatflowTypes) {
            switch (dialogProps.additionalConfig.chatflowTypes[index]) {
                case 'Chatflow':
                    return <IconHierarchy size={20} />
                case 'Custom Assistant':
                    return <IconRobot size={20} />
                case 'Agentflow v2':
                    return <IconUsersGroup size={20} />
            }
        }
        return <IconHierarchy />
    }

    return (
        <SwipeableDrawer sx={{ zIndex: 2000 }} anchor='right' open={show} onClose={() => onClickFunction()} onOpen={onOpen}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc' }}>
                <Typography variant='overline' sx={{ margin: 1, fontWeight: 'bold' }}>
                    Evaluation Details
                </Typography>
                <Button endIcon={<Close />} onClick={() => onClickFunction()} />
            </div>
            <Box sx={{ width: 600, p: 2 }} role='presentation'>
                <Box>
                    <Typography variant='overline' sx={{ fontWeight: 'bold' }}>
                        Evaluation Id
                    </Typography>
                    <Typography variant='body2'>{dialogProps.data.evaluationId}</Typography>
                </Box>

                <br />
                <Divider />

                <Box>
                    <br />
                    <Typography variant='overline' sx={{ fontWeight: 'bold' }}>
                        Input
                    </Typography>
                    <Typography variant='body2'>{dialogProps.data.input}</Typography>
                </Box>

                <br />
                <Divider />

                <Box>
                    <br />
                    <Typography variant='overline' sx={{ fontWeight: 'bold' }}>
                        Expected Output
                    </Typography>
                    <Typography variant='body2'>{dialogProps.data.expectedOutput}</Typography>
                </Box>

                {dialogProps.data &&
                    dialogProps.data.actualOutput?.length > 0 &&
                    dialogProps.data.actualOutput.map((output, index) => (
                        <Card key={indexedDB} sx={{ mt: 2, border: '1px solid #e0e0e0', borderRadius: `15px` }}>
                            <CardContent>
                                {dialogProps.evaluationChatflows?.length > 0 && (
                                    <>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'start',
                                                alignItems: 'center',
                                                marginBottom: 5
                                            }}
                                        >
                                            {getFlowIcon(index)}
                                            <Typography variant='overline' sx={{ fontWeight: 'bold', fontSize: '1.1rem', marginLeft: 1 }}>
                                                {dialogProps.evaluationChatflows[index]}
                                            </Typography>
                                        </div>
                                        <Divider />
                                    </>
                                )}
                                <Box>
                                    <br />
                                    <Typography variant='overline' sx={{ fontWeight: 'bold' }}>
                                        {dialogProps.data.errors[index] === '' ? 'Actual Output' : 'Error'}
                                    </Typography>
                                    <Typography variant='body2'>
                                        {dialogProps.data.errors[index] === '' ? (
                                            dialogProps.data.actualOutput[index]
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
                                                label={dialogProps.data.errors[index]}
                                            />
                                        )}
                                    </Typography>
                                </Box>
                                <br />
                                <Divider />
                                <Box>
                                    <br />
                                    <Typography variant='overline' style={{ fontWeight: 'bold' }}>
                                        Latency Metrics
                                    </Typography>
                                    <Typography variant='body2'>
                                        <Stack sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }} flexDirection='row' gap={1}>
                                            <Chip
                                                variant='outlined'
                                                size='small'
                                                label={
                                                    dialogProps.data.metrics[0]?.apiLatency
                                                        ? 'API: ' + dialogProps.data.metrics[index]?.apiLatency
                                                        : 'API: N/A'
                                                }
                                            />
                                            {dialogProps.data.metrics[index]?.chain && (
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={'Chain: ' + dialogProps.data.metrics[index]?.chain}
                                                />
                                            )}
                                            {dialogProps.data.metrics[index]?.retriever && (
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={'Retriever: ' + dialogProps.data.metrics[index]?.retriever}
                                                />
                                            )}
                                            {dialogProps.data.metrics[index]?.tool && (
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={'Retriever: ' + dialogProps.data.metrics[index]?.tool}
                                                />
                                            )}
                                            <Chip
                                                variant='outlined'
                                                size='small'
                                                label={
                                                    dialogProps.data.metrics[index]?.llm
                                                        ? 'LLM: ' + dialogProps.data.metrics[index]?.llm
                                                        : 'LLM: N/A'
                                                }
                                            />
                                        </Stack>
                                    </Typography>
                                </Box>
                                <br />
                                <Divider />
                                <br />
                                {dialogProps.data.metrics[index]?.nested_metrics ? (
                                    <Box>
                                        <Typography variant='overline' style={{ fontWeight: 'bold' }}>
                                            Tokens
                                        </Typography>
                                        <Table size='small' style={{ border: '1px solid #ccc' }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell align='left' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        Node
                                                    </TableCell>
                                                    <TableCell align='left' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        Provider & Model
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold', width: '15%' }}>
                                                        Input
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold', width: '15%' }}>
                                                        Output
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold', width: '15%' }}>
                                                        Total
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody style={{ fontSize: '8px' }}>
                                                {dialogProps.data.metrics[index]?.nested_metrics?.map((metric, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell component='th' scope='row' style={{ fontSize: '11px' }}>
                                                            {metric.nodeLabel}
                                                        </TableCell>
                                                        <TableCell component='th' scope='row' style={{ fontSize: '11px' }}>
                                                            {metric.provider}
                                                            <br />
                                                            {metric.model}
                                                        </TableCell>
                                                        <TableCell align='right' style={{ fontSize: '11px' }}>
                                                            {metric.promptTokens}
                                                        </TableCell>
                                                        <TableCell align='right' style={{ fontSize: '11px' }}>
                                                            {metric.completionTokens}
                                                        </TableCell>
                                                        <TableCell align='right' style={{ fontSize: '11px' }}>
                                                            {metric.totalTokens}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow key={index}>
                                                    <TableCell
                                                        align='right'
                                                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                        component='th'
                                                        scope='row'
                                                        colspan={2}
                                                    >
                                                        Total
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {dialogProps.data.metrics[index].promptTokens}
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {dialogProps.data.metrics[index].completionTokens}
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {dialogProps.data.metrics[index].totalTokens}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Typography variant='overline' style={{ fontWeight: 'bold' }}>
                                            Tokens
                                        </Typography>
                                        <Typography variant='body2'>
                                            <Stack sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }} flexDirection='row' gap={1}>
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={
                                                        dialogProps.data.metrics[index]?.totalTokens
                                                            ? 'Total: ' + dialogProps.data.metrics[index]?.totalTokens
                                                            : 'Total: N/A'
                                                    }
                                                />
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={
                                                        dialogProps.data.metrics[index]?.promptTokens
                                                            ? 'Prompt: ' + dialogProps.data.metrics[index]?.promptTokens
                                                            : 'Prompt: N/A'
                                                    }
                                                />
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={
                                                        dialogProps.data.metrics[index]?.completionTokens
                                                            ? 'Completion: ' + dialogProps.data.metrics[index]?.completionTokens
                                                            : 'Completion: N/A'
                                                    }
                                                />
                                            </Stack>
                                        </Typography>
                                    </Box>
                                )}
                                <br />
                                {dialogProps.data.metrics[index]?.nested_metrics ? (
                                    <Box>
                                        <Typography variant='overline' style={{ fontWeight: 'bold' }}>
                                            Cost
                                        </Typography>
                                        <Table size='small' style={{ border: '1px solid #ccc' }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell align='left' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        Node
                                                    </TableCell>
                                                    <TableCell align='left' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        Provider & Model
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', width: '15%', fontWeight: 'bold' }}>
                                                        Input
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', width: '15%', fontWeight: 'bold' }}>
                                                        Output
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', width: '15%', fontWeight: 'bold' }}>
                                                        Total
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody style={{ fontSize: '8px' }}>
                                                {dialogProps.data.metrics[index]?.nested_metrics?.map((metric, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell component='th' scope='row' style={{ fontSize: '11px' }}>
                                                            {metric.nodeLabel}
                                                        </TableCell>
                                                        <TableCell component='th' scope='row' style={{ fontSize: '11px' }}>
                                                            {metric.provider} <br />
                                                            {metric.model}
                                                        </TableCell>
                                                        <TableCell align='right' style={{ fontSize: '11px' }}>
                                                            {metric.promptCost}
                                                        </TableCell>
                                                        <TableCell align='right' style={{ fontSize: '11px' }}>
                                                            {metric.completionCost}
                                                        </TableCell>
                                                        <TableCell align='right' style={{ fontSize: '11px' }}>
                                                            {metric.totalCost}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow key={index}>
                                                    <TableCell
                                                        align='right'
                                                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                        component='th'
                                                        scope='row'
                                                        colspan={2}
                                                    >
                                                        Total
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {dialogProps.data.metrics[index].promptCost}
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {dialogProps.data.metrics[index].completionCost}
                                                    </TableCell>
                                                    <TableCell align='right' style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {dialogProps.data.metrics[index].totalCost}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Typography variant='overline' style={{ fontWeight: 'bold' }}>
                                            Cost
                                        </Typography>
                                        <Typography variant='body2'>
                                            <Stack sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }} flexDirection='row' gap={1}>
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={
                                                        dialogProps.data.metrics[index]?.totalCost
                                                            ? 'Total: ' + dialogProps.data.metrics[index]?.totalCost
                                                            : 'Total: N/A'
                                                    }
                                                />
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={
                                                        dialogProps.data.metrics[index]?.promptCost
                                                            ? 'Prompt: ' + dialogProps.data.metrics[index]?.promptCost
                                                            : 'Completion: N/A'
                                                    }
                                                />
                                                <Chip
                                                    variant='outlined'
                                                    size='small'
                                                    label={
                                                        dialogProps.data.metrics[index]?.completionCost
                                                            ? 'Completion: ' + dialogProps.data.metrics[index]?.completionCost
                                                            : 'Completion: N/A'
                                                    }
                                                />
                                            </Stack>
                                        </Typography>
                                    </Box>
                                )}
                                <br />
                                <Divider />
                                <br />
                                {dialogProps.data?.customEvals &&
                                    dialogProps.data?.customEvals[index] &&
                                    dialogProps.data.customEvals[index].length > 0 && (
                                        <Box>
                                            <Typography variant='overline' style={{ fontWeight: 'bold' }}>
                                                Custom Evaluators
                                            </Typography>
                                            <Box>
                                                {dialogProps.data.customEvals[index] &&
                                                    dialogProps.data.customEvals[index].map((evaluator, index) => (
                                                        <Stack
                                                            key={index}
                                                            sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
                                                            flexDirection='row'
                                                            gap={1}
                                                        >
                                                            <Chip
                                                                variant='contained'
                                                                sx={{
                                                                    width: 'max-content',
                                                                    color: 'white',
                                                                    backgroundColor: evaluator.result === 'Pass' ? '#00c853' : '#ff1744'
                                                                }}
                                                                size='small'
                                                                label={evaluator.result}
                                                            />
                                                            <Chip
                                                                sx={{ width: 'max-content' }}
                                                                variant='outlined'
                                                                size='small'
                                                                label={`Evaluator: ${evaluator.name}`}
                                                            ></Chip>
                                                            <Chip
                                                                sx={{ width: 'max-content' }}
                                                                variant='outlined'
                                                                size='small'
                                                                label={`${
                                                                    [...evaluatorsOptions, ...numericOperators].find(
                                                                        (opt) => opt.name === evaluator.measure
                                                                    )?.label || 'Actual Output'
                                                                } ${
                                                                    [...evaluatorsOptions, ...numericOperators]
                                                                        .find((opt) => opt.name === evaluator.operator)
                                                                        ?.label.toLowerCase() || '<empty>'
                                                                } ${getEvaluatorValue(evaluator)}`}
                                                            ></Chip>
                                                        </Stack>
                                                    ))}
                                            </Box>
                                        </Box>
                                    )}
                                {dialogProps?.evaluationType === 'llm' && (
                                    <>
                                        <br />
                                        <Divider />
                                        <Box>
                                            <br />
                                            <Typography variant='overline' sx={{ fontWeight: 'bold' }}>
                                                LLM Graded
                                            </Typography>
                                            <Stack flexDirection='row' gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                {Object.entries(dialogProps.data.llmEvaluators[index]).map(([key, value], index) => (
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
                                                ))}
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}
            </Box>
        </SwipeableDrawer>
    )
}

EvaluationResultSideDrawer.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onClickFunction: PropTypes.func
}

export default EvaluationResultSideDrawer
