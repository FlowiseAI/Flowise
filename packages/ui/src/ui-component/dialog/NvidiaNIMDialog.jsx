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

const NvidiaNIMDialog = ({ open, onClose, onComplete }) => {
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

    const steps = ['Download Installer', 'Pull Image', 'Start Container']

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
            alert('Failed to download installer: ' + errorData)
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
            alert('Failed to preload: ' + errorData)
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
                        alert('Failed to check image status: ' + err.message)
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
            alert('Failed to pull image: ' + errorData)
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
                    alert(`Port ${hostPort} is already in use by another container. Please choose a different port.`)
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
            alert('Failed to check container status: ' + errorData)
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
                        alert('Failed to check container status: ' + err.message)
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
            alert('Failed to start container: ' + errorData)
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
                        alert('Failed to check container status: ' + err.message)
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
            alert('Failed to check container status: ' + errorData)
            setLoading(false)
        }
    }

    const handleNext = () => {
        if (activeStep === 1 && !imageTag) {
            alert('Please enter an image tag')
            return
        }

        if (activeStep === 2) {
            const port = parseInt(hostPort)
            if (isNaN(port) || port < 1 || port > 65535) {
                alert('Please enter a valid port number between 1 and 65535')
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
                <DialogTitle>NIM Setup</DialogTitle>
                <DialogContent>
                    <Stepper activeStep={activeStep}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {activeStep === 0 && (
                        <div style={{ marginTop: 20 }}>
                            <p style={{ marginBottom: 20 }}>
                                Would you like to download the NIM installer? Click Next if it has been installed
                            </p>
                            {loading && <CircularProgress />}
                        </div>
                    )}

                    {activeStep === 1 && (
                        <div>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Model</InputLabel>
                                <Select label='Model' value={imageTag} onChange={(e) => setImageTag(e.target.value)}>
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
                                    View License
                                </Button>
                            )}
                            {loading && (
                                <div>
                                    <div style={{ marginBottom: 20 }} />
                                    <CircularProgress />
                                    <p>Pulling image...</p>
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
                                    <p>Starting container...</p>
                                </>
                            ) : (
                                <>
                                    <FormControl fullWidth sx={{ mt: 2 }}>
                                        <InputLabel>Relax Memory Constraints</InputLabel>
                                        <Select
                                            label='Relax Memory Constraints'
                                            value={nimRelaxMemConstraints}
                                            onChange={(e) => setNimRelaxMemConstraints(e.target.value)}
                                        >
                                            <MenuItem value='1'>Yes</MenuItem>
                                            <MenuItem value='0'>No</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        fullWidth
                                        type='number'
                                        label='Host Port'
                                        value={hostPort}
                                        onChange={(e) => setHostPort(e.target.value)}
                                        inputProps={{ min: 1, max: 65535 }}
                                        sx={{ mt: 2 }}
                                    />
                                    <p style={{ marginTop: 20 }}>Click Next to start the container.</p>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant='outline'>
                        Cancel
                    </Button>
                    {activeStep === 0 && (
                        <Button onClick={handleNext} variant='outline' color='secondary'>
                            Next
                        </Button>
                    )}
                    <Button
                        onClick={activeStep === 0 ? handleDownloadInstaller : handleNext}
                        disabled={loading || (activeStep === 2 && (!nimRelaxMemConstraints || !hostPort))}
                    >
                        {activeStep === 0 ? 'Download' : 'Next'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={showContainerConfirm} onClose={() => setShowContainerConfirm(false)}>
                <DialogTitle>Container Already Exists</DialogTitle>
                <DialogContent>
                    <p>A container for this image already exists:</p>
                    <div>
                        <p>
                            <strong>Name:</strong> {existingContainer?.name || 'N/A'}
                        </p>
                        <p>
                            <strong>Status:</strong> {existingContainer?.status || 'N/A'}
                        </p>
                    </div>
                    <p>You can:</p>
                    <ul>
                        <li>Use the existing container (recommended)</li>
                        <li>Change the port and try again</li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowContainerConfirm(false)
                            setExistingContainer(null)
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            setShowContainerConfirm(false)
                            handleUseExistingContainer()
                        }}
                    >
                        Use Existing
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
