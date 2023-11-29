import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    InputLabel,
    List,
    ListItemButton,
    ListItemText,
    OutlinedInput,
    Select,
    Typography
} from '@mui/material'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '../../store/actions'
import { useDispatch } from 'react-redux'
import FormControl from '@mui/material/FormControl'
import Checkbox from '@mui/material/Checkbox'
import MenuItem from '@mui/material/MenuItem'
import ReactMarkdown from 'react-markdown'
import CredentialInputHandler from '../../views/canvas/CredentialInputHandler'
import promptApi from '../../api/prompt'
import { StyledButton } from '../button/StyledButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { styled } from '@mui/material/styles'
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp'
import MuiAccordion from '@mui/material/Accordion'
import MuiAccordionSummary from '@mui/material/AccordionSummary'
import MuiAccordionDetails from '@mui/material/AccordionDetails'

const NewLineToBr = ({ children = '' }) => {
    return children.split('\n').reduce(function (arr, line) {
        return arr.concat(line, <br />)
    }, [])
}

const Accordion = styled((props) => <MuiAccordion disableGutters elevation={0} square {...props} />)(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    '&:not(:last-child)': {
        borderBottom: 0
    },
    '&:before': {
        display: 'none'
    }
}))

const AccordionSummary = styled((props) => (
    <MuiAccordionSummary expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />} {...props} />
))(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : 'rgba(0, 0, 0, .03)',
    flexDirection: 'row-reverse',
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
        transform: 'rotate(180deg)'
    },
    '& .MuiAccordionSummary-content': {
        marginLeft: theme.spacing(1)
    }
}))

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    padding: theme.spacing(2),
    borderTop: '1px solid rgba(0, 0, 0, .125)'
}))

