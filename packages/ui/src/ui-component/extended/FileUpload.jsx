import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import parser from 'html-react-parser'

// material-ui
import { Button, Box, Typography, FormControl, RadioGroup, FormControlLabel, Radio } from '@mui/material'
import { IconX, IconBulb } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const message = `The full contents of uploaded files will be converted to text and sent to the Agent.
<br />
Refer <a href='https://docs.flowiseai.com/using-flowise/uploads#files' target='_blank'>docs</a> for more details.`

const availableFileTypes = [
    { name: 'CSS', ext: 'text/css', extension: '.css' },
    { name: 'CSV', ext: 'text/csv', extension: '.csv' },
    { name: 'HTML', ext: 'text/html', extension: '.html' },
    { name: 'JSON', ext: 'application/json', extension: '.json' },
    { name: 'Markdown', ext: 'text/markdown', extension: '.md' },
    { name: 'YAML', ext: 'application/x-yaml', extension: '.yaml' },
    { name: 'PDF', ext: 'application/pdf', extension: '.pdf' },
    { name: 'SQL', ext: 'application/sql', extension: '.sql' },
    { name: 'Text File', ext: 'text/plain', extension: '.txt' },
    { name: 'XML', ext: 'application/xml', extension: '.xml' },
    { name: 'DOC', ext: 'application/msword', extension: '.doc' },
    { name: 'DOCX', ext: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
    { name: 'XLSX', ext: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx' },
    { name: 'PPTX', ext: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: '.pptx' }
]

const FileUpload = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [fullFileUpload, setFullFileUpload] = useState(false)
    const [allowedFileTypes, setAllowedFileTypes] = useState([])
    const [chatbotConfig, setChatbotConfig] = useState({})
    const [pdfUsage, setPdfUsage] = useState('perPage')
    const [pdfLegacyBuild, setPdfLegacyBuild] = useState(false)

    const handleChange = (value) => {
        setFullFileUpload(value)
    }

    const handleAllowedFileTypesChange = (event) => {
        const { checked, value } = event.target
        if (checked) {
            setAllowedFileTypes((prev) => [...prev, value])
        } else {
            setAllowedFileTypes((prev) => prev.filter((item) => item !== value))
        }
    }

    const handlePdfUsageChange = (event) => {
        setPdfUsage(event.target.value)
    }

    const handleLegacyBuildChange = (value) => {
        setPdfLegacyBuild(value)
    }

    const onSave = async () => {
        try {
            const value = {
                status: fullFileUpload,
                allowedUploadFileTypes: allowedFileTypes.join(','),
                pdfFile: {
                    usage: pdfUsage,
                    legacyBuild: pdfLegacyBuild
                }
            }
            chatbotConfig.fullFileUpload = value

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'File Upload Configuration Saved',
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
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to save File Upload Configuration: ${
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
        }
    }

    useEffect(() => {
        /* backward compatibility - by default, allow all */
        const allowedFileTypes = availableFileTypes.map((fileType) => fileType.ext)
        setAllowedFileTypes(allowedFileTypes)
        if (dialogProps.chatflow) {
            if (dialogProps.chatflow.chatbotConfig) {
                try {
                    let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
                    setChatbotConfig(chatbotConfig || {})
                    if (chatbotConfig.fullFileUpload) {
                        setFullFileUpload(chatbotConfig.fullFileUpload.status)
                    }
                    if (chatbotConfig.fullFileUpload?.allowedUploadFileTypes) {
                        const allowedFileTypes = chatbotConfig.fullFileUpload.allowedUploadFileTypes.split(',')
                        setAllowedFileTypes(allowedFileTypes)
                    }
                    if (chatbotConfig.fullFileUpload?.pdfFile) {
                        if (chatbotConfig.fullFileUpload.pdfFile.usage) {
                            setPdfUsage(chatbotConfig.fullFileUpload.pdfFile.usage)
                        }
                        if (chatbotConfig.fullFileUpload.pdfFile.legacyBuild !== undefined) {
                            setPdfLegacyBuild(chatbotConfig.fullFileUpload.pdfFile.legacyBuild)
                        }
                    }
                } catch (e) {
                    setChatbotConfig({})
                }
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    justifyContent: 'start',
                    gap: 3,
                    mb: 2
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 10,
                        background: '#d8f3dc',
                        width: '100%',
                        padding: 10
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}
                    >
                        <IconBulb size={30} color='#2d6a4f' />
                        <span style={{ color: '#2d6a4f', marginLeft: 10, fontWeight: 500 }}>{parser(message)}</span>
                    </div>
                </div>
                <SwitchInput label='Enable Full File Upload' onChange={handleChange} value={fullFileUpload} />
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 500, marginBottom: 1 }}>Allow Uploads of Type</Typography>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: 15,
                    padding: 10,
                    width: '100%',
                    marginBottom: '10px'
                }}
            >
                {availableFileTypes.map((fileType) => (
                    <div
                        key={fileType.ext}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'start'
                        }}
                    >
                        <input
                            type='checkbox'
                            id={fileType.ext}
                            name={fileType.ext}
                            checked={allowedFileTypes.indexOf(fileType.ext) !== -1}
                            value={fileType.ext}
                            disabled={!fullFileUpload}
                            onChange={handleAllowedFileTypesChange}
                        />
                        <label htmlFor={fileType.ext} style={{ marginLeft: 10 }}>
                            {fileType.name} ({fileType.extension})
                        </label>
                    </div>
                ))}
            </div>

            {allowedFileTypes.includes('application/pdf') && fullFileUpload && (
                <Box
                    sx={{
                        borderRadius: 2,
                        border: customization.isDarkMode ? '1px solid #424242' : '1px solid #e0e0e0',
                        backgroundColor: customization.isDarkMode ? '#2d2d2d' : '#fafafa',
                        padding: 3,
                        marginBottom: 3,
                        marginTop: 2
                    }}
                >
                    <Typography
                        sx={{ fontSize: 16, fontWeight: 600, marginBottom: 2, color: customization.isDarkMode ? '#ffffff' : '#424242' }}
                    >
                        PDF Configuration
                    </Typography>

                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, marginBottom: 1 }}>PDF Usage</Typography>
                        <FormControl disabled={!fullFileUpload}>
                            <RadioGroup name='pdf-usage' value={pdfUsage} onChange={handlePdfUsageChange}>
                                <FormControlLabel value='perPage' control={<Radio />} label='One document per page' />
                                <FormControlLabel value='perFile' control={<Radio />} label='One document per file' />
                            </RadioGroup>
                        </FormControl>
                    </Box>

                    <Box>
                        <SwitchInput
                            label='Use Legacy Build (for PDF compatibility issues)'
                            onChange={handleLegacyBuildChange}
                            value={pdfLegacyBuild}
                            disabled={!fullFileUpload}
                        />
                    </Box>
                </Box>
            )}

            <StyledButton style={{ marginBottom: 10, marginTop: 20 }} variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

FileUpload.propTypes = {
    dialogProps: PropTypes.object
}

export default FileUpload
