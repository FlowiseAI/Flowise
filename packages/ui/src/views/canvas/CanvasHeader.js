import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useRef, useState } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase, Typography, Stack, TextField } from '@mui/material'

// icons
import { IconSettings, IconChevronLeft, IconDeviceFloppy, IconPencil, IconCheck, IconX, IconCode } from '@tabler/icons'

// project imports
import Settings from 'views/settings'
import SaveChatflowDialog from 'ui-component/dialog/SaveChatflowDialog'
import APICodeDialog from 'views/chatflows/APICodeDialog'
import AnalyseFlowDialog from 'ui-component/dialog/AnalyseFlowDialog'

// API
import chatflowsApi from 'api/chatflows'

// Hooks
import useApi from 'hooks/useApi'

// utils
import { generateExportFlowData } from 'utils/genericHelper'
import { uiBaseURL } from 'store/constant'
import { SET_CHATFLOW } from 'store/actions'

// ==============================|| CANVAS HEADER ||============================== //

const CanvasHeader = ({ chatflow, handleSaveFlow, handleDeleteFlow, handleLoadFlow }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const flowNameRef = useRef()
    const settingsRef = useRef()

    const [isEditingFlowName, setEditingFlowName] = useState(null)
    const [flowName, setFlowName] = useState('')
    const [isSettingsOpen, setSettingsOpen] = useState(false)
    const [flowDialogOpen, setFlowDialogOpen] = useState(false)
    const [apiDialogOpen, setAPIDialogOpen] = useState(false)
    const [apiDialogProps, setAPIDialogProps] = useState({})
    const [analyseDialogOpen, setAnalyseDialogOpen] = useState(false)
    const [analyseDialogProps, setAnalyseDialogProps] = useState({})

    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const canvas = useSelector((state) => state.canvas)

    const onSettingsItemClick = (setting) => {
        setSettingsOpen(false)

        if (setting === 'deleteChatflow') {
            handleDeleteFlow()
        } else if (setting === 'analyseChatflow') {
            setAnalyseDialogProps({
                title: 'Analyse Chatflow',
                chatflow: chatflow
            })
            setAnalyseDialogOpen(true)
        } else if (setting === 'duplicateChatflow') {
            try {
                localStorage.setItem('duplicatedFlowData', chatflow.flowData)
                window.open(`${uiBaseURL}/canvas`, '_blank')
            } catch (e) {
                console.error(e)
            }
        } else if (setting === 'exportChatflow') {
            try {
                const flowData = JSON.parse(chatflow.flowData)
                let dataStr = JSON.stringify(generateExportFlowData(flowData))
                let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

                let exportFileDefaultName = `${chatflow.name} Chatflow.json`

                let linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportFileDefaultName)
                linkElement.click()
            } catch (e) {
                console.error(e)
            }
        }
    }

    const onUploadFile = (file) => {
        setSettingsOpen(false)
        handleLoadFlow(file)
    }

    const submitFlowName = () => {
        if (chatflow.id) {
            const updateBody = {
                name: flowNameRef.current.value
            }
            updateChatflowApi.request(chatflow.id, updateBody)
        }
    }

    const onAPIDialogClick = () => {
        // If file type is file, isFormDataRequired = true
        let isFormDataRequired = false
        try {
            const flowData = JSON.parse(chatflow.flowData)
            const nodes = flowData.nodes
            for (const node of nodes) {
                if (node.data.inputParams.find((param) => param.type === 'file')) {
                    isFormDataRequired = true
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        // If sessionId memory, isSessionMemory = true
        let isSessionMemory = false
        try {
            const flowData = JSON.parse(chatflow.flowData)
            const nodes = flowData.nodes
            for (const node of nodes) {
                if (node.data.inputParams.find((param) => param.name === 'sessionId')) {
                    isSessionMemory = true
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setAPIDialogProps({
            title: 'Embed in website or use as API',
            chatflowid: chatflow.id,
            chatflowApiKeyId: chatflow.apikeyid,
            isFormDataRequired,
            isSessionMemory
        })
        setAPIDialogOpen(true)
    }

    const onSaveChatflowClick = () => {
        if (chatflow.id) handleSaveFlow(flowName)
        else setFlowDialogOpen(true)
    }

    const onConfirmSaveName = (flowName) => {
        setFlowDialogOpen(false)
        handleSaveFlow(flowName)
    }

    useEffect(() => {
        if (updateChatflowApi.data) {
            setFlowName(updateChatflowApi.data.name)
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
        }
        setEditingFlowName(false)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data])

    useEffect(() => {
        if (chatflow) {
            setFlowName(chatflow.name)
        }
    }, [chatflow])

    return (
        <>
            <Box>
                <ButtonBase title='Back' sx={{ borderRadius: '50%' }}>
                    <Avatar
                        variant='rounded'
                        sx={{
                            ...theme.typography.commonAvatar,
                            ...theme.typography.mediumAvatar,
                            transition: 'all .2s ease-in-out',
                            background: theme.palette.secondary.light,
                            color: theme.palette.secondary.dark,
                            '&:hover': {
                                background: theme.palette.secondary.dark,
                                color: theme.palette.secondary.light
                            }
                        }}
                        color='inherit'
                        onClick={() =>
                            window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/', { replace: true })
                        }
                    >
                        <IconChevronLeft stroke={1.5} size='1.3rem' />
                    </Avatar>
                </ButtonBase>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                {!isEditingFlowName && (
                    <Stack flexDirection='row'>
                        <Typography
                            sx={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                ml: 2
                            }}
                        >
                            {canvas.isDirty && <strong style={{ color: theme.palette.orange.main }}>*</strong>} {flowName}
                        </Typography>
                        {chatflow?.id && (
                            <ButtonBase title='Edit Name' sx={{ borderRadius: '50%' }}>
                                <Avatar
                                    variant='rounded'
                                    sx={{
                                        ...theme.typography.commonAvatar,
                                        ...theme.typography.mediumAvatar,
                                        transition: 'all .2s ease-in-out',
                                        ml: 1,
                                        background: theme.palette.secondary.light,
                                        color: theme.palette.secondary.dark,
                                        '&:hover': {
                                            background: theme.palette.secondary.dark,
                                            color: theme.palette.secondary.light
                                        }
                                    }}
                                    color='inherit'
                                    onClick={() => setEditingFlowName(true)}
                                >
                                    <IconPencil stroke={1.5} size='1.3rem' />
                                </Avatar>
                            </ButtonBase>
                        )}
                    </Stack>
                )}
                {isEditingFlowName && (
                    <Stack flexDirection='row'>
                        <TextField
                            size='small'
                            inputRef={flowNameRef}
                            sx={{
                                width: '50%',
                                ml: 2
                            }}
                            defaultValue={flowName}
                        />
                        <ButtonBase title='Save Name' sx={{ borderRadius: '50%' }}>
                            <Avatar
                                variant='rounded'
                                sx={{
                                    ...theme.typography.commonAvatar,
                                    ...theme.typography.mediumAvatar,
                                    transition: 'all .2s ease-in-out',
                                    background: theme.palette.success.light,
                                    color: theme.palette.success.dark,
                                    ml: 1,
                                    '&:hover': {
                                        background: theme.palette.success.dark,
                                        color: theme.palette.success.light
                                    }
                                }}
                                color='inherit'
                                onClick={submitFlowName}
                            >
                                <IconCheck stroke={1.5} size='1.3rem' />
                            </Avatar>
                        </ButtonBase>
                        <ButtonBase title='Cancel' sx={{ borderRadius: '50%' }}>
                            <Avatar
                                variant='rounded'
                                sx={{
                                    ...theme.typography.commonAvatar,
                                    ...theme.typography.mediumAvatar,
                                    transition: 'all .2s ease-in-out',
                                    background: theme.palette.error.light,
                                    color: theme.palette.error.dark,
                                    ml: 1,
                                    '&:hover': {
                                        background: theme.palette.error.dark,
                                        color: theme.palette.error.light
                                    }
                                }}
                                color='inherit'
                                onClick={() => setEditingFlowName(false)}
                            >
                                <IconX stroke={1.5} size='1.3rem' />
                            </Avatar>
                        </ButtonBase>
                    </Stack>
                )}
            </Box>
            <Box>
                {chatflow?.id && (
                    <ButtonBase title='API Endpoint' sx={{ borderRadius: '50%', mr: 2 }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.canvasHeader.deployLight,
                                color: theme.palette.canvasHeader.deployDark,
                                '&:hover': {
                                    background: theme.palette.canvasHeader.deployDark,
                                    color: theme.palette.canvasHeader.deployLight
                                }
                            }}
                            color='inherit'
                            onClick={onAPIDialogClick}
                        >
                            <IconCode stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                )}
                <ButtonBase title='Save Chatflow' sx={{ borderRadius: '50%', mr: 2 }}>
                    <Avatar
                        variant='rounded'
                        sx={{
                            ...theme.typography.commonAvatar,
                            ...theme.typography.mediumAvatar,
                            transition: 'all .2s ease-in-out',
                            background: theme.palette.canvasHeader.saveLight,
                            color: theme.palette.canvasHeader.saveDark,
                            '&:hover': {
                                background: theme.palette.canvasHeader.saveDark,
                                color: theme.palette.canvasHeader.saveLight
                            }
                        }}
                        color='inherit'
                        onClick={onSaveChatflowClick}
                    >
                        <IconDeviceFloppy stroke={1.5} size='1.3rem' />
                    </Avatar>
                </ButtonBase>
                <ButtonBase ref={settingsRef} title='Settings' sx={{ borderRadius: '50%' }}>
                    <Avatar
                        variant='rounded'
                        sx={{
                            ...theme.typography.commonAvatar,
                            ...theme.typography.mediumAvatar,
                            transition: 'all .2s ease-in-out',
                            background: theme.palette.canvasHeader.settingsLight,
                            color: theme.palette.canvasHeader.settingsDark,
                            '&:hover': {
                                background: theme.palette.canvasHeader.settingsDark,
                                color: theme.palette.canvasHeader.settingsLight
                            }
                        }}
                        onClick={() => setSettingsOpen(!isSettingsOpen)}
                    >
                        <IconSettings stroke={1.5} size='1.3rem' />
                    </Avatar>
                </ButtonBase>
            </Box>
            <Settings
                chatflow={chatflow}
                isSettingsOpen={isSettingsOpen}
                anchorEl={settingsRef.current}
                onClose={() => setSettingsOpen(false)}
                onSettingsItemClick={onSettingsItemClick}
                onUploadFile={onUploadFile}
            />
            <SaveChatflowDialog
                show={flowDialogOpen}
                dialogProps={{
                    title: `Save New Chatflow`,
                    confirmButtonName: 'Save',
                    cancelButtonName: 'Cancel'
                }}
                onCancel={() => setFlowDialogOpen(false)}
                onConfirm={onConfirmSaveName}
            />
            <APICodeDialog show={apiDialogOpen} dialogProps={apiDialogProps} onCancel={() => setAPIDialogOpen(false)} />
            <AnalyseFlowDialog show={analyseDialogOpen} dialogProps={analyseDialogProps} onCancel={() => setAnalyseDialogOpen(false)} />
        </>
    )
}

CanvasHeader.propTypes = {
    chatflow: PropTypes.object,
    handleSaveFlow: PropTypes.func,
    handleDeleteFlow: PropTypes.func,
    handleLoadFlow: PropTypes.func
}

export default CanvasHeader
