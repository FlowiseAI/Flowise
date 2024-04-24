import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { v4 as uuidv4 } from 'uuid'

import { Box, Typography, Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, Stack, OutlinedInput } from '@mui/material'

import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { File } from '@/ui-component/file/File'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import DeleteConfirmDialog from './DeleteConfirmDialog'

// Icons
import { IconX } from '@tabler/icons'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

const assistantAvailableModels = [
    {
        label: 'gpt-4-turbo-preview',
        name: 'gpt-4-turbo-preview'
    },
    {
        label: 'gpt-4-1106-preview',
        name: 'gpt-4-1106-preview'
    },
    {
        label: 'gpt-4-0613',
        name: 'gpt-4-0613'
    },
    {
        label: 'gpt-4',
        name: 'gpt-4'
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

const AssistantDialog = ({ show, dialogProps, onCancel, onConfirm, setError }) => {
    const portalElement = document.getElementById('portal')
    useNotifier()
    const dispatch = useDispatch()
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
    const [assistantFiles, setAssistantFiles] = useState([])
    const [uploadAssistantFiles, setUploadAssistantFiles] = useState('')
    const [loading, setLoading] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteDialogProps, setDeleteDialogProps] = useState({})

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
            setAssistantFiles(assistantDetails.files ?? [])
        }
    }, [getSpecificAssistantApi.data])

    useEffect(() => {
        if (getAssistantObjApi.data) {
            syncData(getAssistantObjApi.data)
        }
    }, [getAssistantObjApi.data])

    useEffect(() => {
        if (getAssistantObjApi.error) {
            syncData(getAssistantObjApi.error)
        }
    }, [getAssistantObjApi.error])

    useEffect(() => {
        if (getSpecificAssistantApi.error) {
            syncData(getSpecificAssistantApi.error)
        }
    }, [getSpecificAssistantApi.error])

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
            setAssistantFiles(assistantDetails.files ?? [])
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
            setUploadAssistantFiles('')
            setAssistantFiles([])
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
            setUploadAssistantFiles('')
            setAssistantFiles([])
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const syncData = (data) => {
        setOpenAIAssistantId(data.id)
        setAssistantName(data.name)
        setAssistantDesc(data.description)
        setAssistantModel(data.model)
        setAssistantInstructions(data.instructions)
        setAssistantFiles(data.files ?? [])

        let tools = []
        if (data.tools && data.tools.length) {
            for (const tool of data.tools) {
                tools.push(tool.type)
            }
        }
        setAssistantTools(tools)
    }

    const addNewAssistant = async () => {
        setLoading(true)
        try {
            const assistantDetails = {
                id: openAIAssistantId,
                name: assistantName,
                description: assistantDesc,
                model: assistantModel,
                instructions: assistantInstructions,
                tools: assistantTools,
                files: assistantFiles,
                uploadFiles: uploadAssistantFiles
            }
            const obj = {
                details: JSON.stringify(assistantDetails),
                iconSrc: assistantIcon,
                credential: assistantCredential
            }

            const createResp = await assistantsApi.createNewAssistant(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'Новый ассистент добавлен',
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
            setLoading(false)
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Ошибка добавления нового ассистента: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            setLoading(false)
            onCancel()
        }
    }

    const saveAssistant = async () => {
        setLoading(true)
        try {
            const assistantDetails = {
                name: assistantName,
                description: assistantDesc,
                model: assistantModel,
                instructions: assistantInstructions,
                tools: assistantTools,
                files: assistantFiles,
                uploadFiles: uploadAssistantFiles
            }
            const obj = {
                details: JSON.stringify(assistantDetails),
                iconSrc: assistantIcon,
                credential: assistantCredential
            }
            const saveResp = await assistantsApi.updateAssistant(assistantId, obj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Ассистент добавлен',
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
            setLoading(false)
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Ошибка сохранения ассистента: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            setLoading(false)
            onCancel()
        }
    }

    const onSyncClick = async () => {
        setLoading(true)
        try {
            const getResp = await assistantsApi.getAssistantObj(openAIAssistantId, assistantCredential)
            if (getResp.data) {
                syncData(getResp.data)
                enqueueSnackbar({
                    message: 'Ассистент успешно синхронизирован!',
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
            }
            setLoading(false)
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Не удалось синхронизировать Ассистента: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            setLoading(false)
        }
    }

    const onDeleteClick = () => {
        setDeleteDialogProps({
            title: `Удалить ассистента`,
            description: `Удалить ассистента ${assistantName}?`,
            cancelButtonName: 'Отмена'
        })
        setDeleteDialogOpen(true)
    }

    const deleteAssistant = async (isDeleteBoth) => {
        setDeleteDialogOpen(false)
        try {
            const delResp = await assistantsApi.deleteAssistant(assistantId, isDeleteBoth)
            if (delResp.data) {
                enqueueSnackbar({
                    message: 'Ассистент удален',
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
            setError(error)
            enqueueSnackbar({
                message: `Ошибка удаления ассистента: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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

    const onFileDeleteClick = async (fileId) => {
        setAssistantFiles(assistantFiles.filter((file) => file.id !== fileId))
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
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', position: 'relative', px: 3, pb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>Имя ассистента</Typography>
                            <TooltipWithParser title={'Имя ассистента. Максимум 256 символов.'} />
                        </Stack>
                        <OutlinedInput
                            id='assistantName'
                            type='string'
                            fullWidth
                            placeholder='Мой ассистент'
                            value={assistantName}
                            name='assistantName'
                            onChange={(e) => setAssistantName(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>Описание ассистента</Typography>
                            <TooltipWithParser title={'Описание ассистента. Максимум 512 символов.'} />
                        </Stack>
                        <OutlinedInput
                            id='assistantDesc'
                            type='string'
                            fullWidth
                            placeholder='Описание что делает ассистент'
                            multiline={true}
                            rows={3}
                            value={assistantDesc}
                            name='assistantDesc'
                            onChange={(e) => setAssistantDesc(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>Иконка ассистента Src</Typography>
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
                    <Box>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>
                                Модель ассистента
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
                    <Box>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>
                                Учетные данные OpenAI
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
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>Инструкция ассистента</Typography>
                            <TooltipWithParser title={'Инструкция о том, как работать с ним. Максимум 32768 символов.'} />
                        </Stack>
                        <OutlinedInput
                            id='assistantInstructions'
                            type='string'
                            fullWidth
                            placeholder='Ты проффесиональный математический помошник. Когда задают вопрос, напиши ответ на языке Pytohn.'
                            multiline={true}
                            rows={3}
                            value={assistantInstructions}
                            name='assistantInstructions'
                            onChange={(e) => setAssistantInstructions(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>Assistant Tools</Typography>
                            <TooltipWithParser title='Список инструментов, включенных в ассистента. На одного ассистента может быть максимум 128 инструментов.' />
                        </Stack>
                        <MultiDropdown
                            key={JSON.stringify(assistantTools)}
                            name={JSON.stringify(assistantTools)}
                            options={[
                                {
                                    label: 'Интерпретатор кода',
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
                    <Box>
                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                            <Typography variant='overline'>Файлы знаний</Typography>
                            <TooltipWithParser title='Разрешить ассистентe использовать содержимое загруженных файлов для поиска и интерпретатора кода. МАКС: 20 файлов' />
                        </Stack>
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            {assistantFiles.map((file, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        width: 'max-content',
                                        height: 'max-content',
                                        borderRadius: 15,
                                        background: 'rgb(254,252,191)',
                                        paddingLeft: 15,
                                        paddingRight: 15,
                                        paddingTop: 5,
                                        paddingBottom: 5,
                                        marginRight: 10
                                    }}
                                >
                                    <span style={{ color: 'rgb(116,66,16)', marginRight: 10 }}>{file.filename}</span>
                                    <IconButton sx={{ height: 15, width: 15, p: 0 }} onClick={() => onFileDeleteClick(file.id)}>
                                        <IconX />
                                    </IconButton>
                                </div>
                            ))}
                        </div>
                        <File
                            key={uploadAssistantFiles}
                            fileType='*'
                            onChange={(newValue) => setUploadAssistantFiles(newValue)}
                            value={uploadAssistantFiles ?? 'Выберите файлы для загрузки'}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='secondary' variant='contained' onClick={() => onSyncClick()}>
                        Синхронизировать
                    </StyledButton>
                )}
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='error' variant='contained' onClick={() => onDeleteClick()}>
                        Удалить
                    </StyledButton>
                )}
                <StyledButton
                    disabled={!(assistantModel && assistantCredential)}
                    variant='contained'
                    onClick={() => (dialogProps.type === 'ADD' ? addNewAssistant() : saveAssistant())}
                >
                    Добавить
                </StyledButton>
            </DialogActions>
            <DeleteConfirmDialog
                show={deleteDialogOpen}
                dialogProps={deleteDialogProps}
                onCancel={() => setDeleteDialogOpen(false)}
                onDelete={() => deleteAssistant()}
                onDeleteBoth={() => deleteAssistant(true)}
            />
            {loading && <BackdropLoader open={loading} />}
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
