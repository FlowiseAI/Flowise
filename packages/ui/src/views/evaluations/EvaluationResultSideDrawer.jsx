import PropTypes from 'prop-types'
import { CardContent, Card, Box, SwipeableDrawer, Stack, Button, Chip, Divider, Typography } from '@mui/material'
import { useSelector } from 'react-redux'
import { IconSquareRoundedChevronsRight } from '@tabler/icons-react'
import { evaluators as evaluatorsOptions, numericOperators } from '../evaluators/evaluatorConstant'

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

    return (
        <SwipeableDrawer sx={{ zIndex: 2000 }} anchor='right' open={show} onClose={() => onClickFunction()} onOpen={onOpen}>
            <Button startIcon={<IconSquareRoundedChevronsRight />} onClick={() => onClickFunction()}>
                Close
            </Button>
            <Box sx={{ width: 450, p: 3 }} role='presentation'>
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
                                        <Box>
                                            <Typography variant='overline' sx={{ fontWeight: 'bold' }}>
                                                Chatflow
                                            </Typography>
                                            <Typography variant='body2'>{dialogProps.evaluationChatflows[index]}</Typography>
                                        </Box>
                                        <br />
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
                                                        : 'Completion: N/A'
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
                                <br />
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
