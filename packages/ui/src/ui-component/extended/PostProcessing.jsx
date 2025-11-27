import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import {
    IconButton,
    Button,
    Box,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Card
} from '@mui/material'
import { IconArrowsMaximize, IconX } from '@tabler/icons-react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTheme } from '@mui/material/styles'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const sampleFunction = `// Access chat history as a string
const chatHistory = JSON.stringify($flow.chatHistory, null, 2); 

// Return a modified response
return $flow.rawOutput + " This is a post processed response!";`

const PostProcessing = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [postProcessingEnabled, setPostProcessingEnabled] = useState(false)
    const [postProcessingFunction, setPostProcessingFunction] = useState('')
    const [chatbotConfig, setChatbotConfig] = useState({})
    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})

    const handleChange = (value) => {
        setPostProcessingEnabled(value)
    }

    const onExpandDialogClicked = (value) => {
        const dialogProps = {
            value,
            inputParam: {
                label: 'Post Processing Function',
                name: 'postProcessingFunction',
                type: 'code',
                placeholder: sampleFunction,
                hideCodeExecute: true
            },
            languageType: 'js',
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setExpandDialogProps(dialogProps)
        setShowExpandDialog(true)
    }

    const onSave = async () => {
        try {
            let value = {
                postProcessing: {
                    enabled: postProcessingEnabled,
                    customFunction: JSON.stringify(postProcessingFunction)
                }
            }
            chatbotConfig.postProcessing = value.postProcessing
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Post Processing Settings Saved',
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
                message: `Failed to save Post Processing Settings: ${
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
        if (dialogProps.chatflow && dialogProps.chatflow.chatbotConfig) {
            let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
            setChatbotConfig(chatbotConfig || {})
            if (chatbotConfig.postProcessing) {
                setPostProcessingEnabled(chatbotConfig.postProcessing.enabled)
                if (chatbotConfig.postProcessing.customFunction) {
                    setPostProcessingFunction(JSON.parse(chatbotConfig.postProcessing.customFunction))
                }
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <>
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <SwitchInput label='Enable Post Processing' onChange={handleChange} value={postProcessingEnabled} />
            </Box>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                    <Typography>JS Function</Typography>
                    <Button
                        sx={{ ml: 2 }}
                        variant='outlined'
                        onClick={() => {
                            setPostProcessingFunction(sampleFunction)
                        }}
                    >
                        See Example
                    </Button>
                    <div style={{ flex: 1 }} />
                    <IconButton
                        size='small'
                        sx={{
                            height: 25,
                            width: 25
                        }}
                        title='Expand'
                        color='primary'
                        onClick={() => onExpandDialogClicked(postProcessingFunction)}
                    >
                        <IconArrowsMaximize />
                    </IconButton>
                </Box>

                <div
                    style={{
                        marginTop: '10px',
                        border: '1px solid',
                        borderColor: theme.palette.grey['300'],
                        borderRadius: '6px',
                        height: '200px',
                        width: '100%'
                    }}
                >
                    <CodeEditor
                        value={postProcessingFunction}
                        height='200px'
                        theme={customization.isDarkMode ? 'dark' : 'light'}
                        lang={'js'}
                        placeholder={sampleFunction}
                        onValueChange={(code) => setPostProcessingFunction(code)}
                        basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                    />
                </div>
            </Box>
            <Card sx={{ borderColor: theme.palette.primary[200] + 75, mt: 2, mb: 2 }} variant='outlined'>
                <Accordion
                    disableGutters
                    sx={{
                        '&:before': {
                            display: 'none'
                        }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Available Variables</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <TableContainer component={Paper}>
                            <Table aria-label='available variables table'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '30%' }}>Variable</TableCell>
                                        <TableCell sx={{ width: '15%' }}>Type</TableCell>
                                        <TableCell sx={{ width: '55%' }}>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.rawOutput</code>
                                        </TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>The raw output response from the flow</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.input</code>
                                        </TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>The user input message</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.chatHistory</code>
                                        </TableCell>
                                        <TableCell>array</TableCell>
                                        <TableCell>Array of previous messages in the conversation</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.chatflowId</code>
                                        </TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Unique identifier for the chatflow</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.sessionId</code>
                                        </TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Current session identifier</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.chatId</code>
                                        </TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Current chat identifier</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.sourceDocuments</code>
                                        </TableCell>
                                        <TableCell>array</TableCell>
                                        <TableCell>Source documents used in retrieval (if applicable)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.usedTools</code>
                                        </TableCell>
                                        <TableCell>array</TableCell>
                                        <TableCell>List of tools used during execution</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <code>$flow.artifacts</code>
                                        </TableCell>
                                        <TableCell>array</TableCell>
                                        <TableCell>List of artifacts generated during execution</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ borderBottom: 'none' }}>
                                            <code>$flow.fileAnnotations</code>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: 'none' }}>array</TableCell>
                                        <TableCell sx={{ borderBottom: 'none' }}>File annotations associated with the response</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
            </Card>
            <StyledButton
                style={{ marginBottom: 10, marginTop: 10 }}
                variant='contained'
                disabled={!postProcessingFunction || postProcessingFunction?.trim().length === 0}
                onClick={onSave}
            >
                Save
            </StyledButton>
            <ExpandTextDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onCancel={() => setShowExpandDialog(false)}
                onConfirm={(newValue) => {
                    setPostProcessingFunction(newValue)
                    setShowExpandDialog(false)
                }}
            ></ExpandTextDialog>
        </>
    )
}

PostProcessing.propTypes = {
    dialogProps: PropTypes.object
}

export default PostProcessing
