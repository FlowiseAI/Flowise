import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'
import { v4 as uuidv4 } from 'uuid'

import { Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, OutlinedInput } from '@mui/material'

import { StyledButton } from 'ui-component/button/StyledButton'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import { Dropdown } from 'ui-component/dropdown/Dropdown'
import { MultiDropdown } from 'ui-component/dropdown/MultiDropdown'
import CredentialInputHandler from 'views/canvas/CredentialInputHandler'

// Icons
import { IconX } from '@tabler/icons'

// API
import assistantsApi from 'api/assistants'

// Hooks
import useConfirm from 'hooks/useConfirm'
import useApi from 'hooks/useApi'

// utils
import useNotifier from 'utils/useNotifier'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'

const assistantAvailableModels = [
    {
        label: 'gpt-4',
        name: 'gpt-4'
    },
    {
        label: 'gpt-4-1106-preview',
        name: 'gpt-4-1106-preview'
    },
    {
        label: 'gpt-4-vision-preview',
        name: 'gpt-4-vision-preview'
    },
    {
        label: 'gpt-4-0613',
        name: 'gpt-4-0613'
    },
    {
        label: 'gpt-4-32k',
        name: 'gpt-4-32k'
    },
    {
        label: 'gpt-4-32k-0613',
        name: 'gpt-4-32k-0613'
    },
    {
        label: 'gpt-3.5-turbo',
        name: 'gpt-3.5-turbo'
    },
    {
        label: 'gpt-3.5-turbo-1106',
        name: 'gpt-3.5-turbo-1106'
    },
    {
        label: 'gpt-3.5-turbo-0613',
        name: 'gpt-3.5-turbo-0613'
    },
    {
        label: 'gpt-3.5-turbo-16k',
        name: 'gpt-3.5-turbo-16k'
    },
    {
        label: 'gpt-3.5-turbo-16k-0613',
        name: 'gpt-3.5-turbo-16k-0613'
    }
]

const AssistantDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificAssistantApi = useApi(assistantsApi.getSpecificAssistant)
    const getAssistantObjApi = useApi(assistantsApi.getAssistantObj)

    const [assistantId, setAssistantId] = useState('')
    const [openAIAssistantId, setOpenAIAssistantId] = useState('')
    const [assistantName, setAssistantName] = useState('')
    const [assistantDesc, setAssistantDesc] = useState('')
    const [assistantIcon, setAssistantIcon] = useState(`https://api.dicebear.com/7.x/bottts/svg?seed=${uuidv4()}`)
    const [assistantModel, setAssistantModel] = useState('')
    const [assistantCredential, setAssistantCredential] = useState('')
    const [assistantInstructions, setAssistantInstructions] = useState('')
    const [assistantTools, setAssistantTools] = useState(['code_interpreter', 'retrieval'])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (getSpecificAssistantApi.data) {
            setAssistantId(getSpecificAssistantApi.data.id)
            setAssistantIcon(getSpecificAssistantApi.data.iconSrc)
            setAssistantCredential(getSpecificAssistantApi.data.credential)

            const assistantDetails = JSON.parse(getSpecificAssistantApi.data.details)
            setOpenAIAssistantId(assistantDetails.id)
            setAssistantName(assistantDetails.name)
            setAssistantDesc(assistantDetails.description)
            setAssistantModel(assistantDetails.model)
            setAssistantInstructions(assistantDetails.instructions)
            setAssistantTools(assistantDetails.tools ?? [])
        }
    }, [getSpecificAssistantApi.data])

    useEffect(() => {
        if (getAssistantObjApi.data) {
            setOpenAIAssistantId(getAssistantObjApi.data.id)
            setAssistantName(getAssistantObjApi.data.name)
            setAssistantDesc(getAssistantObjApi.data.description)
            setAssistantModel(getAssistantObjApi.data.model)
            setAssistantInstructions(getAssistantObjApi.data.instructions)

            let tools = []
            if (getAssistantObjApi.data.tools && getAssistantObjApi.data.tools.length) {
                for (const tool of getAssistantObjApi.data.tools) {
                    tools.push(tool.type)
                }
            }
            setAssistantTools(tools)
        }
    }, [getAssistantObjApi.data])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When assistant dialog is opened from Assistants dashboard
            setAssistantId(dialogProps.data.id)
            setAssistantIcon(dialogProps.data.iconSrc)
            setAssistantCredential(dialogProps.data.credential)

            const assistantDetails = JSON.parse(dialogProps.data.details)
            setOpenAIAssistantId(assistantDetails.id)
            setAssistantName(assistantDetails.name)
            setAssistantDesc(assistantDetails.description)
            setAssistantModel(assistantDetails.model)
            setAssistantInstructions(assistantDetails.instructions)
            setAssistantTools(assistantDetails.tools ?? [])
        } else if (dialogProps.type === 'EDIT' && dialogProps.assistantId) {
            // When assistant dialog is opened from OpenAIAssistant node in canvas
            getSpecificAssistantApi.request(dialogProps.assistantId)
        } else if (dialogProps.type === 'ADD' && dialogProps.selectedOpenAIAssistantId && dialogProps.credential) {
            // When assistant dialog is to add new assistant from existing
            setAssistantId('')
            setAssistantIcon(`https://api.dicebear.com/7.x/bottts/svg?seed=${uuidv4()}`)
            setAssistantCredential(dialogProps.credential)

            getAssistantObjApi.request(dialogProps.selectedOpenAIAssistantId, dialogProps.credential)
        } else if (dialogProps.type === 'ADD' && !dialogProps.selectedOpenAIAssistantId) {
            // When assistant dialog is to add a blank new assistant
            setAssistantId('')
            setAssistantIcon(`https://api.dicebear.com/7.x/bottts/svg?seed=${uuidv4()}`)
            setAssistantCredential('')

            setOpenAIAssistantId('')
            setAssistantName('')
            setAssistantDesc('')
            setAssistantModel('')
            setAssistantInstructions('')
            setAssistantTools(['code_interpreter', 'retrieval'])
        }

        return () => {
            setAssistantId('')
            setAssistantIcon(`https://api.dicebear.com/7.x/bottts/svg?seed=${uuidv4()}`)
            setAssistantCredential('')

            setOpenAIAssistantId('')
            setAssistantName('')
            setAssistantDesc('')
            setAssistantModel('')
            setAssistantInstructions('')
            setAssistantTools(['code_interpreter', 'retrieval'])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const addNewAssistant = async () => {
        try {
            const assistantDetails = {
                id: openAIAssistantId,
                name: assistantName,
                description: assistantDesc,
                model: assistantModel,
                instructions: assistantInstructions,
                tools: assistantTools
            }
            const obj = {
                details: JSON.stringify(assistantDetails),
                iconSrc: assistantIcon,
                credential: assistantCredential
            }

            const createResp = await assistantsApi.createNewAssistant(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Assistant added',
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
                onConfirm(createResp.data.id)
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to add new Assistant: ${errorData}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    const saveAssistant = async () => {
        try {
            const assistantDetails = {
                name: assistantName,
                description: assistantDesc,
                model: assistantModel,
                instructions: assistantInstructions,
                tools: assistantTools
            }
            const obj = {
                details: JSON.stringify(assistantDetails),
                iconSrc: assistantIcon,
                credential: assistantCredential
            }
            const saveResp = await assistantsApi.updateAssistant(assistantId, obj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Assistant saved',
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
                onConfirm(saveResp.data.id)
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save Assistant: ${errorData}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    const deleteAssistant = async () => {
        const confirmPayload = {
            title: `Delete Assistant`,
            description: `Delete Assistant ${assistantName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const delResp = await assistantsApi.deleteAssistant(assistantId)
                if (delResp.data) {
                    enqueueSnackbar({
                        message: 'Assistant deleted',
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
                    onConfirm()
                }
            } catch (error) {
                const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
                enqueueSnackbar({
                    message: `Failed to delete Assistant: ${errorData}`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onCancel()
            }
        }
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
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Assistant Name
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'The name of the assistant. The maximum length is 256 characters.'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='assistantName'
                        type='string'
                        fullWidth
                        placeholder='My New Assistant'
                        value={assistantName}
                        name='assistantName'
                        onChange={(e) => setAssistantName(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Assistant Description
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'The description of the assistant. The maximum length is 512 characters.'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='assistantDesc'
                        type='string'
                        fullWidth
                        placeholder='Description of what the Assistant does'
                        multiline={true}
                        rows={3}
                        value={assistantDesc}
                        name='assistantDesc'
                        onChange={(e) => setAssistantDesc(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>Assistant Icon Src</Typography>
                    </Stack>
                    <div
                        style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            backgroundColor: 'white'
                        }}
                    >
                        <img
                            style={{
                                width: '100%',
                                height: '100%',
                                padding: 5,
                                borderRadius: '50%',
                                objectFit: 'contain'
                            }}
                            alt={assistantName}
                            src={assistantIcon}
                        />
                    </div>
                    <OutlinedInput
                        id='assistantIcon'
                        type='string'
                        fullWidth
                        placeholder={`https://api.dicebear.com/7.x/bottts/svg?seed=${uuidv4()}`}
                        value={assistantIcon}
                        name='assistantIcon'
                        onChange={(e) => setAssistantIcon(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Assistant Model
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                    </Stack>
                    <Dropdown
                        key={assistantModel}
                        name={assistantModel}
                        options={assistantAvailableModels}
                        onSelect={(newValue) => setAssistantModel(newValue)}
                        value={assistantModel ?? 'choose an option'}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            OpenAI Credential
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                    </Stack>
                    <CredentialInputHandler
                        key={assistantCredential}
                        data={assistantCredential ? { credential: assistantCredential } : {}}
                        inputParam={{
                            label: 'Connect Credential',
                            name: 'credential',
                            type: 'credential',
                            credentialNames: ['openAIApi']
                        }}
                        onSelect={(newValue) => setAssistantCredential(newValue)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Assistant Instruction
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'The system instructions that the assistant uses. The maximum length is 32768 characters.'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='assistantInstructions'
                        type='string'
                        fullWidth
                        placeholder='You are a personal math tutor. When asked a question, write and run Python code to answer the question.'
                        multiline={true}
                        rows={3}
                        value={assistantInstructions}
                        name='assistantInstructions'
                        onChange={(e) => setAssistantInstructions(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Assistant Tools
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title='A list of tool enabled on the assistant. There can be a maximum of 128 tools per assistant.'
                            />
                        </Typography>
                    </Stack>
                    <MultiDropdown
                        key={JSON.stringify(assistantTools)}
                        name={JSON.stringify(assistantTools)}
                        options={[
                            {
                                label: 'Code Interpreter',
                                name: 'code_interpreter'
                            },
                            {
                                label: 'Retrieval',
                                name: 'retrieval'
                            }
                        ]}
                        onSelect={(newValue) => (newValue ? setAssistantTools(JSON.parse(newValue)) : setAssistantTools([]))}
                        value={assistantTools ?? 'choose an option'}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='error' variant='contained' onClick={() => deleteAssistant()}>
                        Delete
                    </StyledButton>
                )}
                <StyledButton
                    disabled={!(assistantModel && assistantCredential)}
                    variant='contained'
                    onClick={() => (dialogProps.type === 'ADD' ? addNewAssistant() : saveAssistant())}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AssistantDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AssistantDialog
