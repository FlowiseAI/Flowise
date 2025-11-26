import { createPortal } from 'react-dom'
import { cloneDeep } from 'lodash'
import { useState, useEffect, useContext } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { Box, Typography, OutlinedInput, DialogActions, Button, Dialog, DialogContent, DialogTitle, LinearProgress } from '@mui/material'
import chatflowsApi from '@/api/chatflows'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { IconX, IconSparkles, IconArrowLeft } from '@tabler/icons-react'
import useNotifier from '@/utils/useNotifier'
import { LoadingButton } from '@mui/lab'
import generatorGIF from '@/assets/images/agentflow-generator.gif'
import { flowContext } from '@/store/context/ReactFlowContext'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { useTheme } from '@mui/material/styles'
import assistantsApi from '@/api/assistants'
import { baseURL } from '@/store/constant'
import { initNode, showHideInputParams } from '@/utils/genericHelper'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import useApi from '@/hooks/useApi'

const defaultInstructions = [
    {
        text: 'An agent that can autonomously search the web and generate report'
    },
    {
        text: 'Summarize a document'
    },
    {
        text: 'Generate response to user queries and send it to Slack'
    },
    {
        text: 'A team of agents that can handle all customer queries'
    }
]

const AgentflowGeneratorDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const [customAssistantInstruction, setCustomAssistantInstruction] = useState('')
    const [generatedInstruction, setGeneratedInstruction] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [chatModelsComponents, setChatModelsComponents] = useState([])
    const [chatModelsOptions, setChatModelsOptions] = useState([])
    const [selectedChatModel, setSelectedChatModel] = useState({})
    const customization = useSelector((state) => state.customization)

    const getChatModelsApi = useApi(assistantsApi.getChatModels)
    const { reactFlowInstance } = useContext(flowContext)
    const theme = useTheme()

    // ==============================|| Snackbar ||============================== //
    const dispatch = useDispatch()
    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const handleChatModelDataChange = ({ inputParam, newValue }) => {
        setSelectedChatModel((prevData) => {
            const updatedData = { ...prevData }
            updatedData.inputs[inputParam.name] = newValue
            updatedData.inputParams = showHideInputParams(updatedData)
            return updatedData
        })
    }

    useEffect(() => {
        if (getChatModelsApi.data) {
            setChatModelsComponents(getChatModelsApi.data)

            // Set options
            const options = getChatModelsApi.data.map((chatModel) => ({
                label: chatModel.label,
                name: chatModel.name,
                imageSrc: `${baseURL}/api/v1/node-icon/${chatModel.name}`
            }))
            setChatModelsOptions(options)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatModelsApi.data])

    // Simulate progress for the fake progress bar
    useEffect(() => {
        let timer
        if (loading) {
            setProgress(0)
            timer = setInterval(() => {
                setProgress((prevProgress) => {
                    // Slowly increase to 95% to give the impression of work happening
                    // Last 5% will complete when the actual work is done
                    if (prevProgress >= 95) {
                        clearInterval(timer)
                        return 95
                    }
                    // Speed up in the middle, slow at the beginning and end
                    const increment = prevProgress < 30 ? 3 : prevProgress < 60 ? 5 : prevProgress < 80 ? 2 : 0.5
                    return Math.min(prevProgress + increment, 95)
                })
            }, 500)
        } else {
            // When loading is done, immediately set to 100%
            setProgress(100)
        }

        return () => {
            if (timer) {
                clearInterval(timer)
            }
        }
    }, [loading])

    const onGenerate = async () => {
        if (!customAssistantInstruction.trim()) return

        try {
            setLoading(true)

            const response = await chatflowsApi.generateAgentflow({
                question: customAssistantInstruction.trim(),
                selectedChatModel: selectedChatModel
            })

            if (response.data && response.data.nodes && response.data.edges) {
                reactFlowInstance.setNodes(response.data.nodes)
                reactFlowInstance.setEdges(response.data.edges)
                onConfirm()
            } else {
                enqueueSnackbar({
                    message: response.error || 'Failed to generate agentflow',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: false,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        } catch (error) {
            enqueueSnackbar({
                message: error.response?.data?.message || 'Failed to generate agentflow',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: false,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setLoading(false)
        }
    }

    // clear the state when dialog is closed
    useEffect(() => {
        if (!show) {
            setCustomAssistantInstruction('')
            setGeneratedInstruction('')
            setProgress(0)
        } else {
            getChatModelsApi.request()
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <>
            <Dialog
                fullWidth
                maxWidth={loading ? 'sm' : 'md'}
                open={show}
                onClose={loading ? null : onCancel}
                aria-labelledby='alert-dialog-title'
                aria-describedby='alert-dialog-description'
            >
                <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                    {dialogProps.title}
                </DialogTitle>
                <DialogContent>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                            <img src={generatorGIF} alt='Generating Agentflow' style={{ maxWidth: '100%', height: 'auto' }} />
                            <Typography variant='h5' sx={{ mt: 2 }}>
                                Generating your Agentflow...
                            </Typography>
                            <Box sx={{ width: '100%', mt: 2 }}>
                                <LinearProgress
                                    variant='determinate'
                                    value={progress}
                                    sx={{
                                        height: 10,
                                        borderRadius: 5,
                                        '& .MuiLinearProgress-bar': {
                                            background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                                            borderRadius: 5
                                        }
                                    }}
                                />
                                <Typography variant='body2' color='text.secondary' align='center' sx={{ mt: 1 }}>
                                    {`${Math.round(progress)}%`}
                                </Typography>
                            </Box>
                        </div>
                    ) : (
                        <>
                            <span>{dialogProps.description}</span>
                            <div
                                style={{
                                    display: 'block',
                                    flexDirection: 'row',
                                    width: '100%',
                                    marginTop: '25px'
                                }}
                            >
                                {defaultInstructions.map((instruction, index) => {
                                    return (
                                        <Button
                                            size='small'
                                            key={index}
                                            sx={{
                                                textTransform: 'none',
                                                mr: 1,
                                                mb: 1,
                                                borderRadius: '16px',
                                                border: 'none',
                                                backgroundColor: customization.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                '&:hover': {
                                                    backgroundColor: customization.isDarkMode
                                                        ? 'rgba(255,255,255,0.1)'
                                                        : 'rgba(0,0,0,0.06)',
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                                                }
                                            }}
                                            variant='contained'
                                            color='inherit'
                                            onClick={() => {
                                                setCustomAssistantInstruction(instruction.text)
                                                setGeneratedInstruction('')
                                            }}
                                        >
                                            {instruction.text}
                                        </Button>
                                    )
                                })}
                            </div>
                            {!generatedInstruction && (
                                <OutlinedInput
                                    sx={{ mt: 2, width: '100%' }}
                                    type={'text'}
                                    multiline={true}
                                    rows={12}
                                    disabled={loading}
                                    value={customAssistantInstruction}
                                    placeholder={'Describe your agent here'}
                                    onChange={(event) => setCustomAssistantInstruction(event.target.value)}
                                />
                            )}
                            {generatedInstruction && (
                                <OutlinedInput
                                    sx={{ mt: 2, width: '100%' }}
                                    type={'text'}
                                    multiline={true}
                                    rows={12}
                                    value={generatedInstruction}
                                    onChange={(event) => setGeneratedInstruction(event.target.value)}
                                />
                            )}
                            <Box sx={{ mt: 2 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Select model to generate agentflow<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                </div>
                                <Dropdown
                                    key={JSON.stringify(selectedChatModel)}
                                    name={'chatModel'}
                                    options={chatModelsOptions ?? []}
                                    onSelect={(newValue) => {
                                        if (!newValue) {
                                            setSelectedChatModel({})
                                        } else {
                                            const foundChatComponent = chatModelsComponents.find((chatModel) => chatModel.name === newValue)
                                            if (foundChatComponent) {
                                                const chatModelId = `${foundChatComponent.name}_0`
                                                const clonedComponent = cloneDeep(foundChatComponent)
                                                const initChatModelData = initNode(clonedComponent, chatModelId)
                                                setSelectedChatModel(initChatModelData)
                                            }
                                        }
                                    }}
                                    value={selectedChatModel ? selectedChatModel?.name : 'choose an option'}
                                />
                            </Box>
                            {selectedChatModel && Object.keys(selectedChatModel).length > 0 && (
                                <Box
                                    sx={{
                                        p: 0,
                                        mt: 1,
                                        mb: 1,
                                        border: 1,
                                        borderColor: theme.palette.grey[900] + 25,
                                        borderRadius: 2
                                    }}
                                >
                                    {showHideInputParams(selectedChatModel)
                                        .filter((inputParam) => !inputParam.hidden && inputParam.display !== false)
                                        .map((inputParam, index) => (
                                            <DocStoreInputHandler
                                                key={index}
                                                inputParam={inputParam}
                                                data={selectedChatModel}
                                                onNodeDataChange={handleChatModelDataChange}
                                            />
                                        ))}
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ pb: 3, pr: 3 }}>
                    {loading ? null : (
                        <>
                            {!generatedInstruction && (
                                <LoadingButton
                                    loading={loading}
                                    variant='contained'
                                    onClick={() => {
                                        onGenerate()
                                    }}
                                    sx={{
                                        background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                                        '&:hover': { background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)' }
                                    }}
                                    startIcon={<IconSparkles size={20} />}
                                    disabled={
                                        loading ||
                                        !customAssistantInstruction.trim() ||
                                        !selectedChatModel ||
                                        !Object.keys(selectedChatModel).length
                                    }
                                >
                                    Generate
                                </LoadingButton>
                            )}
                            {generatedInstruction && (
                                <Button
                                    variant='outlined'
                                    startIcon={<IconArrowLeft size={20} />}
                                    onClick={() => {
                                        setGeneratedInstruction('')
                                    }}
                                >
                                    Back
                                </Button>
                            )}
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </>
    ) : null

    return createPortal(component, portalElement)
}

AgentflowGeneratorDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func
}

export default AgentflowGeneratorDialog
