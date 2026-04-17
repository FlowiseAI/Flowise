import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Step,
    StepLabel,
    Stepper,
    TextField
} from '@mui/material'
import axios from 'axios'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// i18n
import { useTranslation, Trans } from 'react-i18next'

const NvidiaNIMDialog = ({ open, onClose, onComplete }) => {
    const { t } = useTranslation()
    const portalElement = document.getElementById('portal')

    const modelOptions = {
        'nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.0-RTX': {
            label: 'Llama 3.1 8B Instruct',
            licenseUrl: 'https://catalog.ngc.nvidia.com/orgs/nim/teams/meta/containers/llama-3.1-8b-instruct'
        },
        'nvcr.io/nim/deepseek-ai/deepseek-r1-distill-llama-8b:1.8.0-RTX': {
            label: 'DeepSeek R1 Distill Llama 8B',
            licenseUrl: 'https://catalog.ngc.nvidia.com/orgs/nim/teams/deepseek-ai/containers/deepseek-r1-distill-llama-8b'
        },
        'nvcr.io/nim/nv-mistralai/mistral-nemo-12b-instruct:1.8.0-rtx': {
            label: 'Mistral Nemo 12B Instruct',
            licenseUrl: 'https://catalog.ngc.nvidia.com/orgs/nim/teams/nv-mistralai/containers/mistral-nemo-12b-instruct'
        }
    }

    const [activeStep, setActiveStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [imageTag, setImageTag] = useState('')
    const [pollInterval, setPollInterval] = useState(null)
    const [nimRelaxMemConstraints, setNimRelaxMemConstraints] = useState('0')
    const [hostPort, setHostPort] = useState('8080')
    const [showContainerConfirm, setShowContainerConfirm] = useState(false)
    const [existingContainer, setExistingContainer] = useState(null)

    const steps = [
        'components.dialogs.nvidiaNim.steps.download.title',
        'components.dialogs.nvidiaNim.steps.pull.title',
        'components.dialogs.nvidiaNim.steps.start.title'
    ]

    const handleDownloadInstaller = async () => {
        try {
            setLoading(true)
            await axios.get('/api/v1/nvidia-nim/download-installer')
            setLoading(false)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert(t('components.dialogs.nvidiaNim.errors.download', { msg: errorData }))
            setLoading(false)
        }
    }

    const preload = async () => {
        try {
            setLoading(true)
            await axios.get('/api/v1/nvidia-nim/preload')
            setLoading(false)
            setActiveStep(1)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert(t('components.dialogs.nvidiaNim.errors.preload', { msg: errorData }))
            setLoading(false)
        }
    }

    const handlePullImage = async () => {
        try {
            setLoading(true)
            try {
                const imageResponse = await axios.post('/api/v1/nvidia-nim/get-image', { imageTag })
                if (imageResponse.data && imageResponse.data.tag === imageTag) {
                    setLoading(false)
                    setActiveStep(2)
                    return
                }
            } catch (err) {
                // Continue if image not found
                if (err.response?.status !== 404) {
                    throw err
                }
            }

            // Get token first
            const tokenResponse = await axios.get('/api/v1/nvidia-nim/get-token')
            const apiKey = tokenResponse.data.access_token

            // Pull image
            await axios.post('/api/v1/nvidia-nim/pull-image', {
                imageTag,
                apiKey
            })

            // Start polling for image status
            const interval = setInterval(async () => {
                try {
                    const imageResponse = await axios.post('/api/v1/nvidia-nim/get-image', { imageTag })
                    if (imageResponse.data) {
                        clearInterval(interval)
                        setLoading(false)
                        setActiveStep(2)
                    }
                } catch (err) {
                    // Continue polling if image not found
                    if (err.response?.status !== 404) {
                        clearInterval(interval)
                        alert(t('components.dialogs.nvidiaNim.errors.checkImage', { msg: err.message }))
                        setLoading(false)
                    }
                }
            }, 5000)

            setPollInterval(interval)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert(t('components.dialogs.nvidiaNim.errors.pullImage', { msg: errorData }))
            setLoading(false)
        }
    }

    const handleStartContainer = async () => {
        try {
            setLoading(true)
            try {
                const containerResponse = await axios.post('/api/v1/nvidia-nim/get-container', {
                    imageTag,
                    port: parseInt(hostPort)
                })
                if (containerResponse.data) {
                    setExistingContainer(containerResponse.data)
                    setShowContainerConfirm(true)
                    setLoading(false)
                    return
                }
            } catch (err) {
                // Handle port in use by non-model container
                if (err.response?.status === 409) {
                    alert(t('components.dialogs.nvidiaNim.errors.portAlreadyInUse', { port: hostPort }))
                    setLoading(false)
                    return
                }
                // Continue if container not found
                if (err.response?.status !== 404) {
                    throw err
                }
            }

            // No container found with this port, proceed with starting new container
            await startNewContainer()
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert(t('components.dialogs.nvidiaNim.errors.containerStatus', { msg: errorData }))
            setLoading(false)
        }
    }

    const startNewContainer = async () => {
        try {
            setLoading(true)
            const tokenResponse = await axios.get('/api/v1/nvidia-nim/get-token')
            const apiKey = tokenResponse.data.access_token

            await axios.post('/api/v1/nvidia-nim/start-container', {
                imageTag,
                apiKey,
                nimRelaxMemConstraints: parseInt(nimRelaxMemConstraints),
                hostPort: parseInt(hostPort)
            })

            // Start polling for container status
            const interval = setInterval(async () => {
                try {
                    const containerResponse = await axios.post('/api/v1/nvidia-nim/get-container', {
                        imageTag,
                        port: parseInt(hostPort)
                    })
                    if (containerResponse.data) {
                        clearInterval(interval)
                        setLoading(false)
                        onComplete(containerResponse.data)
                        onClose()
                    }
                } catch (err) {
                    // Continue polling if container not found
                    if (err.response?.status !== 404) {
                        clearInterval(interval)
                        alert(t('components.dialogs.nvidiaNim.errors.containerStatus', { msg: err.message }))
                        setLoading(false)
                    }
                }
            }, 5000)

            setPollInterval(interval)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert(t('components.dialogs.nvidiaNim.errors.containerStart', { msg: errorData }))
            setLoading(false)
        }
    }

    const handleUseExistingContainer = async () => {
        try {
            setLoading(true)
            // Start polling for container status
            const interval = setInterval(async () => {
                try {
                    const containerResponse = await axios.post('/api/v1/nvidia-nim/get-container', {
                        imageTag,
                        port: parseInt(hostPort)
                    })
                    if (containerResponse.data) {
                        clearInterval(interval)
                        setLoading(false)
                        onComplete(containerResponse.data)
                        onClose()
                    }
                } catch (err) {
                    // Continue polling if container not found
                    if (err.response?.status !== 404) {
                        clearInterval(interval)
                        alert(t('components.dialogs.nvidiaNim.errors.containerStatus', { msg: err.message }))
                        setLoading(false)
                    }
                }
            }, 5000)

            setPollInterval(interval)
        } catch (err) {
            let errorData = err.message
            if (typeof err === 'string') {
                errorData = err
            } else if (err.response?.data) {
                errorData = err.response.data.message
            }
            alert(t('components.dialogs.nvidiaNim.errors.containerStatus', { msg: errorData }))
            setLoading(false)
        }
    }

    const handleNext = () => {
        if (activeStep === 1 && !imageTag) {
            alert(t('components.dialogs.nvidiaNim.errors.enterImageTag'))
            return
        }

        if (activeStep === 2) {
            const port = parseInt(hostPort)
            if (isNaN(port) || port < 1 || port > 65535) {
                alert(t('components.dialogs.nvidiaNim.errors.invalidPort'))
                return
            }
        }

        switch (activeStep) {
            case 0:
                preload()
                break
            case 1:
                handlePullImage()
                break
            case 2:
                handleStartContainer()
                break
            default:
                setActiveStep((prev) => prev + 1)
        }
    }

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollInterval) {
                clearInterval(pollInterval)
            }
        }
    }, [pollInterval])

    // clear state on close
    useEffect(() => {
        if (!open) {
            setActiveStep(0)
            setLoading(false)
            setImageTag('')
        }
    }, [open])

    const component = open ? (
        <>
            <Dialog open={open}>
                <DialogTitle>{t('components.dialogs.nvidiaNim.title')}</DialogTitle>
                <DialogContent>
                    <Stepper activeStep={activeStep}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{t(label)}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {activeStep === 0 && (
                        <div style={{ marginTop: 20 }}>
                            <p style={{ marginBottom: 20 }}>{t('components.dialogs.nvidiaNim.steps.download.msg')}</p>
                            {loading && <CircularProgress />}
                        </div>
                    )}

                    {activeStep === 1 && (
                        <div>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>{t('common.labels.model')}</InputLabel>
                                <Select label={t('common.labels.model')} value={imageTag} onChange={(e) => setImageTag(e.target.value)}>
                                    {Object.entries(modelOptions).map(([value, { label }]) => (
                                        <MenuItem key={value} value={value}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {imageTag && (
                                <Button
                                    variant='text'
                                    size='small'
                                    sx={{ mt: 1 }}
                                    onClick={() => window.open(modelOptions[imageTag].licenseUrl, '_blank')}
                                >
                                    {t('components.dialogs.nvidiaNim.actions.viewLicense')}
                                </Button>
                            )}
                            {loading && (
                                <div>
                                    <div style={{ marginBottom: 20 }} />
                                    <CircularProgress />
                                    <p>{t('components.dialogs.nvidiaNim.steps.pull.pulling')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeStep === 2 && (
                        <div>
                            {loading ? (
                                <>
                                    <div style={{ marginBottom: 20 }} />
                                    <CircularProgress />
                                    <p>{t('components.dialogs.nvidiaNim.steps.start.starting')}</p>
                                </>
                            ) : (
                                <>
                                    <FormControl fullWidth sx={{ mt: 2 }}>
                                        <InputLabel>{t('components.dialogs.nvidiaNim.steps.start.label')}</InputLabel>
                                        <Select
                                            label={t('components.dialogs.nvidiaNim.steps.start.label')}
                                            value={nimRelaxMemConstraints}
                                            onChange={(e) => setNimRelaxMemConstraints(e.target.value)}
                                        >
                                            <MenuItem value='1'>{t('common.actions.yes')}</MenuItem>
                                            <MenuItem value='0'>{t('common.actions.no')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        fullWidth
                                        type='number'
                                        label={t('components.dialogs.nvidiaNim.steps.start.port')}
                                        value={hostPort}
                                        onChange={(e) => setHostPort(e.target.value)}
                                        inputProps={{ min: 1, max: 65535 }}
                                        sx={{ mt: 2 }}
                                    />
                                    <p style={{ marginTop: 20 }}>{t('components.dialogs.nvidiaNim.steps.start.tooltip')}</p>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant='outline'>
                        {t('common.actions.cancel')}
                    </Button>
                    {activeStep === 0 && (
                        <Button onClick={handleNext} variant='outline' color='secondary'>
                            {t('common.actions.next')}
                        </Button>
                    )}
                    <Button
                        onClick={activeStep === 0 ? handleDownloadInstaller : handleNext}
                        disabled={loading || (activeStep === 2 && (!nimRelaxMemConstraints || !hostPort))}
                    >
                        {activeStep === 0 ? t('common.actions.download') : t('common.actions.next')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={showContainerConfirm} onClose={() => setShowContainerConfirm(false)}>
                <DialogTitle>{t('components.dialogs.nvidiaNim.exists.title')}</DialogTitle>
                <DialogContent>
                    <p>{t('components.dialogs.nvidiaNim.exists.containerAlreadyExists')}</p>
                    <div>
                        <p>
                            <Trans
                                i18nKey='components.dialogs.nvidiaNim.exists.name'
                                values={{ name: existingContainer?.name || t('components.dialogs.nvidiaNim.exists.notAvailable') }}
                                components={{
                                    strong: <strong />
                                }}
                            />
                        </p>
                        <p>
                            <Trans
                                i18nKey='components.dialogs.nvidiaNim.exists.status'
                                values={{ name: existingContainer?.status || t('components.dialogs.nvidiaNim.exists.notAvailable') }}
                                components={{
                                    strong: <strong />
                                }}
                            />
                        </p>
                    </div>
                    <p>{t('components.dialogs.nvidiaNim.exists.youCan')}</p>
                    <ul>
                        <li>{t('components.dialogs.nvidiaNim.exists.useExisting')}</li>
                        <li>{t('components.dialogs.nvidiaNim.exists.changePort')}</li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowContainerConfirm(false)
                            setExistingContainer(null)
                        }}
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button
                        onClick={() => {
                            setShowContainerConfirm(false)
                            handleUseExistingContainer()
                        }}
                    >
                        {t('components.dialogs.nvidiaNim.actions.useExisting')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    ) : null

    return createPortal(component, portalElement)
}

NvidiaNIMDialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    onComplete: PropTypes.func
}

export default NvidiaNIMDialog
