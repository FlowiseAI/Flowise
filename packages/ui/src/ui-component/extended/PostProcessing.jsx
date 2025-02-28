import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { IconButton, Button, Box, Typography, Tabs, Tab, Stack, OutlinedInput, Divider, Chip, Breadcrumbs } from '@mui/material'
import { IconArrowRight, IconArrowsMaximize, IconBulb, IconX } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { TabPanel } from '@/ui-component/tabs/TabPanel'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

const sampleFunction = `return $flow.rawOutput + " This is a post processed response!";`
const redactionTypes = [
    {
        label: 'Remove matching text',
        name: 'remove'
    },
    {
        label: 'Replace with custom text',
        name: 'replace'
    },
    {
        label: 'Replace with ***',
        name: 'asterisk'
    }
]

function HorizontalStepper() {
    const breadcrumbs = [
        <Typography key='1' style={{ color: '#b22c4d' }}>
            Generate LLM output
        </Typography>,
        <Typography key='2' style={{ color: '#b22c4d' }}>
            Apply Redaction Rules
        </Typography>,
        <Typography key='3' style={{ color: '#b22c4d' }}>
            Execute Custom JS Function
        </Typography>,
        <Typography key='4' style={{ color: '#b22c4d' }}>
            Show Response
        </Typography>
    ]
    return (
        <Stack spacing={2} style={{ alignItems: 'center' }}>
            <Breadcrumbs separator={<IconArrowRight fontSize='small' />} aria-label='breadcrumb'>
                {breadcrumbs}
            </Breadcrumbs>
        </Stack>
    )
}

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

    const [activeTabValue, setActiveTabValue] = useState(0)

    const [replacementText, setReplacementText] = useState('')
    const [redactionPhrase, setRedactionPhrase] = useState('')
    const [isRegexp, setRegexp] = useState(false)
    const [redactionType, setRedactionType] = useState('asterisk')
    const [redactionRules, setRedactionRules] = useState([])

    const addRedactionRule = () => {
        const newRule = {
            phrase: redactionPhrase,
            isRegexp: isRegexp,
            type: redactionType,
            replacement: redactionType === 'replace' ? replacementText : ''
        }
        setRedactionRules([...redactionRules, newRule])
        setRedactionPhrase('')
        setRedactionType('asterisk')
        setReplacementText('')
        setRegexp(false)
    }

    const removeRedactionRule = (index) => {
        const rows = [...redactionRules]
        rows.splice(index, 1)
        setRedactionRules(rows)
    }

    const handleTabChange = (event, newValue) => {
        setActiveTabValue(newValue)
    }

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

        return () => {
            setRedactionRules([...redactionRules, newRule])
            setRedactionPhrase('')
            setRedactionType('asterisk')
            setReplacementText('')
            setRegexp(false)
        }
    }, [dialogProps])

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'column',
                    borderRadius: 10,
                    background: '#f3bdcc',
                    padding: 10,
                    marginTop: 10
                }}
            >
                <span style={{ marginLeft: 10, fontWeight: 500, color: '#000000' }}>
                    <HorizontalStepper />
                </span>
            </div>

            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <SwitchInput label='Enable Post Processing' onChange={handleChange} value={postProcessingEnabled} />
            </Box>
            <Tabs
                value={activeTabValue}
                onChange={handleTabChange}
                textColor='primary'
                aria-label='tabs'
                style={{ marginBottom: 10, background: '#f5f5f5' }}
            >
                <Tab value={0} label='Redaction Rules' />
                <Tab value={1} label='Custom JS Function'></Tab>
            </Tabs>
            <TabPanel value={activeTabValue} index={0}>
                <Stack direction='column' divider={<Divider sx={{ my: 0.5, borderColor: theme.palette.grey[900] + 25 }} />} spacing={2}>
                    <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
                        <Stack direction='row' spacing={1} style={{ width: '100%' }}>
                            <Stack direction='column' spacing={2} style={{ width: '90%' }}>
                                <Typography>Phrase or Pattern</Typography>
                                <div style={{ display: 'flex', width: '100%' }}>
                                    <Box sx={{ width: '100%', mb: 1 }}>
                                        <OutlinedInput
                                            sx={{ width: '100%' }}
                                            type='text'
                                            onChange={(e) => setRedactionPhrase(e.target.value)}
                                            size='small'
                                            value={redactionPhrase}
                                            name='redactionPhrase'
                                            placeholder='Enter a phrase or regexp to redact'
                                        />
                                    </Box>
                                </div>
                            </Stack>
                            <Stack direction='column' spacing={2} style={{ width: '10%' }}>
                                <Typography>Is RegExp?</Typography>
                                <div style={{ display: 'flex', width: '100%' }}>
                                    <Box sx={{ width: '100%', mb: 1 }}>
                                        <SwitchInput label={''} onChange={setRegexp} value={isRegexp} />
                                    </Box>
                                </div>
                            </Stack>
                        </Stack>
                        <Stack direction='row' spacing={1} style={{ width: '100%' }}>
                            <Stack direction='column' spacing={1} style={{ width: redactionType === 'replace' ? '50%' : '100%' }}>
                                <Typography>Action</Typography>
                                <Dropdown
                                    key={redactionType}
                                    name={redactionType}
                                    options={redactionTypes}
                                    onSelect={(newValue) => setRedactionType(newValue)}
                                    value={redactionType ?? 'choose an option'}
                                />
                            </Stack>
                            {redactionType === 'replace' && (
                                <Stack direction='column' spacing={1} style={{ width: '50%' }}>
                                    <Typography>Replacement Text</Typography>
                                    <OutlinedInput
                                        sx={{ width: '100%' }}
                                        type='text'
                                        onChange={(e) => setReplacementText(e.target.value)}
                                        size='small'
                                        value={replacementText}
                                        name='replacementText'
                                        placeholder='Enter replacement text'
                                    />
                                </Stack>
                            )}
                        </Stack>
                        <Stack direction='column' spacing={1}>
                            <StyledButton
                                style={{ marginBottom: 5, marginTop: 5 }}
                                variant='contained'
                                disabled={!redactionPhrase || !redactionType || (redactionType === 'replace' && !replacementText)}
                                onClick={addRedactionRule}
                            >
                                Add Redaction rule
                            </StyledButton>
                        </Stack>
                    </Stack>
                    <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'left', margin: 2 }}>
                            <Typography variant='h3'>Active Redaction Rules</Typography>
                        </Box>
                        <Stack direction='column' spacing={1} style={{ width: '100%' }}>
                            {redactionRules.map((rule, index) => (
                                <Stack
                                    key={index}
                                    direction='row'
                                    spacing={1}
                                    style={{
                                        padding: 2,
                                        margin: 2,
                                        width: '100%',
                                        alignItems: 'center',
                                        background: '#f6f5f5',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'left',
                                            verticalAlign: 'middle'
                                        }}
                                    >
                                        {rule.isRegexp ? (
                                            <Chip
                                                size='small'
                                                variant='filled'
                                                style={{ background: 'black', color: 'white', marginRight: 5 }}
                                                label='Regexp'
                                            />
                                        ) : (
                                            <Chip
                                                size='small'
                                                variant='filled'
                                                style={{ background: 'black', color: 'white', marginRight: 5 }}
                                                label='Text'
                                            />
                                        )}
                                        {rule.type === 'remove' && (
                                            <Typography
                                                style={{ color: 'darkblue' }}
                                                variant='subtitle1'
                                            >{`Remove: ${rule.phrase}`}</Typography>
                                        )}
                                        {rule.type === 'replace' && (
                                            <Typography
                                                style={{ color: 'darkblue' }}
                                                variant='subtitle1'
                                            >{`Replace: ${rule.phrase} with ${rule.replacement}`}</Typography>
                                        )}
                                        {rule.type === 'asterisk' && (
                                            <Typography
                                                style={{ color: 'darkblue' }}
                                                variant='subtitle1'
                                            >{`Replace: ${rule.phrase} with ***`}</Typography>
                                        )}
                                    </Box>
                                    <Button onClick={() => removeRedactionRule(index)}>
                                        <IconX />
                                    </Button>
                                </Stack>
                            ))}
                            {redactionRules.length === 0 && <Typography>No active redaction rules</Typography>}
                        </Stack>
                    </Stack>
                </Stack>
            </TabPanel>
            <TabPanel value={activeTabValue} index={1}>
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
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 10,
                        background: '#d8f3dc',
                        padding: 10,
                        marginTop: 10
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingTop: 10
                        }}
                    >
                        <IconBulb size={30} color='#2d6a4f' />
                        <span style={{ color: '#2d6a4f', marginLeft: 10, fontWeight: 500 }}>
                            The following variables are available to use in the custom function:{' '}
                            <pre>$flow.rawOutput, $flow.input, $flow.chatflowId, $flow.sessionId, $flow.chatId</pre>
                        </span>
                    </div>
                </div>
            </TabPanel>
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