const PromptLangsmithHubDialog = ({ promptType, show, onCancel, onSubmit }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, dispatch])

    const ITEM_HEIGHT = 48
    const ITEM_PADDING_TOP = 8
    const MenuProps = {
        PaperProps: {
            style: {
                maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
                width: 250
            }
        }
    }

    const models = [
        { id: 101, name: 'anthropic:claude-instant-1' },
        { id: 102, name: 'anthropic:claude-instant-1.2' },
        { id: 103, name: 'anthropic:claude-2' },
        { id: 104, name: 'google:palm-2-chat-bison' },
        { id: 105, name: 'google:palm-2-codechat-bison' },
        { id: 106, name: 'google:palm-2-text-bison' },
        { id: 107, name: 'meta:llama-2-13b-chat' },
        { id: 108, name: 'meta:llama-2-70b-chat' },
        { id: 109, name: 'openai:gpt-3.5-turbo' },
        { id: 110, name: 'openai:gpt-4' },
        { id: 111, name: 'openai:text-davinci-003' }
    ]
    const [modelName, setModelName] = useState([])

    const usecases = [
        { id: 201, name: 'Agents' },
        { id: 202, name: 'Agent Stimulation' },
        { id: 203, name: 'Autonomous agents' },
        { id: 204, name: 'Classification' },
        { id: 205, name: 'Chatbots' },
        { id: 206, name: 'Code understanding' },
        { id: 207, name: 'Code writing' },
        { id: 208, name: 'Evaluation' },
        { id: 209, name: 'Extraction' },
        { id: 210, name: 'Interacting with APIs' },
        { id: 211, name: 'Multi-modal' },
        { id: 212, name: 'QA over documents' },
        { id: 213, name: 'Self-checking' },
        { id: 214, name: 'SQL' },
        { id: 215, name: 'Summarization' },
        { id: 216, name: 'Tagging' }
    ]
    const [usecase, setUsecase] = useState([])

    const languages = [
        { id: 301, name: 'Chinese' },
        { id: 302, name: 'English' },
        { id: 303, name: 'French' },
        { id: 304, name: 'German' },
        { id: 305, name: 'Russian' },
        { id: 306, name: 'Spanish' }
    ]
    const [language, setLanguage] = useState([])
    const [availablePrompNameList, setAvailablePrompNameList] = useState([])
    const [selectedPrompt, setSelectedPrompt] = useState({})

    const [credentialId, setCredentialId] = useState('')
    const [accordionExpanded, setAccordionExpanded] = useState('panel2')

    const handleAccordionChange = (panel) => {
        setAccordionExpanded(panel)
    }

    const handleListItemClick = async (event, index) => {
        const prompt = availablePrompNameList[index]

        if (!prompt.detailed) {
            const createResp = await promptApi.getPrompt({
                credential: credentialId,
                promptName: selectedPrompt.full_name
            })
            if (createResp.data) {
                prompt.detailed = createResp.data.templates
            }
        }
        setSelectedPrompt(prompt)
        await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const fetchPrompts = async () => {
        let tags = promptType === 'template' ? 'StringPromptTemplate&' : 'ChatPromptTemplate&'
        modelName.forEach((item) => {
            tags += `tags=${item.name}&`
        })
        usecase.forEach((item) => {
            tags += `tags=${item.name}&`
        })
        language.forEach((item) => {
            tags += `tags=${item.name}&`
        })
        const createResp = await promptApi.getAvailablePrompts({
            credential: credentialId,
            tags: tags
        })
        if (createResp.data) {
            setAvailablePrompNameList(createResp.data.repos)
        }
    }

    const removeDuplicates = (value) => {
        let duplicateRemoved = []

        value.forEach((item) => {
            if (value.filter((o) => o.id === item.id).length === 1) {
                duplicateRemoved.push(item)
            }
        })
        return duplicateRemoved
    }

    const handleModelChange = (event) => {
        const {
            target: { value }
        } = event

        setModelName(removeDuplicates(value))
    }

    const handleUsecaseChange = (event) => {
        const {
            target: { value }
        } = event

        setUsecase(removeDuplicates(value))
    }
    const handleLanguageChange = (event) => {
        const {
            target: { value }
        } = event

        setLanguage(removeDuplicates(value))
    }

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='lg'
            aria-labelledby='prompt-dialog-title'
            aria-describedby='prompt-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='prompt-dialog-title'>
                Load Prompts from Langsmith Hub ({promptType === 'template' ? 'PromptTemplate' : 'ChatPromptTemplate'})
            </DialogTitle>
            <DialogContent dividers sx={{ p: 1 }}>
                <Box sx={{ width: '100%' }} style={{ display: 'flex', flexDirection: 'row', p: 1, m: 0 }}>
                    <Typography style={{ alignSelf: 'center' }} sx={{ mr: 5 }} variant='overline'>
                        Langsmith Credential
                        <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <FormControl style={{ width: '30%' }} xs={4} sx={{ m: 1 }}>
                        <CredentialInputHandler
                            size='small'
                            sx={{ flexGrow: 1 }}
                            key={credentialId}
                            data={credentialId ? { credential: credentialId } : {}}
                            inputParam={{
                                label: 'Connect Credential',
                                name: 'credential',
                                type: 'credential',
                                credentialNames: ['langsmithApi']
                            }}
                            onSelect={(newValue) => {
                                setCredentialId(newValue)
                            }}
                        />
                    </FormControl>
                </Box>
                <Box sx={{ width: '100%' }} style={{ display: 'flex', flexDirection: 'row' }}>
                    <FormControl
                        style={{
                            width: '30%'
                        }}
                        xs={4}
                        sx={{ m: 1 }}
                    >
                        <InputLabel size='small' id='model-checkbox-label'>
                            Model
                        </InputLabel>
                        <Select
                            disabled={!credentialId}
                            id='model-checkbox'
                            labelId='model-checkbox-label'
                            multiple
                            size='small'
                            value={modelName}
                            onChange={handleModelChange}
                            input={<OutlinedInput label='Model' />}
                            renderValue={(selected) => selected.map((x) => x.name).join(', ')}
                            MenuProps={MenuProps}
                        >
                            {models.map((variant) => (
                                <MenuItem key={variant.id} value={variant}>
                                    <Checkbox id={variant.id} checked={modelName.findIndex((item) => item.id === variant.id) >= 0} />
                                    <ListItemText primary={variant.name} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl
                        xs={4}
                        style={{
                            width: '30%'
                        }}
                        sx={{ m: 1 }}
                    >
                        <InputLabel size='small' id='usecase-checkbox-label'>
                            Usecase
                        </InputLabel>
                        <Select
                            autoWidth={false}
                            disabled={!credentialId}
                            labelId='usecase-checkbox-label'
                            id='usecase-checkbox'
                            multiple
                            size='small'
                            value={usecase}
                            onChange={handleUsecaseChange}
                            input={<OutlinedInput label='Usecase' />}
                            renderValue={(selected) => selected.map((x) => x.name).join(', ')}
                            MenuProps={MenuProps}
                        >
                            {usecases.map((variant) => (
                                <MenuItem key={variant.id} value={variant}>
                                    <Checkbox id={variant.id} checked={usecase.findIndex((item) => item.id === variant.id) >= 0} />
                                    <ListItemText primary={variant.name} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl
                        style={{
                            width: '25%'
                        }}
                        xs={3}
                        sx={{ m: 1 }}
                    >
                        <InputLabel size='small' id='language-checkbox-label'>
                            Language
                        </InputLabel>
                        <Select
                            labelId='language-checkbox-label'
                            id='language-checkbox'
                            disabled={!credentialId}
                            multiple
                            size='small'
                            value={language}
                            onChange={handleLanguageChange}
                            input={<OutlinedInput label='language' />}
                            renderValue={(selected) => selected.map((x) => x.name).join(', ')}
                            MenuProps={MenuProps}
                        >
                            {languages.map((variant) => (
                                <MenuItem key={variant.id} value={variant}>
                                    <Checkbox id={variant.id} checked={language.findIndex((item) => item.id === variant.id) >= 0} />
                                    <ListItemText primary={variant.name} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl
                        style={{
                            width: '5%'
                        }}
                        xs={1}
                        sx={{ m: 1 }}
                    >
                        <Button disableElevation variant='outlined' onClick={fetchPrompts}>
                            Fetch
                        </Button>
                    </FormControl>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid xs={12} container spacing={1} justifyContent='center' alignItems='center'>
                    <Grid xs={4} item style={{ textAlign: 'left' }}>
                        <Box sx={{ width: '100%', maxWidth: 360 }}>
                            <Card variant='outlined' style={{ height: 470, overflow: 'auto', borderRadius: 0 }}>
                                <CardContent sx={{ p: 1 }}>
                                    <Typography sx={{ fontSize: 10 }} color='text.secondary' gutterBottom>
                                        Available Prompts
                                    </Typography>
                                    <List component='nav' aria-label='secondary mailbox folder'>
                                        {availablePrompNameList.map((item, index) => (
                                            <ListItemButton
                                                key={item.id}
                                                selected={item.id === selectedPrompt?.id}
                                                onClick={(event) => handleListItemClick(event, index)}
                                            >
                                                <ListItemText>{item.full_name}</ListItemText>
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Box>
                    </Grid>
                    <Grid xs={8} item style={{ textAlign: 'left' }}>
                        <Box sx={{ width: '100%' }} style={{ display: 'flex', flexDirection: 'column' }}>
                            <Card variant='outlined' style={{ height: 470, overflow: 'auto', borderRadius: 0 }}>
                                <CardContent sx={{ p: 0.5 }}>
                                    <Accordion expanded={accordionExpanded === 'panel1'} onChange={() => handleAccordionChange('panel1')}>
                                        <AccordionSummary
                                            aria-controls='panel1d-content'
                                            expandIcon={<ExpandMoreIcon />}
                                            id='panel1d-header'
                                        >
                                            <Typography>Description</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography sx={{ fontSize: 12, wordWrap: 'true' }} color='text.primary'>
                                                {selectedPrompt?.description}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                    <Accordion expanded={accordionExpanded === 'panel2'} onChange={() => handleAccordionChange('panel2')}>
                                        <AccordionSummary
                                            aria-controls='panel2d-content'
                                            expandIcon={<ExpandMoreIcon />}
                                            id='panel2d-header'
                                        >
                                            <Typography>Prompt</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography sx={{ fontSize: 12, wordWrap: 'true' }} color='text.primary'>
                                                {selectedPrompt?.detailed?.map((item) => (
                                                    <>
                                                        <Typography sx={{ fontSize: 12 }} color='text.secondary' gutterBottom>
                                                            {item.typeDisplay.toUpperCase()}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 12 }}>
                                                            <p
                                                                style={{
                                                                    whiteSpace: 'pre-wrap -moz-pre-wrap -pre-wrap -o-pre-wrap',
                                                                    wordWrap: 'break-word',
                                                                    fontFamily: 'inherit'
                                                                }}
                                                            >
                                                                <NewLineToBr>{item.template}</NewLineToBr>
                                                            </p>
                                                        </Typography>
                                                    </>
                                                ))}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                    <Accordion expanded={accordionExpanded === 'panel3'} onChange={() => handleAccordionChange('panel3')}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls='panel3d-content'
                                            id='panel3d-header'
                                        >
                                            <Typography>Readme</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <ReactMarkdown
                                                sx={{ fontSize: 11, wordWrap: 'true', width: '100%' }}
                                                style={{ width: '100%', flexGrow: 1, resize: 'none' }}
                                            >
                                                {selectedPrompt?.readme}
                                            </ReactMarkdown>
                                        </AccordionDetails>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <StyledButton disabled={!selectedPrompt?.detailed} onClick={() => onSubmit(selectedPrompt.detailed)} variant='contained'>
                    Submit
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

PromptLangsmithHubDialog.propTypes = {
    promptType: PropTypes.string,
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    onSubmit: PropTypes.func
}

export default PromptLangsmithHubDialog
