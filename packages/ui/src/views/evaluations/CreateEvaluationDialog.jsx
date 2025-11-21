import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'

// Material
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Typography,
    Chip,
    OutlinedInput,
    Divider,
    Stack,
    DialogContentText,
    Button,
    Stepper,
    Step,
    Switch,
    StepLabel,
    IconButton,
    FormControlLabel,
    Checkbox
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'

// Icons
import { IconArrowLeft, IconAlertTriangle, IconTestPipe2 } from '@tabler/icons-react'

// API
import chatflowsApi from '@/api/chatflows'
import useApi from '@/hooks/useApi'
import datasetsApi from '@/api/dataset'
import evaluatorsApi from '@/api/evaluators'
import nodesApi from '@/api/nodes'
import assistantsApi from '@/api/assistants'

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { evaluators as evaluatorsOptions } from '../evaluators/evaluatorConstant'

const steps = ['Datasets', 'Evaluators', 'LLM Graded Metrics']

const CreateEvaluationDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    useNotifier()

    const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const getAllAgentflowsApi = useApi(chatflowsApi.getAllAgentflows)

    const getAllDatasetsApi = useApi(datasetsApi.getAllDatasets)
    const getAllEvaluatorsApi = useApi(evaluatorsApi.getAllEvaluators)
    const getNodesByCategoryApi = useApi(nodesApi.getNodesByCategory)
    const getModelsApi = useApi(nodesApi.executeNodeLoadMethod)
    const getAssistantsApi = useApi(assistantsApi.getAllAssistants)

    const [chatflow, setChatflow] = useState([])
    const [dataset, setDataset] = useState('')
    const [datasetAsOneConversation, setDatasetAsOneConversation] = useState(false)
    const [flowTypes, setFlowTypes] = useState([])

    const [flows, setFlows] = useState([])
    const [datasets, setDatasets] = useState([])
    const [credentialId, setCredentialId] = useState('')
    const [evaluationName, setEvaluationName] = useState('')
    const [availableSimpleEvaluators, setAvailableSimpleEvaluators] = useState([])
    const [availableLLMEvaluators, setAvailableLLMEvaluators] = useState([])
    const [selectedSimpleEvaluators, setSelectedSimpleEvaluators] = useState([])
    const [selectedLLMEvaluators, setSelectedLLMEvaluators] = useState([])

    const [activeStep, setActiveStep] = useState(0)
    const [useLLM, setUseLLM] = useState(false)

    const [validationFailed, setValidationFailed] = useState(false)

    const [chatLLMs, setChatLLMs] = useState([])
    const [selectedLLM, setSelectedLLM] = useState('no_grading')
    const [availableModels, setAvailableModels] = useState([])
    const [selectedModel, setSelectedModel] = useState('')

    useEffect(() => {
        if (dialogProps.type === 'NEW' && dialogProps.data) {
            const evaluation = dialogProps.data
            const evalChatFlows = []
            JSON.parse(evaluation.chatflowId).map((f) => {
                evalChatFlows.push(f)
            })
            setChatflow(evalChatFlows)
            setDataset(evaluation.datasetId)
            setCredentialId('')
            setSelectedModel('')
            setSelectedLLM('no_grading')
            setEvaluationName('')
            setSelectedSimpleEvaluators([])
            setSelectedLLMEvaluators([])
            setActiveStep(0)
            setUseLLM(false)
            setCredentialId('')
        } else {
            resetData()
        }

        return () => {
            resetData()
        }
    }, [dialogProps])

    const resetData = () => {
        setDataset('')
        setCredentialId('')
        setEvaluationName('')
        setSelectedSimpleEvaluators([])
        setSelectedLLMEvaluators([])
        setActiveStep(0)
        setChatflow([])
        setSelectedModel('')
        setSelectedLLM('no_grading')
        setUseLLM(false)
        setDatasetAsOneConversation(false)
    }

    const validate = () => {
        if (activeStep === 0) {
            return evaluationName && dataset && chatflow.length > 0
        } else if (activeStep === 1) {
            return true
        } else if (activeStep === 2) {
            if (useLLM) {
                return credentialId && selectedLLM && selectedModel
            } else {
                return true
            }
        }
        return false
    }

    const goNext = async (prevActiveStep) => {
        const isValid = validate()
        setValidationFailed(!isValid)
        if (isValid) {
            if (prevActiveStep === steps.length - 1) {
                createNewEvaluation()
            } else {
                setActiveStep((prevActiveStep) => prevActiveStep + 1)
            }
        }
    }

    const goPrev = async () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1)
    }

    const createNewEvaluation = async () => {
        const selectedChatflows = JSON.parse(chatflow)
        const selectedChatflowNames = []
        for (let i = 0; i < selectedChatflows.length; i += 1) {
            selectedChatflowNames.push(flows.find((f) => f.name === selectedChatflows[i])?.label)
        }
        const selectedChatflowTypes = []
        for (let i = 0; i < selectedChatflows.length; i += 1) {
            selectedChatflowTypes.push(flows.find((f) => f.name === selectedChatflows[i])?.type)
        }
        const chatflowName = JSON.stringify(selectedChatflowNames)
        const datasetName = datasets.find((f) => f.name === dataset)?.label
        const obj = {
            name: evaluationName,
            evaluationType: credentialId ? 'llm' : 'benchmarking',
            credentialId: credentialId,
            datasetId: dataset,
            datasetName: datasetName,
            chatflowId: chatflow,
            chatflowName: chatflowName,
            chatflowType: JSON.stringify(selectedChatflowTypes),
            selectedSimpleEvaluators: selectedSimpleEvaluators,
            selectedLLMEvaluators: selectedLLMEvaluators,
            model: selectedModel,
            llm: selectedLLM,
            datasetAsOneConversation: datasetAsOneConversation
        }
        onConfirm(obj)
    }

    const disableButton = () => {
        if (activeStep === 0) {
            return !evaluationName || !dataset || chatflow.length === 0
        } else if (activeStep === 2) {
            if (useLLM) {
                if (!selectedModel || !selectedLLM || selectedLLMEvaluators.length === 0) {
                    return true
                }
                if (chatLLMs.find((llm) => llm.name === selectedLLM)?.credential && !credentialId) {
                    return true
                }
            }
            return false
        }
    }

    const EvalWizard = () => {
        return (
            <Box sx={{ width: '100%' }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>
        )
    }

    useEffect(() => {
        getNodesByCategoryApi.request('Chat Models')
        if (flows.length === 0) {
            getAllChatflowsApi.request()
            getAssistantsApi.request('CUSTOM')
            getAllAgentflowsApi.request('AGENTFLOW')
        }
        if (datasets.length === 0) {
            getAllDatasetsApi.request()
        }
        getAllEvaluatorsApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllAgentflowsApi.data && getAllChatflowsApi.data && getAssistantsApi.data) {
            try {
                const agentFlows = populateFlowNames(getAllAgentflowsApi.data, 'Agentflow v2')
                const chatFlows = populateFlowNames(getAllChatflowsApi.data, 'Chatflow')
                const assistants = populateAssistants(getAssistantsApi.data)
                setFlows([...agentFlows, ...chatFlows, ...assistants])
                setFlowTypes(['Agentflow v2', 'Chatflow', 'Custom Assistant'])
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllAgentflowsApi.data, getAllChatflowsApi.data, getAssistantsApi.data])

    useEffect(() => {
        if (getNodesByCategoryApi.data) {
            const llmNodes = []
            try {
                const nodes = getNodesByCategoryApi.data
                llmNodes.push({
                    label: 'No Grading',
                    name: 'no_grading',
                    credential: {}
                })
                for (let i = 0; i < nodes.length; i += 1) {
                    const node = nodes[i]
                    if (!node.tags || !node.tags.indexOf('[LlamaIndex]') === -1) {
                        llmNodes.push({
                            label: node.label,
                            name: node.name,
                            credential: node.credential
                        })
                    }
                }
                setChatLLMs(llmNodes)
                setSelectedLLM('no_grading')
                setSelectedModel('')
                setCredentialId('')
            } catch (e) {
                console.error(e)
            }
        }
    }, [getNodesByCategoryApi.data])

    useEffect(() => {
        if (getModelsApi.data) {
            try {
                const models = getModelsApi.data
                setAvailableModels(models)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getModelsApi.data])

    useEffect(() => {
        if (getAllEvaluatorsApi.data) {
            try {
                const simpleEvaluators = []
                const llmEvaluators = []
                // iterate over the evaluators and add a new property label that is the name of the evaluator
                // also set the name to the id
                for (let i = 0; i < getAllEvaluatorsApi.data.length; i += 1) {
                    const evaluator = getAllEvaluatorsApi.data[i]
                    evaluator.label = evaluator.name
                    evaluator.name = evaluator.id
                    if (evaluator.type === 'llm') {
                        llmEvaluators.push(evaluator)
                    } else {
                        simpleEvaluators.push(evaluator)
                    }
                }
                setAvailableSimpleEvaluators(simpleEvaluators)
                setAvailableLLMEvaluators(llmEvaluators)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllEvaluatorsApi.data])

    useEffect(() => {
        if (getAllDatasetsApi.data) {
            try {
                const datasets = getAllDatasetsApi.data
                let dsNames = []
                for (let i = 0; i < datasets.length; i += 1) {
                    const ds = datasets[i]
                    dsNames.push({
                        label: ds.name,
                        name: ds.id
                    })
                }
                setDatasets(dsNames)
            } catch (e) {
                console.error(e)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllDatasetsApi.data])

    const selectLLMForEval = (llm) => {
        setUseLLM(llm !== 'no_grading')
        setSelectedLLM(llm)
        setSelectedModel('')
        setCredentialId('')
        if (llm !== 'no_grading') getModelsApi.request(llm, { loadMethod: 'listModels' })
    }

    const onChangeFlowType = (flowType) => {
        const selected = flowType.target.checked
        const flowTypeValue = flowType.target.value
        if (selected) {
            setFlowTypes([...flowTypes, flowTypeValue])
        } else {
            setFlowTypes(flowTypes.filter((f) => f !== flowTypeValue))
        }
    }

    const populateFlowNames = (data, type) => {
        let flowNames = []
        for (let i = 0; i < data.length; i += 1) {
            const flow = data[i]
            flowNames.push({
                label: flow.name,
                name: flow.id,
                type: type,
                description: type
            })
        }
        return flowNames
    }

    const populateAssistants = (assistants) => {
        let assistantNames = []
        for (let i = 0; i < assistants.length; i += 1) {
            const assistant = assistants[i]
            assistantNames.push({
                label: JSON.parse(assistant.details).name || '',
                name: assistant.id,
                type: 'Custom Assistant',
                description: 'Custom Assistant'
            })
        }
        return assistantNames
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconTestPipe2 style={{ marginRight: '10px' }} />
                    {'Start New Evaluation'}
                </div>
            </DialogTitle>
            <DialogContent>
                <Stack direction='column' spacing={2}>
                    <Divider />
                    {validationFailed && (
                        <div
                            style={{
                                display: 'flex',
                                minHeight: 40,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'lightcoral',
                                color: 'white',
                                padding: 10
                            }}
                        >
                            <div
                                style={{
                                    width: 25,
                                    height: 25,
                                    marginRight: 10,
                                    borderRadius: '50%'
                                }}
                            >
                                <IconAlertTriangle
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </div>
                            Fill all the mandatory fields
                        </div>
                    )}
                    <EvalWizard />
                    <DialogContentText align={'center'}>
                        {activeStep === 0 && (
                            <>
                                <Typography sx={{ mt: 2 }} variant='h4'>
                                    Select dataset to be tested on flows
                                </Typography>
                                <Typography sx={{ mt: 2 }} variant='body2'>
                                    Uses the <span style={{ fontStyle: 'italic' }}>input</span> column from the dataset to execute selected
                                    Chatflow(s), and compares the results with the output column.
                                </Typography>
                                <Typography variant='body2'>The following metrics will be computed:</Typography>
                                <Stack
                                    flexDirection='row'
                                    sx={{ mt: 2, gap: 1, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
                                >
                                    {evaluatorsOptions
                                        .filter((opt) => opt.type === 'numeric' && opt.name !== 'chain')
                                        .map((evaluator, index) => (
                                            <Chip key={index} variant='outlined' label={evaluator.label} />
                                        ))}
                                </Stack>
                            </>
                        )}
                        {activeStep === 1 && (
                            <>
                                <Typography sx={{ mt: 2 }} variant='h4'>
                                    Unit Test your flows by adding custom evaluators
                                </Typography>
                                <Typography sx={{ mt: 2, mb: 2 }} variant='body2'>
                                    Post execution, all the chosen evaluators will be executed on the results. Each evaluator will grade the
                                    results based on the criteria defined and return a pass/fail indicator.
                                </Typography>
                                <Chip
                                    variant='contained'
                                    color='success'
                                    sx={{ background: theme.palette.teal.main, color: 'white' }}
                                    label={'pass'}
                                />
                                <Chip variant='contained' color='error' style={{ margin: 5 }} label={'fail'} />
                            </>
                        )}
                        {activeStep === 2 && (
                            <>
                                <Typography sx={{ mt: 2 }} variant='h4'>
                                    Grade flows using an LLM
                                </Typography>
                                <Typography sx={{ mt: 2 }} variant='body2'>
                                    Post execution, grades the answers by using an LLM. Used to generate comparative scores or reasoning or
                                    other custom defined criteria.
                                </Typography>
                            </>
                        )}
                    </DialogContentText>
                    {activeStep === 0 && (
                        <>
                            <Box>
                                <Typography variant='overline'>
                                    Name<span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <TooltipWithParser style={{ marginLeft: 10 }} title={'Friendly name to tag this run.'} />
                                <OutlinedInput
                                    id='evaluationName'
                                    type='string'
                                    size='small'
                                    fullWidth
                                    placeholder='Evaluation'
                                    value={evaluationName}
                                    name='evaluationName'
                                    onChange={(e) => setEvaluationName(e.target.value)}
                                />
                            </Box>
                            <Box>
                                <Typography variant='overline'>
                                    Dataset to use<span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <Dropdown
                                    name='dataset'
                                    defaultOption='Select Dataset'
                                    options={datasets}
                                    onSelect={(newValue) => setDataset(newValue)}
                                    value={dataset}
                                />
                            </Box>
                            <Box>
                                <Typography variant='overline' sx={{ mr: 2 }}>
                                    Treat all dataset rows as one conversation ?
                                </Typography>
                                <FormControlLabel
                                    label=''
                                    control={<Switch />}
                                    value={datasetAsOneConversation}
                                    onChange={() => setDatasetAsOneConversation(!datasetAsOneConversation)}
                                />
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant='overline'>
                                        Select your flows to Evaluate
                                        <span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <Typography variant='overline'>
                                        <Checkbox defaultChecked size='small' label='All' value='Chatflow' onChange={onChangeFlowType} />{' '}
                                        Chatflows
                                        <Checkbox
                                            defaultChecked
                                            size='small'
                                            label='All'
                                            value='Agentflow v2'
                                            onChange={onChangeFlowType}
                                        />{' '}
                                        Agentflows (v2)
                                        <Checkbox
                                            defaultChecked
                                            size='small'
                                            label='All'
                                            value='Custom Assistant'
                                            onChange={onChangeFlowType}
                                        />{' '}
                                        Custom Assistants
                                    </Typography>
                                </div>
                                <MultiDropdown
                                    name={'chatflow1'}
                                    options={flows.filter((f) => flowTypes.includes(f.type))}
                                    onSelect={(newValue) => setChatflow(newValue)}
                                    value={chatflow ?? chatflow ?? 'choose an option'}
                                />
                            </Box>
                        </>
                    )}
                    {activeStep === 1 && (
                        <>
                            <Box>
                                <Typography variant='overline'>Select the Evaluators</Typography>
                                <MultiDropdown
                                    name={'selectEvals'}
                                    options={availableSimpleEvaluators}
                                    onSelect={(newValue) => setSelectedSimpleEvaluators(newValue)}
                                    value={selectedSimpleEvaluators}
                                />
                            </Box>
                        </>
                    )}
                    {activeStep === 2 && (
                        <>
                            <Box>
                                <Typography variant='overline' sx={{ mr: 2 }}>
                                    Use an LLM to grade the results ?
                                </Typography>
                                <Dropdown
                                    name='chatLLM'
                                    defaultOption='no_grading'
                                    options={chatLLMs}
                                    value={selectedLLM}
                                    onSelect={(newValue) => selectLLMForEval(newValue)}
                                />
                            </Box>
                            {useLLM && availableModels.length > 0 && (
                                <Box>
                                    <Typography variant='overline'>Select Model</Typography>
                                    <Dropdown
                                        name='selectedModel'
                                        defaultOption=''
                                        options={availableModels}
                                        value={selectedModel}
                                        onSelect={(newValue) => setSelectedModel(newValue)}
                                    />
                                </Box>
                            )}
                            {useLLM && availableModels.length === 0 && (
                                <Box>
                                    <Typography variant='overline'>Enter the Model Name</Typography>
                                    <OutlinedInput
                                        id='selectedModel'
                                        type='string'
                                        size='small'
                                        fullWidth
                                        placeholder='Model Name'
                                        value={selectedModel}
                                        name='selectedModel'
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                    />
                                </Box>
                            )}
                            {useLLM && chatLLMs.find((llm) => llm.name === selectedLLM)?.credential && (
                                <Box>
                                    <Typography variant='overline'>Select Credential</Typography>
                                    <CredentialInputHandler
                                        key={selectedLLM}
                                        size='small'
                                        sx={{ flexGrow: 1, marginBottom: 3 }}
                                        data={credentialId ? { credential: credentialId } : {}}
                                        inputParam={{
                                            label: 'Connect Credential',
                                            name: 'credential',
                                            type: 'credential',
                                            credentialNames: [
                                                chatLLMs.find((llm) => llm.name === selectedLLM)?.credential.credentialNames[0]
                                            ]
                                        }}
                                        onSelect={(newValue) => {
                                            setCredentialId(newValue)
                                        }}
                                    />
                                </Box>
                            )}
                            {useLLM && (
                                <Box>
                                    <Typography variant='overline'>Select Evaluators</Typography>
                                    <MultiDropdown
                                        name={'selectLLMEvals'}
                                        options={availableLLMEvaluators}
                                        onSelect={(newValue) => setSelectedLLMEvaluators(newValue)}
                                        value={selectedLLMEvaluators}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                    <Divider />
                </Stack>
            </DialogContent>
            <DialogActions style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                {activeStep > 0 && (
                    <IconButton sx={{ ml: 2 }} color='secondary' title='Previous Step' onClick={() => goPrev(activeStep)}>
                        <IconArrowLeft />
                    </IconButton>
                )}
                <div style={{ flex: 1 }}></div>
                {activeStep === 1 && selectedSimpleEvaluators.length === 0 && (
                    <Button
                        title='Skip Evaluators'
                        color='primary'
                        sx={{ mr: 2, borderRadius: 25 }}
                        variant='outlined'
                        onClick={() => goNext(activeStep)}
                    >
                        {'Skip'}
                    </Button>
                )}
                {activeStep === 1 && selectedSimpleEvaluators.length > 0 && (
                    <Button color='primary' sx={{ mr: 2, borderRadius: 25 }} variant='contained' onClick={() => goNext(activeStep)}>
                        {'Next'}
                    </Button>
                )}
                {activeStep !== 1 && (
                    <StyledButton
                        disabled={disableButton()}
                        sx={{ mr: 2, borderRadius: 25 }}
                        variant='contained'
                        onClick={() => goNext(activeStep)}
                    >
                        {activeStep === steps.length - 1 ? 'Start Evaluation' : 'Next'}
                    </StyledButton>
                )}
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

CreateEvaluationDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default CreateEvaluationDialog
