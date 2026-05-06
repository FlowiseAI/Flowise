import { cloneDeep, set } from 'lodash'
import { memo, useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { FullPageChat } from 'flowise-embed-react'
import PropTypes from 'prop-types'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// Material-UI
import {
    IconButton,
    Avatar,
    ButtonBase,
    Toolbar,
    Box,
    Button,
    Grid,
    OutlinedInput,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTheme } from '@mui/material/styles'
import {
    IconCode,
    IconArrowLeft,
    IconDeviceFloppy,
    IconSettings,
    IconX,
    IconTrash,
    IconWand,
    IconArrowsMaximize,
    IconEdit,
    IconCheck,
    IconUpload,
    IconCopy
} from '@tabler/icons-react'

// Project import
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { StyledFab } from '@/ui-component/button/StyledFab'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ErrorBoundary from '@/ErrorBoundary'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'
import APICodeDialog from '@/views/chatflows/APICodeDialog'
import ViewMessagesDialog from '@/ui-component/dialog/ViewMessagesDialog'
import ChatflowConfigurationDialog from '@/ui-component/dialog/ChatflowConfigurationDialog'
import ViewLeadsDialog from '@/ui-component/dialog/ViewLeadsDialog'
import Settings from '@/views/settings'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import PromptGeneratorDialog from '@/ui-component/dialog/PromptGeneratorDialog'
import { Available } from '@/ui-component/rbac/available'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'
import ExportAsTemplateDialog from '@/ui-component/dialog/ExportAsTemplateDialog'
import { SwitchInput } from '@/ui-component/switch/Switch'
import DescribeMode from './DescribeMode'

// API
import assistantsApi from '@/api/assistants'
import chatflowsApi from '@/api/chatflows'
import nodesApi from '@/api/nodes'
import documentstoreApi from '@/api/documentstore'
import userApi from '@/api/user'

// Const
import { baseURL, uiBaseURL } from '@/store/constant'
import { SET_CHATFLOW, closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// Utils
import { initNode, showHideInputParams, generateExportFlowData } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

// ===========================|| CustomAssistantConfigurePreview ||=========================== //

const MemoizedFullPageChat = memo(
    ({ ...props }) => (
        <div>
            <FullPageChat {...props}></FullPageChat>
        </div>
    ),
    (prevProps, nextProps) => prevProps.chatflow === nextProps.chatflow
)

MemoizedFullPageChat.displayName = 'MemoizedFullPageChat'

MemoizedFullPageChat.propTypes = {
    chatflow: PropTypes.object
}

// Helper to build the built-in tools map from agentNodeDef — keyed by the model name in the `show` condition
const getBuiltInToolsMap = (agentNodeDef) => {
    if (!agentNodeDef?.inputParams) return {}
    const map = {}
    const builtInParams = agentNodeDef.inputParams.filter((p) => p.name?.startsWith('agentToolsBuiltIn') && p.type === 'multiOptions')
    for (const param of builtInParams) {
        // The `show` condition maps to the model component name, e.g. { agentModel: 'chatOpenAI' }
        const modelName = param.show?.agentModel
        if (modelName) {
            map[modelName] = {
                paramName: param.name,
                options: param.options || []
            }
        }
    }
    return map
}

// Helper to extract structured output type options from the agentStructuredOutput array definition
const getStructuredOutputTypeOptions = (agentNodeDef) => {
    if (!agentNodeDef?.inputParams) return []
    const param = agentNodeDef.inputParams.find((p) => p.name === 'agentStructuredOutput')
    if (!param?.array) return []
    const typeField = param.array.find((a) => a.name === 'type')
    return typeField?.options || []
}

const CustomAssistantConfigurePreview = ({ chatflowType: _chatflowType = 'ASSISTANT' }) => {
    const navigate = useNavigate()
    const theme = useTheme()
    const settingsRef = useRef()
    const loadAgentInputRef = useRef()
    const canvas = useSelector((state) => state.canvas)
    const customization = useSelector((state) => state.customization)
    const currentUser = useSelector((state) => state.auth.user)

    const getChatModelsApi = useApi(assistantsApi.getChatModels)
    const getDocStoresApi = useApi(assistantsApi.getDocStores)
    const getToolsApi = useApi(assistantsApi.getTools)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)
    const getOrganizationApi = useApi(userApi.getOrganizationById)

    const { id: routeId } = useParams()
    const location = useLocation()
    const isNewAgent = !routeId || routeId === 'new'
    const isTemplatePreview = !!location.state?.templateData
    const templateData = location.state?.templateData

    // chatflowId is always from the route param (chatflow table ID)
    const [chatflowId, setChatflowId] = useState(isNewAgent ? null : routeId)

    const [chatModelsComponents, setChatModelsComponents] = useState([])
    const [chatModelsOptions, setChatModelsOptions] = useState([])
    const [selectedChatModel, setSelectedChatModel] = useState({})
    const [modelConfigDialogOpen, setModelConfigDialogOpen] = useState(false)
    const previousChatModelRef = useRef(null)
    const [agentName, setAgentName] = useState('New Agent')
    const [creationMode, setCreationMode] = useState(location.state?.generateTask ? 'describe' : 'manual')
    const [defaultCheckComplete, setDefaultCheckComplete] = useState(false)
    const [modelConfirmed, setModelConfirmed] = useState(false)
    const [customAssistantInstruction, setCustomAssistantInstruction] = useState('You are helpful assistant')
    const [documentStoreOptions, setDocumentStoreOptions] = useState([])
    const [selectedDocumentStores, setSelectedDocumentStores] = useState([])
    const [toolComponents, setToolComponents] = useState([])
    const [toolOptions, setToolOptions] = useState([])
    const [selectedTools, setSelectedTools] = useState([])

    const [vectorStoreOptions, setVectorStoreOptions] = useState([])
    const [vectorStoreComponents, setVectorStoreComponents] = useState([])
    const [embeddingModelOptions, setEmbeddingModelOptions] = useState([])
    const [embeddingModelComponents, setEmbeddingModelComponents] = useState([])
    const [knowledgeVSEmbeddings, setKnowledgeVSEmbeddings] = useState([])

    // Built-in tools — dynamic map keyed by param name (e.g. 'agentToolsBuiltInOpenAI': ['web_search_preview'])
    const [builtInTools, setBuiltInTools] = useState({})

    // Built-in skills catalogue fetched from SmartAgent's listBuiltinSkills loadMethod.
    // Each entry: { label, name, description }
    const [builtinSkillsOptions, setBuiltinSkillsOptions] = useState([])
    // Names of skills that are *disabled* — i.e. excluded from this agent.
    const [disabledBuiltinSkills, setDisabledBuiltinSkills] = useState([])

    const [enableMemory, setEnableMemory] = useState(true)
    const [memoryType, setMemoryType] = useState('allMessages')
    const [memoryWindowSize, setMemoryWindowSize] = useState(20)
    const [memoryMaxTokenLimit, setMemoryMaxTokenLimit] = useState(2000)

    const [structuredOutput, setStructuredOutput] = useState([])

    const [agentNodeDef, setAgentNodeDef] = useState(null)
    const [startNodeDef, setStartNodeDef] = useState(null)

    const [apiDialogOpen, setAPIDialogOpen] = useState(false)
    const [apiDialogProps, setAPIDialogProps] = useState({})
    const [viewMessagesDialogOpen, setViewMessagesDialogOpen] = useState(false)
    const [viewMessagesDialogProps, setViewMessagesDialogProps] = useState({})
    const [viewLeadsDialogOpen, setViewLeadsDialogOpen] = useState(false)
    const [viewLeadsDialogProps, setViewLeadsDialogProps] = useState({})
    const [chatflowConfigurationDialogOpen, setChatflowConfigurationDialogOpen] = useState(false)
    const [chatflowConfigurationDialogProps, setChatflowConfigurationDialogProps] = useState({})
    const [isSettingsOpen, setSettingsOpen] = useState(false)
    const [exportAsTemplateDialogOpen, setExportAsTemplateDialogOpen] = useState(false)
    const [exportAsTemplateDialogProps, setExportAsTemplateDialogProps] = useState({})
    const [assistantPromptGeneratorDialogOpen, setAssistantPromptGeneratorDialogOpen] = useState(false)
    const [assistantPromptGeneratorDialogProps, setAssistantPromptGeneratorDialogProps] = useState({})
    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})

    const [loading, setLoading] = useState(false)
    const [loadingAssistant, setLoadingAssistant] = useState(true)
    const [isEditingName, setIsEditingName] = useState(false)
    const [editingNameValue, setEditingNameValue] = useState('')

    const saveAgentName = async (newName) => {
        if (!newName || !newName.trim()) return
        setAgentName(newName)
        setIsEditingName(false)
        // Persist to database immediately if the agent already exists
        if (!isNewAgent && chatflowId) {
            try {
                await chatflowsApi.updateChatflow(chatflowId, { name: newName })
            } catch (e) {
                console.error('Failed to save agent name', e)
            }
        }
    }
    const [error, setError] = useState(null)

    const dispatch = useDispatch()
    const { confirm } = useConfirm()

    // ==============================|| Snackbar ||============================== //
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

    const handleToolDataChange =
        (toolIndex) =>
        ({ inputParam, newValue }) => {
            setSelectedTools((prevTools) => {
                const updatedTools = [...prevTools]
                const updatedTool = { ...updatedTools[toolIndex] }
                updatedTool.inputs[inputParam.name] = newValue
                updatedTool.inputParams = showHideInputParams(updatedTool)
                updatedTools[toolIndex] = updatedTool
                return updatedTools
            })
        }

    const handleVSDataChange =
        (itemIndex) =>
        ({ inputParam, newValue }) => {
            setKnowledgeVSEmbeddings((prev) => {
                const updated = [...prev]
                const item = { ...updated[itemIndex] }
                if (item.vectorStoreNode) {
                    item.vectorStoreNode = { ...item.vectorStoreNode }
                    item.vectorStoreNode.inputs = { ...item.vectorStoreNode.inputs, [inputParam.name]: newValue }
                    item.vectorStoreNode.inputParams = showHideInputParams(item.vectorStoreNode)
                }
                updated[itemIndex] = item
                return updated
            })
        }

    const handleEmbeddingDataChange =
        (itemIndex) =>
        ({ inputParam, newValue }) => {
            setKnowledgeVSEmbeddings((prev) => {
                const updated = [...prev]
                const item = { ...updated[itemIndex] }
                if (item.embeddingNode) {
                    item.embeddingNode = { ...item.embeddingNode }
                    item.embeddingNode.inputs = { ...item.embeddingNode.inputs, [inputParam.name]: newValue }
                    item.embeddingNode.inputParams = showHideInputParams(item.embeddingNode)
                }
                updated[itemIndex] = item
                return updated
            })
        }

    const initVectorStoreNode = (componentName, index) => {
        const foundComponent = vectorStoreComponents.find((c) => c.name === componentName)
        if (!foundComponent) return null
        const clonedComponent = cloneDeep(foundComponent)
        return initNode(clonedComponent, `${componentName}_vs_${index}`)
    }

    const initEmbeddingNode = (componentName, index) => {
        const foundComponent = embeddingModelComponents.find((c) => c.name === componentName)
        if (!foundComponent) return null
        const clonedComponent = cloneDeep(foundComponent)
        return initNode(clonedComponent, `${componentName}_emb_${index}`)
    }

    const displayWarning = () => {
        enqueueSnackbar({
            message: 'Please fill in all mandatory fields.',
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'warning',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const checkInputParamsMandatory = () => {
        let canSubmit = true
        const visibleInputParams = showHideInputParams(selectedChatModel).filter(
            (inputParam) => !inputParam.hidden && inputParam.display !== false
        )
        for (const inputParam of visibleInputParams) {
            if (!inputParam.optional && (!selectedChatModel.inputs[inputParam.name] || !selectedChatModel.credential)) {
                if (inputParam.type === 'credential' && !selectedChatModel.credential) {
                    canSubmit = false
                    break
                } else if (inputParam.type !== 'credential' && !selectedChatModel.inputs[inputParam.name]) {
                    canSubmit = false
                    break
                }
            }
        }

        if (selectedTools.length > 0) {
            for (let i = 0; i < selectedTools.length; i++) {
                const tool = selectedTools[i]
                const visibleInputParams = showHideInputParams(tool).filter(
                    (inputParam) => !inputParam.hidden && inputParam.display !== false
                )
                for (const inputParam of visibleInputParams) {
                    if (!inputParam.optional && (!tool.inputs[inputParam.name] || !tool.credential)) {
                        if (inputParam.type === 'credential' && !tool.credential) {
                            canSubmit = false
                            break
                        } else if (inputParam.type !== 'credential' && !tool.inputs[inputParam.name]) {
                            canSubmit = false
                            break
                        }
                    }
                }
            }
        }

        return canSubmit
    }

    const checkMandatoryFields = () => {
        let canSubmit = true

        if (!agentName || !agentName.trim()) {
            canSubmit = false
        }

        if (!selectedChatModel || !selectedChatModel.name) {
            canSubmit = false
        }

        if (canSubmit) canSubmit = checkInputParamsMandatory()

        // check if any of the description is empty
        if (selectedDocumentStores.length > 0) {
            for (let i = 0; i < selectedDocumentStores.length; i++) {
                if (!selectedDocumentStores[i].description) {
                    canSubmit = false
                    break
                }
            }
        }

        if (!canSubmit) {
            displayWarning()
        }
        return canSubmit
    }

    // ==============================|| Build Config ||============================== //

    const buildModelConfig = () => {
        const config = {
            credential: selectedChatModel.credential || '',
            agentModel: selectedChatModel.name
        }
        // Copy all model input params
        if (selectedChatModel.inputs) {
            Object.keys(selectedChatModel.inputs).forEach((key) => {
                config[key] = selectedChatModel.inputs[key]
            })
        }
        return config
    }

    const buildToolsArray = () => {
        return selectedTools
            .filter((tool) => tool && Object.keys(tool).length > 0)
            .map((tool) => {
                const toolConfig = {
                    credential: tool.credential || '',
                    agentSelectedTool: tool.name
                }
                if (tool.inputs) {
                    Object.keys(tool.inputs).forEach((key) => {
                        toolConfig[key] = tool.inputs[key]
                    })
                }
                return {
                    agentSelectedTool: tool.name,
                    agentSelectedToolConfig: toolConfig,
                    agentSelectedToolRequiresHumanInput: tool.requireHumanInput ?? false
                }
            })
    }

    const buildDocStoresArray = () => {
        return selectedDocumentStores.map((ds) => ({
            documentStore: `${ds.id}:${ds.name}`,
            docStoreDescription: ds.description || '',
            returnSourceDocuments: ds.returnSourceDocuments ?? false
        }))
    }

    const buildVSEmbeddingsArray = () => {
        return knowledgeVSEmbeddings
            .filter((item) => item.vectorStore && item.embeddingModel)
            .map((item) => {
                const vsConfig = { credential: '', agentSelectedTool: item.vectorStore }
                if (item.vectorStoreNode) {
                    vsConfig.credential = item.vectorStoreNode.credential || ''
                    if (item.vectorStoreNode.inputs) {
                        Object.keys(item.vectorStoreNode.inputs).forEach((key) => {
                            vsConfig[key] = item.vectorStoreNode.inputs[key]
                        })
                    }
                }
                const embConfig = { credential: '', agentSelectedTool: item.embeddingModel }
                if (item.embeddingNode) {
                    embConfig.credential = item.embeddingNode.credential || ''
                    if (item.embeddingNode.inputs) {
                        Object.keys(item.embeddingNode.inputs).forEach((key) => {
                            embConfig[key] = item.embeddingNode.inputs[key]
                        })
                    }
                }
                return {
                    vectorStore: item.vectorStore,
                    vectorStoreConfig: vsConfig,
                    embeddingModel: item.embeddingModel,
                    embeddingModelConfig: embConfig,
                    knowledgeName: item.knowledgeName || '',
                    knowledgeDescription: item.knowledgeDescription || '',
                    returnSourceDocuments: item.returnSourceDocuments ?? false
                }
            })
    }

    const prepareConfig = async () => {
        try {
            if (!startNodeDef || !agentNodeDef) {
                throw new Error('Node definitions not loaded yet')
            }

            const startNode = cloneDeep(startNodeDef)
            const agentNode = cloneDeep(agentNodeDef)

            // Set agent node inputs
            set(agentNode, 'inputs.agentModel', selectedChatModel.name)
            set(agentNode, 'inputs.agentModelConfig', buildModelConfig())
            set(agentNode, 'inputs.agentMessages', [{ role: 'system', content: customAssistantInstruction }])

            // Built-in tools — save all dynamic param entries
            const builtInToolsMap = getBuiltInToolsMap(agentNodeDef)
            for (const modelKey of Object.keys(builtInToolsMap)) {
                const paramName = builtInToolsMap[modelKey].paramName
                const tools = builtInTools[paramName] || []
                set(agentNode, `inputs.${paramName}`, tools.length > 0 ? JSON.stringify(tools) : '')
            }

            // Skills — disabled list (JSON-stringified array of names; empty when nothing disabled)
            set(agentNode, 'inputs.disabledBuiltinSkills', disabledBuiltinSkills.length > 0 ? JSON.stringify(disabledBuiltinSkills) : '')

            // Custom tools
            set(agentNode, 'inputs.agentTools', buildToolsArray())

            // Knowledge
            set(agentNode, 'inputs.agentKnowledgeDocumentStores', buildDocStoresArray())
            set(agentNode, 'inputs.agentKnowledgeVSEmbeddings', buildVSEmbeddingsArray())

            // Memory
            set(agentNode, 'inputs.agentEnableMemory', enableMemory)
            set(agentNode, 'inputs.agentMemoryType', memoryType)
            set(agentNode, 'inputs.agentMemoryWindowSize', String(memoryWindowSize))
            set(agentNode, 'inputs.agentMemoryMaxTokenLimit', String(memoryMaxTokenLimit))

            // Structured output
            set(agentNode, 'inputs.agentStructuredOutput', structuredOutput)

            // Return response as user message
            set(agentNode, 'inputs.agentReturnResponseAs', 'userMessage')

            const config = {
                nodes: [
                    {
                        id: startNode.id,
                        type: 'agentFlow',
                        position: { x: 70.5, y: 107 },
                        data: startNode,
                        width: 103,
                        height: 66
                    },
                    {
                        id: agentNode.id,
                        type: 'agentFlow',
                        position: { x: 231, y: 105 },
                        data: agentNode,
                        width: 175,
                        height: 72
                    }
                ],
                edges: [
                    {
                        source: 'startAgentflow_0',
                        sourceHandle: 'startAgentflow_0-output-startAgentflow',
                        target: 'smartAgentAgentflow_0',
                        targetHandle: 'smartAgentAgentflow_0',
                        data: { sourceColor: '#7EE787', targetColor: '#4DD0E1', isHumanInput: false },
                        type: 'agentFlow',
                        id: 'startAgentflow_0-startAgentflow_0-output-startAgentflow-smartAgentAgentflow_0-smartAgentAgentflow_0'
                    }
                ]
            }

            return config
        } catch (error) {
            console.error('Error preparing config', error)
            enqueueSnackbar({
                message: `Failed to save agent: ${typeof error === 'string' ? error : error.message || 'Unknown error'}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            return undefined
        }
    }

    // ==============================|| Save & Process ||============================== //

    const onSaveAndProcess = async () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const flowData = await prepareConfig()
            if (!flowData) {
                setLoading(false)
                return
            }
            const saveObj = {
                name: agentName,
                flowData: JSON.stringify(flowData),
                type: 'AGENT'
            }
            try {
                let saveResp
                if (isNewAgent || !chatflowId) {
                    // Create new chatflow (new agent or legacy assistant without linked chatflow)
                    saveResp = await chatflowsApi.createNewChatflow(saveObj)
                } else {
                    saveResp = await chatflowsApi.updateChatflow(chatflowId, saveObj)
                }

                if (saveResp.data) {
                    const newChatflowId = saveResp.data.id
                    setChatflowId(newChatflowId)
                    dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })

                    setLoading(false)
                    enqueueSnackbar({
                        message: 'Agent saved successfully',
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
                    // If new agent, navigate to the saved agent's page
                    if (isNewAgent && newChatflowId) {
                        navigate(`/agents/${newChatflowId}`, { replace: true })
                    }
                }
            } catch (error) {
                setLoading(false)
                enqueueSnackbar({
                    message: `Failed to save agent: ${
                        typeof error.response?.data === 'object' ? error.response.data.message : error.response?.data
                    }`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        }
    }

    // ==============================|| Settings & Actions ||============================== //

    const onSettingsItemClick = (setting) => {
        setSettingsOpen(false)

        if (setting === 'deleteAgent') {
            handleDeleteFlow()
        } else if (setting === 'viewMessages') {
            setViewMessagesDialogProps({
                title: 'View Messages',
                chatflow: canvas.chatflow,
                isChatflow: false
            })
            setViewMessagesDialogOpen(true)
        } else if (setting === 'viewLeads') {
            setViewLeadsDialogProps({
                title: 'View Leads',
                chatflow: canvas.chatflow
            })
            setViewLeadsDialogOpen(true)
        } else if (setting === 'agentConfiguration') {
            setChatflowConfigurationDialogProps({
                title: `Agent Configuration`,
                chatflow: canvas.chatflow
            })
            setChatflowConfigurationDialogOpen(true)
        } else if (setting === 'saveAsTemplate') {
            if (isNewAgent) {
                enqueueSnackbar({
                    message: 'Please save the agent before exporting as template',
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
                return
            }
            setExportAsTemplateDialogProps({
                title: 'Export As Template',
                chatflow: canvas.chatflow
            })
            setExportAsTemplateDialogOpen(true)
        } else if (setting === 'duplicateAgent') {
            handleDuplicateAgent()
        } else if (setting === 'exportAgent') {
            handleExportAgent()
        }
    }

    const onUploadFile = (file) => {
        setSettingsOpen(false)
        handleLoadAgent(file)
    }

    const handleDuplicateAgent = async () => {
        try {
            // Build flowData from current UI state and create a new chatflow directly
            const flowData = await prepareConfig()
            if (!flowData) return
            const saveObj = {
                name: `${agentName || 'Agent'} (Copy)`,
                flowData: JSON.stringify(flowData),
                type: 'AGENT'
            }
            const createResp = await chatflowsApi.createNewChatflow(saveObj)
            if (createResp.data) {
                window.open(`${uiBaseURL}/agents/${createResp.data.id}`, '_blank')
            }
        } catch (e) {
            console.error(e)
            enqueueSnackbar({
                message: `Failed to duplicate agent: ${e.message || 'Unknown error'}`,
                options: { key: new Date().getTime() + Math.random(), variant: 'error' }
            })
        }
    }

    const handleExportAgent = () => {
        try {
            if (!canvas.chatflow?.flowData) return
            const flowData = JSON.parse(canvas.chatflow.flowData)
            const dataStr = JSON.stringify(generateExportFlowData(flowData, 'AGENT'), null, 2)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const dataUri = URL.createObjectURL(blob)
            const exportFileDefaultName = `${agentName || 'Agent'} Agent.json`
            const linkElement = document.createElement('a')
            linkElement.setAttribute('href', dataUri)
            linkElement.setAttribute('download', exportFileDefaultName)
            linkElement.click()
        } catch (e) {
            console.error(e)
        }
    }

    const handleLoadAgent = (file) => {
        try {
            const flowData = JSON.parse(file)
            if (flowData.type && flowData.type !== 'AGENT') {
                enqueueSnackbar({
                    message: `Invalid file: expected AGENT type but got ${flowData.type}`,
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
                return
            }
            delete flowData.type
            // Render the loaded agent in the UI without saving to DB — user must click Save
            loadAgentFromFlowData(JSON.stringify(flowData))
            enqueueSnackbar({
                message: 'Agent loaded. Click Save to persist.',
                options: { key: new Date().getTime() + Math.random(), variant: 'success' }
            })
        } catch (e) {
            console.error(e)
            enqueueSnackbar({
                message: `Failed to load agent: ${e.message || 'Invalid file'}`,
                options: { key: new Date().getTime() + Math.random(), variant: 'error' }
            })
        }
    }

    const handleDeleteFlow = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${agentName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed && !isNewAgent) {
            try {
                if (chatflowId) {
                    await chatflowsApi.deleteChatflow(chatflowId)
                }
                navigate('/agents')
            } catch (error) {
                enqueueSnackbar({
                    message: typeof error.response?.data === 'object' ? error.response.data.message : error.response?.data,
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
    }

    const [expandDialogTarget, setExpandDialogTarget] = useState(null)

    const onExpandDialogClicked = (value, target = 'instruction', options = {}) => {
        const dialogProps = {
            value,
            inputParam: {
                label: options.label || 'Instructions',
                name: options.name || 'instructions',
                type: options.type || 'string'
            },
            languageType: options.languageType,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setExpandDialogTarget(target)
        setExpandDialogProps(dialogProps)
        setShowExpandDialog(true)
    }

    const generateDocStoreToolDesc = async (storeId) => {
        const isValid = checkInputParamsMandatory()
        if (!isValid) {
            displayWarning()
            return
        }

        try {
            setLoading(true)
            const selectedChatModelObj = {
                name: selectedChatModel.name,
                inputs: selectedChatModel.inputs
            }
            const resp = await documentstoreApi.generateDocStoreToolDesc(storeId, { selectedChatModel: selectedChatModelObj })

            if (resp.data) {
                setLoading(false)
                const content = resp.data?.content || resp.data.kwargs?.content
                const newSelectedDocumentStores = selectedDocumentStores.map((ds) => {
                    if (ds.id === storeId) {
                        return { ...ds, description: content }
                    }
                    return ds
                })
                setSelectedDocumentStores(newSelectedDocumentStores)
                enqueueSnackbar({
                    message: 'Document Store Tool Description generated successfully',
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
        } catch (error) {
            console.error('Error generating doc store tool desc', error)
            setLoading(false)
            enqueueSnackbar({
                message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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

    const generateInstruction = async () => {
        const isValid = checkInputParamsMandatory()
        if (!isValid) {
            displayWarning()
            return
        }

        setAssistantPromptGeneratorDialogProps({
            title: 'Generate Instructions',
            description: 'You can generate a prompt template by sharing basic details about your task.',
            data: { selectedChatModel }
        })
        setAssistantPromptGeneratorDialogOpen(true)
    }

    const onAPIDialogClick = () => {
        setAPIDialogProps({
            title: 'Embed in website or use as API',
            chatflowid: chatflowId,
            chatflowApiKeyId: canvas.chatflow.apikeyid,
            isSessionMemory: true,
            isAgentCanvas: true
        })
        setAPIDialogOpen(true)
    }

    const onDocStoreItemSelected = (docStoreIds) => {
        const docStoresIds = JSON.parse(docStoreIds)
        const newSelectedDocumentStores = []
        for (const docStoreId of docStoresIds) {
            const foundSelectedDocumentStore = selectedDocumentStores.find((ds) => ds.id === docStoreId)
            const foundDocumentStoreOption = documentStoreOptions.find((ds) => ds.name === docStoreId)

            const newDocStore = {
                id: docStoreId,
                name: foundDocumentStoreOption?.label || '',
                description: foundSelectedDocumentStore?.description || foundDocumentStoreOption?.description || '',
                returnSourceDocuments: foundSelectedDocumentStore?.returnSourceDocuments ?? false
            }

            newSelectedDocumentStores.push(newDocStore)
        }
        setSelectedDocumentStores(newSelectedDocumentStores)
    }

    const onDocStoreItemDelete = (docStoreId) => {
        const newSelectedDocumentStores = selectedDocumentStores.filter((ds) => ds.id !== docStoreId)
        setSelectedDocumentStores(newSelectedDocumentStores)
    }

    // ==============================|| Built-in Tools Handlers ||============================== //

    const getBuiltInToolsForParam = (paramName) => {
        return builtInTools[paramName] || []
    }

    const handleBuiltInToolToggle = (paramName, toolName) => {
        setBuiltInTools((prev) => {
            const currentTools = prev[paramName] || []
            const updated = currentTools.includes(toolName) ? currentTools.filter((t) => t !== toolName) : [...currentTools, toolName]
            return { ...prev, [paramName]: updated }
        })
    }

    // ==============================|| Skills Handlers ||============================== //

    const isBuiltinSkillEnabled = (skillName) => !disabledBuiltinSkills.includes(skillName)

    const handleBuiltinSkillToggle = (skillName) => {
        setDisabledBuiltinSkills((prev) => (prev.includes(skillName) ? prev.filter((n) => n !== skillName) : [...prev, skillName]))
    }

    // ==============================|| Structured Output Handlers ||============================== //

    const handleStructuredOutputChange = (index, field, value) => {
        const updated = [...structuredOutput]
        updated[index] = { ...updated[index], [field]: value }
        setStructuredOutput(updated)
    }

    const addStructuredOutputField = () => {
        setStructuredOutput([...structuredOutput, { key: '', type: 'string', description: '' }])
    }

    const removeStructuredOutputField = (index) => {
        setStructuredOutput(structuredOutput.filter((_, i) => i !== index))
    }

    // ==============================|| Effects ||============================== //

    useEffect(() => {
        getChatModelsApi.request()
        getDocStoresApi.request()
        getToolsApi.request()

        // Fetch org defaultConfig for new agents
        if (isNewAgent && currentUser?.activeOrganizationId) {
            getOrganizationApi.request(currentUser.activeOrganizationId)
        }

        // Fetch agentflow node definitions dynamically from server
        const fetchNodeDefs = async () => {
            try {
                const [startResp, agentResp] = await Promise.all([
                    nodesApi.getSpecificNode('startAgentflow'),
                    nodesApi.getSpecificNode('smartAgentAgentflow')
                ])
                if (startResp.data) {
                    const startData = initNode(startResp.data, 'startAgentflow_0')
                    setStartNodeDef(startData)
                }
                if (agentResp.data) {
                    const agentData = initNode(agentResp.data, 'smartAgentAgentflow_0')
                    setAgentNodeDef(agentData)
                }
            } catch (err) {
                console.error('Error fetching node definitions', err)
            }
        }
        fetchNodeDefs()

        // Fetch vector store and embedding model options + full component definitions
        const fetchVSEmbeddingOptions = async () => {
            try {
                const [vsResp, embResp, vsComponentsResp, embComponentsResp, skillsResp] = await Promise.all([
                    nodesApi.executeNodeLoadMethod('smartAgentAgentflow', { loadMethod: 'listVectorStores' }),
                    nodesApi.executeNodeLoadMethod('smartAgentAgentflow', { loadMethod: 'listEmbeddings' }),
                    nodesApi.getNodesByCategory('Vector Stores'),
                    nodesApi.getNodesByCategory('Embeddings'),
                    nodesApi.executeNodeLoadMethod('smartAgentAgentflow', { loadMethod: 'listBuiltinSkills' })
                ])
                if (vsResp.data) {
                    setVectorStoreOptions(
                        vsResp.data.map((vs) => ({
                            label: vs.label,
                            name: vs.name,
                            description: vs.description || '',
                            imageSrc: `${baseURL}/api/v1/node-icon/${vs.name}`
                        }))
                    )
                }
                if (embResp.data) {
                    setEmbeddingModelOptions(
                        embResp.data.map((em) => ({
                            label: em.label,
                            name: em.name,
                            description: em.description || '',
                            imageSrc: `${baseURL}/api/v1/node-icon/${em.name}`
                        }))
                    )
                }
                if (vsComponentsResp.data) {
                    setVectorStoreComponents(vsComponentsResp.data.filter((c) => !c.tags?.includes('LlamaIndex')))
                }
                if (embComponentsResp.data) {
                    setEmbeddingModelComponents(embComponentsResp.data.filter((c) => !c.tags?.includes('LlamaIndex')))
                }
                if (skillsResp.data) {
                    setBuiltinSkillsOptions(
                        skillsResp.data.map((s) => ({
                            label: s.label,
                            name: s.name,
                            description: s.description || ''
                        }))
                    )
                }
            } catch (err) {
                console.error('Error fetching vector store / embedding options', err)
            }
        }
        fetchVSEmbeddingOptions()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getDocStoresApi.data) {
            const options = getDocStoresApi.data.map((ds) => ({
                label: ds.label,
                name: ds.name,
                description: ds.description
            }))
            setDocumentStoreOptions(options)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDocStoresApi.data])

    useEffect(() => {
        if (getToolsApi.data) {
            setToolComponents(getToolsApi.data)

            const options = getToolsApi.data.map((ds) => ({
                label: ds.label,
                name: ds.name,
                description: ds.description,
                imageSrc: `${baseURL}/api/v1/node-icon/${ds.name}`
            }))
            setToolOptions(options)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getToolsApi.data])

    // Once toolComponents are loaded, initialize any selectedTools that are bare objects (missing inputParams).
    // This handles both orderings: toolComponents loaded before or after selectedTools are set.
    const initializeTools = (tools, components) => {
        if (components.length === 0 || tools.length === 0) return null
        const hasUninit = tools.some((t) => t.name && !t.inputParams)
        if (!hasUninit) return null

        return tools.map((tool, index) => {
            if (!tool.name || tool.inputParams) return tool
            const foundComponent = components.find((c) => c.name === tool.name)
            if (!foundComponent) return tool
            const toolId = `${foundComponent.name}_${index}`
            const clonedComponent = cloneDeep(foundComponent)
            const freshTool = initNode(clonedComponent, toolId)
            // Restore saved inputs
            Object.keys(tool).forEach((key) => {
                if (key === 'name' || key === 'toolId') return
                if (key === 'credential') {
                    freshTool.credential = tool[key]
                    if (freshTool.inputs) {
                        freshTool.inputs.credential = tool[key]
                        freshTool.inputs.FLOWISE_CREDENTIAL_ID = tool[key]
                    }
                } else if (freshTool.inputs && key in freshTool.inputs) {
                    freshTool.inputs[key] = tool[key]
                }
            })
            return freshTool
        })
    }

    useEffect(() => {
        const result = initializeTools(selectedTools, toolComponents)
        if (result) setSelectedTools(result)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toolComponents])

    // Also run when selectedTools changes, but only if toolComponents is ready and tools need init
    const prevToolsLenRef = useRef(0)
    useEffect(() => {
        // Only trigger when selectedTools length changes (new tools loaded from flowData)
        if (selectedTools.length !== prevToolsLenRef.current) {
            prevToolsLenRef.current = selectedTools.length
            const result = initializeTools(selectedTools, toolComponents)
            if (result) setSelectedTools(result)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTools])

    // Initialize VS/embedding nodes when components are loaded and items need initialization
    useEffect(() => {
        if (vectorStoreComponents.length === 0 && embeddingModelComponents.length === 0) return
        if (knowledgeVSEmbeddings.length === 0) return
        const hasUninit = knowledgeVSEmbeddings.some(
            (item) => (item.vectorStore && !item.vectorStoreNode) || (item.embeddingModel && !item.embeddingNode)
        )
        if (!hasUninit) return

        const updated = knowledgeVSEmbeddings.map((item, index) => {
            const newItem = { ...item }
            if (item.vectorStore && !item.vectorStoreNode) {
                const vsNode = initVectorStoreNode(item.vectorStore, index)
                if (vsNode && item.vectorStoreConfig) {
                    // Restore saved inputs
                    Object.keys(item.vectorStoreConfig).forEach((key) => {
                        if (key === 'credential') {
                            vsNode.credential = item.vectorStoreConfig[key]
                            if (vsNode.inputs) {
                                vsNode.inputs.credential = item.vectorStoreConfig[key]
                                vsNode.inputs.FLOWISE_CREDENTIAL_ID = item.vectorStoreConfig[key]
                            }
                        } else if (key === 'agentSelectedTool') {
                            // skip
                        } else if (vsNode.inputs && key in vsNode.inputs) {
                            vsNode.inputs[key] = item.vectorStoreConfig[key]
                        }
                    })
                }
                newItem.vectorStoreNode = vsNode
            }
            if (item.embeddingModel && !item.embeddingNode) {
                const embNode = initEmbeddingNode(item.embeddingModel, index)
                if (embNode && item.embeddingModelConfig) {
                    Object.keys(item.embeddingModelConfig).forEach((key) => {
                        if (key === 'credential') {
                            embNode.credential = item.embeddingModelConfig[key]
                            if (embNode.inputs) {
                                embNode.inputs.credential = item.embeddingModelConfig[key]
                                embNode.inputs.FLOWISE_CREDENTIAL_ID = item.embeddingModelConfig[key]
                            }
                        } else if (key === 'agentSelectedTool') {
                            // skip
                        } else if (embNode.inputs && key in embNode.inputs) {
                            embNode.inputs[key] = item.embeddingModelConfig[key]
                        }
                    })
                }
                newItem.embeddingNode = embNode
            }
            return newItem
        })
        setKnowledgeVSEmbeddings(updated)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vectorStoreComponents, embeddingModelComponents, knowledgeVSEmbeddings])

    // Helper to restore a chat model from saved data
    const restoreChatModel = (savedModel) => {
        if (!savedModel) return
        const latestComponent = chatModelsComponents.find((c) => c.name === savedModel.name)
        if (latestComponent) {
            const chatModelId = `${latestComponent.name}_0`
            const clonedComponent = cloneDeep(latestComponent)
            const freshModel = initNode(clonedComponent, chatModelId)
            freshModel.credential = savedModel.credential || ''
            if (savedModel.inputs) {
                Object.keys(savedModel.inputs).forEach((key) => {
                    if (freshModel.inputs && key in freshModel.inputs) {
                        freshModel.inputs[key] = savedModel.inputs[key]
                    }
                })
            }
            // Ensure credential is set in inputs for DocStoreInputHandler/CredentialInputHandler to read
            if (freshModel.credential && freshModel.inputs) {
                freshModel.inputs.credential = freshModel.credential
                freshModel.inputs.FLOWISE_CREDENTIAL_ID = freshModel.credential
            }
            setSelectedChatModel(freshModel)
        } else {
            setSelectedChatModel(savedModel)
        }
    }

    // Helper to extract agent config from flowData
    const loadAgentFromFlowData = (flowDataStr) => {
        try {
            const flowData = JSON.parse(flowDataStr)

            // ---- New agentflow format (smartAgentAgentflow node) ----
            const agentNode = flowData.nodes?.find((n) => n.data?.name === 'smartAgentAgentflow')
            if (agentNode) {
                const inputs = agentNode.data?.inputs || {}
                const modelConfig = inputs.agentModelConfig || {}

                // Restore chat model
                if (inputs.agentModel && modelConfig) {
                    const savedModel = {
                        name: inputs.agentModel,
                        credential: modelConfig.credential || '',
                        inputs: { ...modelConfig }
                    }
                    delete savedModel.inputs.credential
                    delete savedModel.inputs.agentModel
                    restoreChatModel(savedModel)
                }

                // Instruction from messages
                if (inputs.agentMessages?.length > 0) {
                    const systemMsg = inputs.agentMessages.find((m) => m.role === 'system')
                    if (systemMsg?.content) setCustomAssistantInstruction(systemMsg.content)
                }

                // Built-in tools — handle both stringified and raw array formats
                const parseBuiltInTools = (val) => {
                    if (!val) return []
                    if (typeof val === 'string') {
                        try {
                            return JSON.parse(val)
                        } catch {
                            return []
                        }
                    }
                    return Array.isArray(val) ? val : []
                }
                // Dynamically load all built-in tool params
                const loadedBuiltInTools = {}
                for (const key of Object.keys(inputs)) {
                    if (key.startsWith('agentToolsBuiltIn') && inputs[key]) {
                        loadedBuiltInTools[key] = parseBuiltInTools(inputs[key])
                    }
                }
                if (Object.keys(loadedBuiltInTools).length > 0) setBuiltInTools(loadedBuiltInTools)

                // Skills — disabled list (JSON-stringified array of names)
                if (inputs.disabledBuiltinSkills) {
                    try {
                        const parsed = JSON.parse(inputs.disabledBuiltinSkills)
                        if (Array.isArray(parsed)) setDisabledBuiltinSkills(parsed)
                    } catch {
                        // ignore — leave default empty array (fail-open: skills enabled)
                    }
                }

                // Tools
                if (inputs.agentTools?.length > 0) {
                    const tools = inputs.agentTools.map((t) => ({
                        name: t.agentSelectedTool,
                        toolId: t.agentSelectedTool,
                        requireHumanInput: t.agentSelectedToolRequiresHumanInput ?? false,
                        ...(t.agentSelectedToolConfig || {})
                    }))
                    setSelectedTools(tools)
                }

                // Knowledge - Document Stores
                if (inputs.agentKnowledgeDocumentStores?.length > 0) {
                    const docStores = inputs.agentKnowledgeDocumentStores.map((ds) => {
                        // documentStore format is "storeId:storeName"
                        // Extract storeId (UUID) for dropdown matching and storeName for display
                        const compositeId = ds.documentStore || ''
                        const colonIdx = compositeId.indexOf(':')
                        const storeId = colonIdx > -1 ? compositeId.substring(0, colonIdx) : compositeId
                        const displayName = colonIdx > -1 ? compositeId.substring(colonIdx + 1) : compositeId
                        return {
                            id: storeId,
                            name: displayName,
                            description: ds.docStoreDescription || '',
                            returnSourceDocuments: ds.returnSourceDocuments || false
                        }
                    })
                    setSelectedDocumentStores(docStores)
                }

                // Knowledge - Vector Embeddings
                if (inputs.agentKnowledgeVSEmbeddings?.length > 0) {
                    setKnowledgeVSEmbeddings(inputs.agentKnowledgeVSEmbeddings)
                }

                // Memory
                if (inputs.agentEnableMemory !== undefined) setEnableMemory(inputs.agentEnableMemory)
                if (inputs.agentMemoryType) setMemoryType(inputs.agentMemoryType)
                if (inputs.agentMemoryWindowSize !== undefined) setMemoryWindowSize(Number(inputs.agentMemoryWindowSize))
                if (inputs.agentMemoryMaxTokenLimit !== undefined) setMemoryMaxTokenLimit(Number(inputs.agentMemoryMaxTokenLimit))

                // Structured Output
                if (inputs.agentStructuredOutput?.length > 0) setStructuredOutput(inputs.agentStructuredOutput)

                return true
            }

            // ---- Old format (toolAgent node) — backward compatibility ----
            const toolAgentNode = flowData.nodes?.find((n) => n.data?.name === 'toolAgent')
            if (toolAgentNode) {
                const toolAgentInputs = toolAgentNode.data?.inputs || {}

                // Instruction from systemMessage
                if (toolAgentInputs.systemMessage) {
                    setCustomAssistantInstruction(toolAgentInputs.systemMessage)
                }

                // Chat model — find the node connected to toolAgent's model input
                const chatModelNode = flowData.nodes?.find((n) => n.data?.category === 'Chat Models')
                if (chatModelNode) {
                    const credentialId =
                        chatModelNode.data.credential ||
                        chatModelNode.data.inputs?.credential ||
                        chatModelNode.data.inputs?.FLOWISE_CREDENTIAL_ID ||
                        ''
                    const savedModel = {
                        name: chatModelNode.data.name,
                        credential: credentialId,
                        inputs: { ...(chatModelNode.data.inputs || {}) }
                    }
                    // Keep credential in inputs so it gets copied to freshModel.inputs
                    // but remove FLOWISE_CREDENTIAL_ID as it's redundant
                    if (credentialId) savedModel.inputs.credential = credentialId
                    delete savedModel.inputs.FLOWISE_CREDENTIAL_ID
                    restoreChatModel(savedModel)
                }

                // Memory — if a memory node exists, enable memory
                const memoryNode = flowData.nodes?.find((n) => n.data?.category === 'Memory')
                if (memoryNode) {
                    setEnableMemory(true)
                    // Map old memory node types to new memory types
                    const memoryName = memoryNode.data?.name || ''
                    if (memoryName.includes('windowMemory') || memoryName.includes('BufferWindowMemory')) {
                        setMemoryType('windowSize')
                        const windowSize = memoryNode.data?.inputs?.k || memoryNode.data?.inputs?.size
                        if (windowSize) setMemoryWindowSize(Number(windowSize))
                    } else if (memoryName.includes('conversationSummaryMemory')) {
                        setMemoryType('conversationSummary')
                    } else {
                        setMemoryType('allMessages')
                    }
                }

                // Tools — parse from edges and nodes
                // Old format: toolAgent has inputs.tools = ["{{retrieverTool_0}}", "{{calculator_0}}"]
                // We need to find tool nodes that connect to toolAgent
                const toolNodeIds = new Set()
                const retrieverToolNodes = []
                const directToolNodes = []

                // Find all nodes connected to toolAgent's tools input via edges
                if (flowData.edges) {
                    for (const edge of flowData.edges) {
                        if (edge.target === toolAgentNode.data.id && edge.targetHandle?.includes('tools')) {
                            const sourceNode = flowData.nodes?.find((n) => n.data?.id === edge.source || n.id === edge.source)
                            if (sourceNode) {
                                toolNodeIds.add(sourceNode.data?.id || sourceNode.id)
                                if (sourceNode.data?.name === 'retrieverTool') {
                                    retrieverToolNodes.push(sourceNode)
                                } else if (sourceNode.data?.category === 'Tools' || sourceNode.data?.baseClasses?.includes('Tool')) {
                                    directToolNodes.push(sourceNode)
                                }
                            }
                        }
                    }
                }

                // Map direct tool nodes (calculator, etc.) to selectedTools format
                // Include credential and saved inputs so they can be restored by initializeTools
                const parsedTools = directToolNodes.map((toolNode) => {
                    const toolData = toolNode.data || {}
                    const result = {
                        name: toolData.name,
                        toolId: toolData.name
                    }
                    // Carry over credential
                    const credentialId = toolData.credential || toolData.inputs?.credential || toolData.inputs?.FLOWISE_CREDENTIAL_ID || ''
                    if (credentialId) result.credential = credentialId
                    // Carry over saved inputs
                    if (toolData.inputs) {
                        Object.keys(toolData.inputs).forEach((key) => {
                            if (key === 'credential' || key === 'FLOWISE_CREDENTIAL_ID') return
                            result[key] = toolData.inputs[key]
                        })
                    }
                    return result
                })
                if (parsedTools.length > 0) {
                    setSelectedTools(parsedTools)
                }

                // Map retrieverTool nodes to document stores
                // retrieverTool connects to a vectorStore (documentStoreVS) which has inputs.selectedStore
                const parsedDocStores = []
                for (const rt of retrieverToolNodes) {
                    const rtInputs = rt.data?.inputs || {}
                    // Find the document store node connected to this retriever tool
                    const dsEdge = flowData.edges?.find((e) => e.target === (rt.data?.id || rt.id) && e.targetHandle?.includes('retriever'))
                    if (dsEdge) {
                        const dsNode = flowData.nodes?.find((n) => (n.data?.id || n.id) === dsEdge.source)
                        if (dsNode?.data?.inputs?.selectedStore) {
                            const storeId = dsNode.data.inputs.selectedStore
                            const storeName = rtInputs.name || storeId
                            parsedDocStores.push({
                                id: storeId,
                                name: storeName,
                                description: rtInputs.description || '',
                                returnSourceDocuments: rtInputs.returnSourceDocuments || false
                            })
                        }
                    }
                }
                if (parsedDocStores.length > 0) {
                    setSelectedDocumentStores(parsedDocStores)
                }

                return true
            }

            return false
        } catch (e) {
            console.error('Error loading agent from flowData', e)
            return false
        }
    }

    useEffect(() => {
        if (getChatModelsApi.data) {
            setChatModelsComponents(getChatModelsApi.data)

            const options = getChatModelsApi.data.map((chatModel) => ({
                label: chatModel.label,
                name: chatModel.name,
                imageSrc: `${baseURL}/api/v1/node-icon/${chatModel.name}`
            }))
            setChatModelsOptions(options)

            if (!isNewAgent && !isTemplatePreview) {
                setLoadingAssistant(true)
                getSpecificChatflowApi.request(chatflowId)
            } else {
                setLoadingAssistant(false)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatModelsApi.data])

    // TODO: Replace mocked defaultConfig with actual governance settings from database
    useEffect(() => {
        if (defaultCheckComplete) return
        // Not a new agent or no org to check — nothing to wait for
        if (!isNewAgent || !currentUser?.activeOrganizationId) {
            setDefaultCheckComplete(true)
            return
        }
        // Need both chat models and org response before we can decide
        if (!getChatModelsApi.data || getOrganizationApi.data === null) return

        try {
            if (getOrganizationApi.data?.defaultConfig) {
                const config = JSON.parse(getOrganizationApi.data.defaultConfig)
                if (config.chatModel) {
                    const saved = config.chatModel
                    const foundComponent = getChatModelsApi.data.find((c) => c.name === saved.name)
                    if (foundComponent) {
                        const chatModelId = `${foundComponent.name}_0`
                        const clonedComponent = cloneDeep(foundComponent)
                        const restored = initNode(clonedComponent, chatModelId)
                        if (saved.inputs) {
                            restored.inputs = { ...restored.inputs, ...saved.inputs }
                        }
                        // Restore credential reference
                        if (saved.credentialId || saved.credential) {
                            restored.credential = saved.credentialId || saved.credential
                            restored.inputs.FLOWISE_CREDENTIAL_ID = restored.credential
                        }
                        restored.inputParams = showHideInputParams(restored)
                        setSelectedChatModel(restored)
                        setModelConfirmed(true)
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing defaultConfig', e)
        } finally {
            setDefaultCheckComplete(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatModelsApi.data, getOrganizationApi.data, isNewAgent, currentUser?.activeOrganizationId])

    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            dispatch({ type: SET_CHATFLOW, chatflow })

            // Set agent name from chatflow
            let name = chatflow.name
            if (!name || name === 'Untitled') {
                try {
                    const fd = chatflow.flowData ? JSON.parse(chatflow.flowData) : null
                    const agentNode = fd?.nodes?.find((n) => n.data?.name === 'smartAgentAgentflow')
                    if (agentNode?.data?.label && agentNode.data.label !== 'Agent 0') {
                        name = agentNode.data.label
                    }
                } catch {
                    // ignore
                }
            }
            setAgentName(name || 'Untitled Agent')
            setLoadingAssistant(false)

            // Load agent config from flowData (handles both old toolAgent and new smartAgentAgentflow formats)
            if (chatflow.flowData) {
                loadAgentFromFlowData(chatflow.flowData)
            }
        } else if (getSpecificChatflowApi.error) {
            setLoadingAssistant(false)
            setError(`Failed to retrieve: ${getSpecificChatflowApi.error?.response?.data?.message || 'Unknown error'}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowApi.data, getSpecificChatflowApi.error])

    useEffect(() => {
        if (getChatModelsApi.error) {
            setError(getChatModelsApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatModelsApi.error])

    useEffect(() => {
        if (getDocStoresApi.error) {
            setError(getDocStoresApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDocStoresApi.error])

    // Load agent from marketplace template data passed via navigation state
    useEffect(() => {
        if (isNewAgent && location.state?.templateFlowData && getChatModelsApi.data) {
            loadAgentFromFlowData(location.state.templateFlowData)
        }
        // Template preview mode — load from templateData
        if (isTemplatePreview && templateData?.flowData && getChatModelsApi.data) {
            loadAgentFromFlowData(templateData.flowData)
            setAgentName(templateData.templateName || templateData.name || 'Template Agent')
            setLoadingAssistant(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state, getChatModelsApi.data])

    const defaultWidth = () => {
        if (isTemplatePreview) return 12
        if (!isNewAgent && !loadingAssistant) {
            return 6
        }
        return 12
    }

    const pageHeight = () => {
        return window.innerHeight - 130
    }

    // ==============================|| Render Helpers ||============================== //

    const renderBuiltInToolsSection = () => {
        const modelName = selectedChatModel?.name
        const builtInToolsMap = getBuiltInToolsMap(agentNodeDef)
        const builtInConfig = builtInToolsMap[modelName]
        if (!builtInConfig) return null

        const currentTools = getBuiltInToolsForParam(builtInConfig.paramName)

        return (
            <Box
                sx={{
                    p: 2,
                    mt: 1,
                    mb: 1,
                    border: 1,
                    borderColor: theme.palette.grey[900] + 25,
                    borderRadius: 2
                }}
            >
                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                    <Typography>Built-in Tools</Typography>
                    <TooltipWithParser title='Model-specific built-in tools provided by the LLM provider' />
                </Stack>
                <FormGroup>
                    {builtInConfig.options.map((tool) => (
                        <FormControlLabel
                            key={tool.name}
                            control={
                                <Checkbox
                                    checked={currentTools.includes(tool.name)}
                                    onChange={() => handleBuiltInToolToggle(builtInConfig.paramName, tool.name)}
                                />
                            }
                            label={
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <Typography variant='body2'>{tool.label}</Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                        - {tool.description}
                                    </Typography>
                                </Stack>
                            }
                        />
                    ))}
                </FormGroup>
            </Box>
        )
    }

    const renderSkillsSection = () => {
        if (!builtinSkillsOptions.length) return null
        return (
            <Box
                sx={{
                    p: 2,
                    mt: 1,
                    mb: 1,
                    border: 1,
                    borderColor: theme.palette.grey[900] + 25,
                    borderRadius: 2
                }}
            >
                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                    <Typography>Skills</Typography>
                    <TooltipWithParser title='Built-in skills the agent can read on demand. Uncheck to disable for this agent.' />
                </Stack>
                <FormGroup>
                    {builtinSkillsOptions.map((skill) => (
                        <FormControlLabel
                            key={skill.name}
                            control={
                                <Checkbox
                                    checked={isBuiltinSkillEnabled(skill.name)}
                                    onChange={() => handleBuiltinSkillToggle(skill.name)}
                                />
                            }
                            label={
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <Typography variant='body2'>{skill.label}</Typography>
                                    {skill.description && (
                                        <Typography variant='caption' color='text.secondary'>
                                            — {skill.description}
                                        </Typography>
                                    )}
                                </Stack>
                            }
                        />
                    ))}
                </FormGroup>
            </Box>
        )
    }

    const renderStructuredOutputSection = () => {
        return (
            <Box
                sx={{
                    p: 2,
                    mt: 1,
                    mb: 1,
                    border: 1,
                    borderColor: theme.palette.grey[900] + 25,
                    borderRadius: 2
                }}
            >
                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                    <Typography>JSON Structured Output</Typography>
                    <TooltipWithParser title='Instruct the Agent to give output in a JSON structured schema' />
                </Stack>
                {structuredOutput.map((item, index) => (
                    <Box
                        key={index}
                        sx={{
                            p: 2,
                            mt: 1,
                            mb: 1,
                            border: 1,
                            borderColor: theme.palette.grey[900] + 25,
                            borderRadius: 2
                        }}
                    >
                        <Stack direction='row' alignItems='center' justifyContent='flex-end' spacing={1}>
                            <Chip label={index} size='small' />
                            <IconButton color='error' size='small' onClick={() => removeStructuredOutputField(index)}>
                                <IconTrash size={18} />
                            </IconButton>
                        </Stack>
                        <Stack spacing={3.5}>
                            <div>
                                <Typography variant='body2' sx={{ mb: 1 }}>
                                    Key<span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <OutlinedInput
                                    size='small'
                                    placeholder='Key'
                                    value={item.key || ''}
                                    onChange={(e) => handleStructuredOutputChange(index, 'key', e.target.value)}
                                    fullWidth
                                />
                            </div>
                            <div>
                                <Typography variant='body2'>
                                    Type<span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <Dropdown
                                    name={`structuredOutputType_${index}`}
                                    options={getStructuredOutputTypeOptions(agentNodeDef)}
                                    onSelect={(newValue) => handleStructuredOutputChange(index, 'type', newValue || 'string')}
                                    value={item.type || 'string'}
                                />
                            </div>
                            {item.type === 'enum' && (
                                <div>
                                    <Typography variant='body2' sx={{ mb: 1 }}>
                                        Enum Values
                                    </Typography>
                                    <OutlinedInput
                                        size='small'
                                        placeholder='value1, value2, value3'
                                        value={item.enumValues || ''}
                                        onChange={(e) => handleStructuredOutputChange(index, 'enumValues', e.target.value)}
                                        fullWidth
                                    />
                                </div>
                            )}
                            {item.type === 'jsonArray' && (
                                <div>
                                    <Stack direction='row' alignItems='center' justifyContent='space-between'>
                                        <Stack direction='row' alignItems='center'>
                                            <Typography variant='body2'>JSON Schema</Typography>
                                            <TooltipWithParser title='JSON schema for the structured output' />
                                        </Stack>
                                        <IconButton
                                            size='small'
                                            sx={{ height: 25, width: 25 }}
                                            title='Expand'
                                            color='secondary'
                                            onClick={() =>
                                                onExpandDialogClicked(item.jsonSchema || '', `jsonSchema_${index}`, {
                                                    label: 'JSON Schema',
                                                    name: 'jsonSchema',
                                                    type: 'code',
                                                    languageType: 'json'
                                                })
                                            }
                                        >
                                            <IconArrowsMaximize />
                                        </IconButton>
                                    </Stack>
                                    <div
                                        style={{
                                            marginTop: '10px',
                                            border: '1px solid',
                                            borderColor: theme.palette.grey[900] + 25,
                                            borderRadius: '6px',
                                            height: '200px'
                                        }}
                                    >
                                        <CodeEditor
                                            value={item.jsonSchema || ''}
                                            height='200px'
                                            theme={customization.isDarkMode ? 'dark' : 'light'}
                                            lang='json'
                                            placeholder={
                                                '{\n    "answer": {\n        "type": "string",\n        "description": "Value of the answer"\n    }\n}'
                                            }
                                            onValueChange={(code) => handleStructuredOutputChange(index, 'jsonSchema', code)}
                                            basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <Typography variant='body2' sx={{ mb: 1 }}>
                                    Description<span style={{ color: 'red' }}>&nbsp;*</span>
                                </Typography>
                                <OutlinedInput
                                    size='small'
                                    placeholder='Description of the key'
                                    value={item.description || ''}
                                    onChange={(e) => handleStructuredOutputChange(index, 'description', e.target.value)}
                                    fullWidth
                                />
                            </div>
                        </Stack>
                    </Box>
                ))}
                <Button fullWidth sx={{ mt: 1, mb: 1, borderRadius: 20 }} variant='outlined' onClick={addStructuredOutputField}>
                    Add Field
                </Button>
            </Box>
        )
    }

    // ==============================|| Render ||============================== //

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column'>
                        <Box>
                            <Grid container spacing='2'>
                                <Grid item xs={12} md={defaultWidth()} lg={defaultWidth()} sm={defaultWidth()}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            paddingRight: 15
                                        }}
                                    >
                                        <Box sx={{ flexGrow: 1, py: 1.25, width: '100%' }}>
                                            <Toolbar
                                                disableGutters={true}
                                                sx={{
                                                    p: 0,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    width: '100%'
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
                                                    <StyledFab
                                                        size='small'
                                                        color='secondary'
                                                        aria-label='back'
                                                        title='Back'
                                                        onClick={() => navigate(-1)}
                                                    >
                                                        <IconArrowLeft />
                                                    </StyledFab>
                                                    {isEditingName ? (
                                                        <Stack direction='row' alignItems='center' spacing={1} sx={{ ml: 2 }}>
                                                            <OutlinedInput
                                                                size='small'
                                                                value={editingNameValue}
                                                                onChange={(e) => setEditingNameValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        saveAgentName(editingNameValue)
                                                                    } else if (e.key === 'Escape') {
                                                                        setIsEditingName(false)
                                                                    }
                                                                }}
                                                                placeholder='Agent Name'
                                                            />
                                                            <IconButton
                                                                size='small'
                                                                sx={{
                                                                    color: theme.palette.success.main,
                                                                    '&:hover': { backgroundColor: theme.palette.success.main + '20' }
                                                                }}
                                                                onClick={() => saveAgentName(editingNameValue)}
                                                            >
                                                                <IconCheck size={18} />
                                                            </IconButton>
                                                            <IconButton
                                                                size='small'
                                                                sx={{
                                                                    color: theme.palette.error.main,
                                                                    '&:hover': { backgroundColor: theme.palette.error.main + '20' }
                                                                }}
                                                                onClick={() => setIsEditingName(false)}
                                                            >
                                                                <IconX size={18} />
                                                            </IconButton>
                                                        </Stack>
                                                    ) : (
                                                        <Stack direction='row' alignItems='center' spacing={1} sx={{ ml: 2 }}>
                                                            <Typography variant='h3'>{agentName || 'Untitled'}</Typography>
                                                            {!isTemplatePreview && (
                                                                <IconButton
                                                                    size='small'
                                                                    sx={{ color: theme.palette.text.secondary }}
                                                                    onClick={() => {
                                                                        setEditingNameValue(agentName)
                                                                        setIsEditingName(true)
                                                                    }}
                                                                >
                                                                    <IconEdit size={18} />
                                                                </IconButton>
                                                            )}
                                                        </Stack>
                                                    )}
                                                </Box>
                                                <div style={{ flex: 1 }}></div>
                                                {/* Model selector in toolbar — describe mode with model selected */}
                                                {isNewAgent &&
                                                    !isTemplatePreview &&
                                                    creationMode === 'describe' &&
                                                    selectedChatModel?.name && (
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                mr: 2
                                                            }}
                                                        >
                                                            <Box sx={{ minWidth: 200, mt: -1 }}>
                                                                <Dropdown
                                                                    key={`toolbar-${selectedChatModel?.name}`}
                                                                    name='toolbarChatModel'
                                                                    options={chatModelsOptions ?? []}
                                                                    onSelect={(newValue) => {
                                                                        if (!newValue) {
                                                                            setSelectedChatModel({})
                                                                        } else if (newValue !== selectedChatModel?.name) {
                                                                            const found = chatModelsComponents.find(
                                                                                (c) => c.name === newValue
                                                                            )
                                                                            if (found) {
                                                                                previousChatModelRef.current = selectedChatModel
                                                                                const id = `${found.name}_0`
                                                                                const cloned = cloneDeep(found)
                                                                                setSelectedChatModel(initNode(cloned, id))
                                                                                setModelConfigDialogOpen(true)
                                                                            }
                                                                        }
                                                                    }}
                                                                    value={selectedChatModel?.name || 'choose an option'}
                                                                    disableClearable
                                                                />
                                                            </Box>
                                                            <IconButton
                                                                size='small'
                                                                title='Model settings'
                                                                onClick={() => setModelConfigDialogOpen(true)}
                                                                sx={{
                                                                    color: customization.isDarkMode
                                                                        ? theme.palette.common.white
                                                                        : theme.palette.text.primary
                                                                }}
                                                            >
                                                                <IconSettings size={18} />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                {isTemplatePreview ? (
                                                    <Available permission={'agents:create'}>
                                                        <StyledButton
                                                            color='secondary'
                                                            variant='contained'
                                                            title='Use Template'
                                                            onClick={() =>
                                                                navigate('/agents/new', {
                                                                    state: { templateFlowData: templateData.flowData }
                                                                })
                                                            }
                                                            startIcon={<IconCopy />}
                                                        >
                                                            Use Template
                                                        </StyledButton>
                                                    </Available>
                                                ) : (
                                                    <>
                                                        {!isNewAgent && !loadingAssistant && (
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
                                                        {isNewAgent && creationMode !== 'describe' && (
                                                            <Available permission={'agents:create'}>
                                                                <ButtonBase title='Load Agent' sx={{ borderRadius: '50%', mr: 2 }}>
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
                                                                        onClick={() => loadAgentInputRef.current?.click()}
                                                                    >
                                                                        <IconUpload stroke={1.5} size='1.3rem' />
                                                                    </Avatar>
                                                                </ButtonBase>
                                                            </Available>
                                                        )}
                                                        {!(isNewAgent && creationMode === 'describe') && (
                                                            <Available permission={'agents:create'}>
                                                                <ButtonBase title={`Save`} sx={{ borderRadius: '50%', mr: 2 }}>
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
                                                                        onClick={onSaveAndProcess}
                                                                    >
                                                                        <IconDeviceFloppy stroke={1.5} size='1.3rem' />
                                                                    </Avatar>
                                                                </ButtonBase>
                                                            </Available>
                                                        )}
                                                    </>
                                                )}
                                                {!isNewAgent && !loadingAssistant && !isTemplatePreview && (
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
                                                )}
                                            </Toolbar>
                                        </Box>

                                        {/* Mode toggle for new agents */}
                                        {isNewAgent && !isTemplatePreview && (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, mt: 1 }}>
                                                <ToggleButtonGroup
                                                    value={creationMode}
                                                    exclusive
                                                    onChange={(e, newMode) => {
                                                        if (newMode !== null) setCreationMode(newMode)
                                                    }}
                                                    sx={{
                                                        borderRadius: '24px',
                                                        backgroundColor: theme.palette.grey[100],
                                                        ...(customization.isDarkMode && {
                                                            backgroundColor: theme.palette.grey[800]
                                                        }),
                                                        '& .MuiToggleButtonGroup-grouped': {
                                                            border: 'none',
                                                            borderRadius: '24px !important',
                                                            px: 3,
                                                            py: 0.75,
                                                            textTransform: 'none',
                                                            fontWeight: 600,
                                                            fontSize: '0.875rem',
                                                            color: theme.palette.text.secondary,
                                                            '&.Mui-selected': {
                                                                backgroundColor: theme.palette.background.paper,
                                                                color: theme.palette.text.primary,
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                                                '&:hover': {
                                                                    backgroundColor: theme.palette.background.paper
                                                                }
                                                            },
                                                            '&:hover': {
                                                                backgroundColor: 'transparent'
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <ToggleButton value='describe'>Describe</ToggleButton>
                                                    <ToggleButton value='manual'>Manual</ToggleButton>
                                                </ToggleButtonGroup>
                                            </Box>
                                        )}

                                        {/* Describe mode */}
                                        {isNewAgent && !isTemplatePreview && creationMode === 'describe' && (
                                            <DescribeMode
                                                selectedChatModel={selectedChatModel}
                                                setSelectedChatModel={setSelectedChatModel}
                                                chatModelsComponents={chatModelsComponents}
                                                chatModelsOptions={chatModelsOptions}
                                                handleChatModelDataChange={handleChatModelDataChange}
                                                setAgentName={setAgentName}
                                                setCustomAssistantInstruction={setCustomAssistantInstruction}
                                                setCreationMode={setCreationMode}
                                                modelConfirmed={modelConfirmed}
                                                setModelConfirmed={setModelConfirmed}
                                                generateTask={location.state?.generateTask}
                                                defaultConfigResolved={defaultCheckComplete}
                                            />
                                        )}
                                        {/* Form content — disabled in template preview mode, hidden in describe mode */}
                                        <Box
                                            sx={{
                                                ...(isTemplatePreview ? { pointerEvents: 'none', opacity: 0.85 } : {}),
                                                ...(isNewAgent && !isTemplatePreview && creationMode === 'describe'
                                                    ? { display: 'none' }
                                                    : {})
                                            }}
                                        >
                                            {/* Select Model */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    mt: 1,
                                                    mb: 1,
                                                    border: 1,
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2
                                                }}
                                            >
                                                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                                                    <Typography>
                                                        Select Model<span style={{ color: 'red' }}>&nbsp;*</span>
                                                    </Typography>
                                                </Stack>
                                                <Dropdown
                                                    key={JSON.stringify(selectedChatModel)}
                                                    name={'chatModel'}
                                                    options={chatModelsOptions ?? []}
                                                    onSelect={(newValue) => {
                                                        if (!newValue) {
                                                            setSelectedChatModel({})
                                                        } else {
                                                            const foundChatComponent = chatModelsComponents.find(
                                                                (chatModel) => chatModel.name === newValue
                                                            )
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
                                                {selectedChatModel && Object.keys(selectedChatModel).length > 0 && (
                                                    <Accordion
                                                        sx={{
                                                            mt: 1,
                                                            boxShadow: 'none',
                                                            border: 1,
                                                            borderColor: theme.palette.grey[900] + 25,
                                                            borderRadius: '8px !important',
                                                            '&:before': { display: 'none' },
                                                            background: 'transparent'
                                                        }}
                                                    >
                                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                            <Stack direction='row' alignItems='center' spacing={1}>
                                                                <IconSettings size={20} />
                                                                <Typography>
                                                                    {selectedChatModel?.label || selectedChatModel?.name} Parameters
                                                                </Typography>
                                                            </Stack>
                                                        </AccordionSummary>
                                                        <AccordionDetails sx={{ p: 0 }}>
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
                                                        </AccordionDetails>
                                                    </Accordion>
                                                )}
                                            </Box>

                                            {/* Instructions */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    mt: 1,
                                                    mb: 1,
                                                    border: 1,
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2
                                                }}
                                            >
                                                <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                                    <Typography>
                                                        Instructions<span style={{ color: 'red' }}>&nbsp;*</span>
                                                    </Typography>
                                                    <div style={{ flex: 1 }}></div>
                                                    <IconButton
                                                        size='small'
                                                        sx={{ height: 25, width: 25 }}
                                                        title='Expand'
                                                        color='secondary'
                                                        onClick={() => onExpandDialogClicked(customAssistantInstruction)}
                                                    >
                                                        <IconArrowsMaximize />
                                                    </IconButton>
                                                    {selectedChatModel?.name && (
                                                        <Button
                                                            title='Generate instructions using model'
                                                            sx={{ borderRadius: 20 }}
                                                            size='small'
                                                            variant='text'
                                                            onClick={() => generateInstruction()}
                                                            startIcon={<IconWand size={20} />}
                                                        >
                                                            Generate
                                                        </Button>
                                                    )}
                                                </Stack>
                                                <OutlinedInput
                                                    sx={{ mt: 1, width: '100%' }}
                                                    type={'text'}
                                                    multiline={true}
                                                    rows={6}
                                                    value={customAssistantInstruction}
                                                    onChange={(event) => setCustomAssistantInstruction(event.target.value)}
                                                />
                                            </Box>

                                            {/* Built-in Tools (conditional on model) */}
                                            {selectedChatModel?.name && renderBuiltInToolsSection()}

                                            {/* Skills */}
                                            {renderSkillsSection()}

                                            {/* Tools */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    mt: 1,
                                                    mb: 1,
                                                    border: 1,
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2
                                                }}
                                            >
                                                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                                                    <Typography>Tools</Typography>
                                                    <TooltipWithParser title='Tools are actions that your agent can perform' />
                                                </Stack>
                                                {selectedTools.map((tool, index) => {
                                                    return (
                                                        <Box
                                                            sx={{
                                                                p: 0,
                                                                border: 1,
                                                                borderColor: theme.palette.grey[900] + 25,
                                                                borderRadius: 2,
                                                                mt: 2,
                                                                mb: 2
                                                            }}
                                                            key={index}
                                                        >
                                                            <Box sx={{ pl: 2, pr: 2, pt: 2, pb: 0 }}>
                                                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                                    <Typography>
                                                                        Tool<span style={{ color: 'red' }}>&nbsp;*</span>
                                                                    </Typography>
                                                                    <div style={{ flex: 1 }}></div>
                                                                    <IconButton
                                                                        color='error'
                                                                        sx={{ height: 15, width: 15, p: 0 }}
                                                                        onClick={() => {
                                                                            const newSelectedTools = selectedTools.filter(
                                                                                (t, i) => i !== index
                                                                            )
                                                                            setSelectedTools(newSelectedTools)
                                                                        }}
                                                                    >
                                                                        <IconTrash />
                                                                    </IconButton>
                                                                </div>
                                                                <Dropdown
                                                                    key={JSON.stringify(tool)}
                                                                    name={tool.name}
                                                                    options={toolOptions ?? []}
                                                                    onSelect={(newValue) => {
                                                                        if (!newValue) {
                                                                            const newSelectedTools = [...selectedTools]
                                                                            newSelectedTools[index] = {}
                                                                            setSelectedTools(newSelectedTools)
                                                                        } else {
                                                                            const foundToolComponent = toolComponents.find(
                                                                                (tool) => tool.name === newValue
                                                                            )
                                                                            if (foundToolComponent) {
                                                                                const toolId = `${foundToolComponent.name}_${index}`
                                                                                const clonedComponent = cloneDeep(foundToolComponent)
                                                                                const initToolData = initNode(clonedComponent, toolId)
                                                                                const newSelectedTools = [...selectedTools]
                                                                                newSelectedTools[index] = initToolData
                                                                                setSelectedTools(newSelectedTools)
                                                                            }
                                                                        }
                                                                    }}
                                                                    value={tool?.name || 'choose an option'}
                                                                />
                                                            </Box>
                                                            {tool && Object.keys(tool).length === 0 && (
                                                                <Box sx={{ pl: 2, pr: 2, pt: 0, pb: 2 }} />
                                                            )}
                                                            {tool && Object.keys(tool).length > 0 && (
                                                                <Box sx={{ p: 0, mt: 2, mb: 1 }}>
                                                                    {showHideInputParams(tool)
                                                                        .filter(
                                                                            (inputParam) =>
                                                                                !inputParam.hidden && inputParam.display !== false
                                                                        )
                                                                        .map((inputParam, inputIndex) => (
                                                                            <DocStoreInputHandler
                                                                                key={inputIndex}
                                                                                inputParam={inputParam}
                                                                                data={tool}
                                                                                onNodeDataChange={handleToolDataChange(index)}
                                                                            />
                                                                        ))}
                                                                    <Box sx={{ p: 2 }}>
                                                                        <Typography variant='body2'>Require Human Input</Typography>
                                                                        <SwitchInput
                                                                            value={tool.requireHumanInput ?? false}
                                                                            onChange={(newValue) => {
                                                                                const newSelectedTools = [...selectedTools]
                                                                                newSelectedTools[index] = {
                                                                                    ...newSelectedTools[index],
                                                                                    requireHumanInput: newValue
                                                                                }
                                                                                setSelectedTools(newSelectedTools)
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )
                                                })}
                                                <Button
                                                    fullWidth
                                                    title='Add Tool'
                                                    sx={{ mt: 1, mb: 1, borderRadius: 20 }}
                                                    variant='outlined'
                                                    onClick={() => setSelectedTools([...selectedTools, {}])}
                                                >
                                                    Add Tool
                                                </Button>
                                            </Box>

                                            {/* Knowledge (Document Stores) */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    mt: 1,
                                                    mb: 1,
                                                    border: 1,
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2
                                                }}
                                            >
                                                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                                                    <Typography>Knowledge (Document Stores)</Typography>
                                                    <TooltipWithParser title='Give your agent context about different document sources. Document stores must be upserted in advance.' />
                                                </Stack>
                                                <MultiDropdown
                                                    key={JSON.stringify(selectedDocumentStores)}
                                                    name={JSON.stringify(selectedDocumentStores)}
                                                    options={documentStoreOptions ?? []}
                                                    onSelect={(newValue) => {
                                                        if (!newValue) {
                                                            setSelectedDocumentStores([])
                                                        } else {
                                                            onDocStoreItemSelected(newValue)
                                                        }
                                                    }}
                                                    value={selectedDocumentStores.map((ds) => ds.id) ?? 'choose an option'}
                                                />
                                                {selectedDocumentStores.map((ds, index) => {
                                                    return (
                                                        <Box
                                                            key={index}
                                                            sx={{
                                                                p: 2,
                                                                mt: 1,
                                                                mb: 1,
                                                                border: 1,
                                                                borderColor: theme.palette.grey[900] + 25,
                                                                borderRadius: 2
                                                            }}
                                                        >
                                                            <Stack
                                                                direction='row'
                                                                alignItems='center'
                                                                justifyContent='space-between'
                                                                sx={{ mb: 2 }}
                                                            >
                                                                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                                                    {ds.name}
                                                                </Typography>
                                                                <Stack direction='row' alignItems='center' spacing={1}>
                                                                    <Chip label={index} size='small' />
                                                                    <IconButton
                                                                        color='error'
                                                                        size='small'
                                                                        onClick={() => onDocStoreItemDelete(ds.id)}
                                                                    >
                                                                        <IconTrash size={18} />
                                                                    </IconButton>
                                                                </Stack>
                                                            </Stack>
                                                            <Stack spacing={3.5} sx={{ mt: 1 }}>
                                                                <div>
                                                                    <Stack
                                                                        direction='row'
                                                                        alignItems='center'
                                                                        justifyContent='space-between'
                                                                    >
                                                                        <Typography variant='body2' sx={{ mb: 1 }}>
                                                                            Describe Knowledge<span style={{ color: 'red' }}>&nbsp;*</span>
                                                                        </Typography>
                                                                        {selectedChatModel?.name && (
                                                                            <Button
                                                                                title='Generate description using model'
                                                                                sx={{ borderRadius: 20 }}
                                                                                size='small'
                                                                                variant='text'
                                                                                onClick={() => generateDocStoreToolDesc(ds.id)}
                                                                                startIcon={<IconWand size={20} />}
                                                                            >
                                                                                Generate
                                                                            </Button>
                                                                        )}
                                                                    </Stack>
                                                                    <OutlinedInput
                                                                        sx={{ width: '100%' }}
                                                                        type={'text'}
                                                                        multiline={true}
                                                                        rows={3}
                                                                        value={ds.description}
                                                                        onChange={(event) => {
                                                                            const newSelectedDocumentStores = [...selectedDocumentStores]
                                                                            newSelectedDocumentStores[index].description =
                                                                                event.target.value
                                                                            setSelectedDocumentStores(newSelectedDocumentStores)
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Typography variant='body2'>Return Source Documents</Typography>
                                                                    <SwitchInput
                                                                        value={ds.returnSourceDocuments ?? false}
                                                                        onChange={(newValue) => {
                                                                            const newSelectedDocumentStores = [...selectedDocumentStores]
                                                                            newSelectedDocumentStores[index].returnSourceDocuments =
                                                                                newValue
                                                                            setSelectedDocumentStores(newSelectedDocumentStores)
                                                                        }}
                                                                    />
                                                                </div>
                                                            </Stack>
                                                        </Box>
                                                    )
                                                })}
                                            </Box>

                                            {/* Knowledge (Vector Embeddings) */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    mt: 1,
                                                    mb: 1,
                                                    border: 1,
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2
                                                }}
                                            >
                                                <Stack sx={{ position: 'relative', alignItems: 'center', mb: 1 }} direction='row'>
                                                    <Typography>Knowledge (Vector Embeddings)</Typography>
                                                    <TooltipWithParser title='Give your agent context about different document sources from existing vector stores and embeddings' />
                                                </Stack>
                                                {knowledgeVSEmbeddings.map((item, index) => (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            p: 2,
                                                            mt: 1,
                                                            mb: 1,
                                                            border: 1,
                                                            borderColor: theme.palette.grey[900] + 25,
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <Stack direction='row' alignItems='center' justifyContent='flex-end' spacing={1}>
                                                            <Chip label={index} size='small' />
                                                            <IconButton
                                                                color='error'
                                                                size='small'
                                                                onClick={() => {
                                                                    setKnowledgeVSEmbeddings(
                                                                        knowledgeVSEmbeddings.filter((_, i) => i !== index)
                                                                    )
                                                                }}
                                                            >
                                                                <IconTrash size={18} />
                                                            </IconButton>
                                                        </Stack>
                                                        <Stack spacing={3.5}>
                                                            <div>
                                                                <Typography variant='body2'>
                                                                    Vector Store<span style={{ color: 'red' }}>&nbsp;*</span>
                                                                </Typography>
                                                                <Dropdown
                                                                    name={`vectorStore_${index}`}
                                                                    options={vectorStoreOptions}
                                                                    onSelect={(newValue) => {
                                                                        const updated = [...knowledgeVSEmbeddings]
                                                                        const vsNode = newValue
                                                                            ? initVectorStoreNode(newValue, index)
                                                                            : null
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            vectorStore: newValue || '',
                                                                            vectorStoreNode: vsNode
                                                                        }
                                                                        setKnowledgeVSEmbeddings(updated)
                                                                    }}
                                                                    value={item.vectorStore || 'choose an option'}
                                                                />
                                                                {item.vectorStoreNode && (
                                                                    <Accordion
                                                                        sx={{
                                                                            mt: 1,
                                                                            boxShadow: 'none',
                                                                            border: 1,
                                                                            borderColor: theme.palette.grey[900] + 25,
                                                                            borderRadius: '8px !important',
                                                                            '&:before': { display: 'none' },
                                                                            background: 'transparent'
                                                                        }}
                                                                    >
                                                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                                            <Stack direction='row' alignItems='center' spacing={1}>
                                                                                <IconSettings size={20} />
                                                                                <Typography>
                                                                                    {item.vectorStoreNode.label ||
                                                                                        item.vectorStoreNode.name}{' '}
                                                                                    Parameters
                                                                                </Typography>
                                                                            </Stack>
                                                                        </AccordionSummary>
                                                                        <AccordionDetails sx={{ p: 0 }}>
                                                                            {showHideInputParams(item.vectorStoreNode)
                                                                                .filter(
                                                                                    (inputParam) =>
                                                                                        !inputParam.hidden && inputParam.display !== false
                                                                                )
                                                                                .map((inputParam, paramIndex) => (
                                                                                    <DocStoreInputHandler
                                                                                        key={paramIndex}
                                                                                        inputParam={inputParam}
                                                                                        data={item.vectorStoreNode}
                                                                                        onNodeDataChange={handleVSDataChange(index)}
                                                                                    />
                                                                                ))}
                                                                        </AccordionDetails>
                                                                    </Accordion>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <Typography variant='body2'>
                                                                    Embedding Model<span style={{ color: 'red' }}>&nbsp;*</span>
                                                                </Typography>
                                                                <Dropdown
                                                                    name={`embeddingModel_${index}`}
                                                                    options={embeddingModelOptions}
                                                                    onSelect={(newValue) => {
                                                                        const updated = [...knowledgeVSEmbeddings]
                                                                        const embNode = newValue ? initEmbeddingNode(newValue, index) : null
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            embeddingModel: newValue || '',
                                                                            embeddingNode: embNode
                                                                        }
                                                                        setKnowledgeVSEmbeddings(updated)
                                                                    }}
                                                                    value={item.embeddingModel || 'choose an option'}
                                                                />
                                                                {item.embeddingNode && (
                                                                    <Accordion
                                                                        sx={{
                                                                            mt: 1,
                                                                            boxShadow: 'none',
                                                                            border: 1,
                                                                            borderColor: theme.palette.grey[900] + 25,
                                                                            borderRadius: '8px !important',
                                                                            '&:before': { display: 'none' },
                                                                            background: 'transparent'
                                                                        }}
                                                                    >
                                                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                                            <Stack direction='row' alignItems='center' spacing={1}>
                                                                                <IconSettings size={20} />
                                                                                <Typography>
                                                                                    {item.embeddingNode.label || item.embeddingNode.name}{' '}
                                                                                    Parameters
                                                                                </Typography>
                                                                            </Stack>
                                                                        </AccordionSummary>
                                                                        <AccordionDetails sx={{ p: 0 }}>
                                                                            {showHideInputParams(item.embeddingNode)
                                                                                .filter(
                                                                                    (inputParam) =>
                                                                                        !inputParam.hidden && inputParam.display !== false
                                                                                )
                                                                                .map((inputParam, paramIndex) => (
                                                                                    <DocStoreInputHandler
                                                                                        key={paramIndex}
                                                                                        inputParam={inputParam}
                                                                                        data={item.embeddingNode}
                                                                                        onNodeDataChange={handleEmbeddingDataChange(index)}
                                                                                    />
                                                                                ))}
                                                                        </AccordionDetails>
                                                                    </Accordion>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <Typography variant='body2' sx={{ mb: 1 }}>
                                                                    Knowledge Name<span style={{ color: 'red' }}>&nbsp;*</span>
                                                                </Typography>
                                                                <OutlinedInput
                                                                    size='small'
                                                                    fullWidth
                                                                    placeholder='A short name for the knowledge base, this is useful for the AI'
                                                                    value={item.knowledgeName || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...knowledgeVSEmbeddings]
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            knowledgeName: e.target.value
                                                                        }
                                                                        setKnowledgeVSEmbeddings(updated)
                                                                    }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <Typography variant='body2' sx={{ mb: 1 }}>
                                                                    Describe Knowledge<span style={{ color: 'red' }}>&nbsp;*</span>
                                                                </Typography>
                                                                <OutlinedInput
                                                                    fullWidth
                                                                    multiline
                                                                    rows={3}
                                                                    placeholder='Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information'
                                                                    value={item.knowledgeDescription || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...knowledgeVSEmbeddings]
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            knowledgeDescription: e.target.value
                                                                        }
                                                                        setKnowledgeVSEmbeddings(updated)
                                                                    }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <Typography variant='body2'>Return Source Documents</Typography>
                                                                <SwitchInput
                                                                    value={item.returnSourceDocuments ?? false}
                                                                    onChange={(newValue) => {
                                                                        const updated = [...knowledgeVSEmbeddings]
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            returnSourceDocuments: newValue
                                                                        }
                                                                        setKnowledgeVSEmbeddings(updated)
                                                                    }}
                                                                />
                                                            </div>
                                                        </Stack>
                                                    </Box>
                                                ))}
                                                <Button
                                                    fullWidth
                                                    sx={{ mt: 1, mb: 1, borderRadius: 20 }}
                                                    variant='outlined'
                                                    onClick={() =>
                                                        setKnowledgeVSEmbeddings([
                                                            ...knowledgeVSEmbeddings,
                                                            {
                                                                vectorStore: '',
                                                                embeddingModel: '',
                                                                knowledgeName: '',
                                                                knowledgeDescription: '',
                                                                returnSourceDocuments: false
                                                            }
                                                        ])
                                                    }
                                                >
                                                    Add Vector Embedding Knowledge
                                                </Button>
                                            </Box>
                                            {renderStructuredOutputSection()}
                                        </Box>
                                        {/* End form content wrapper */}

                                        {/* Save & Load Buttons — hidden in template preview and describe mode */}
                                        {!isTemplatePreview && !(isNewAgent && creationMode === 'describe') && (
                                            <Available permission={'agents:create'}>
                                                <Stack direction='row' spacing={1} sx={{ mt: 1, mb: 1 }}>
                                                    {isNewAgent && (
                                                        <>
                                                            <input
                                                                type='file'
                                                                accept='.json'
                                                                hidden
                                                                ref={loadAgentInputRef}
                                                                onChange={(e) => {
                                                                    if (!e.target.files?.[0]) return
                                                                    const reader = new FileReader()
                                                                    reader.onload = (evt) => {
                                                                        if (evt?.target?.result) handleLoadAgent(evt.target.result)
                                                                    }
                                                                    reader.readAsText(e.target.files[0])
                                                                    e.target.value = null
                                                                }}
                                                            />
                                                            <Button
                                                                fullWidth
                                                                title='Load Agent'
                                                                sx={{ borderRadius: 20 }}
                                                                variant='outlined'
                                                                onClick={() => loadAgentInputRef.current?.click()}
                                                            >
                                                                Load Agent
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        fullWidth
                                                        title='Save Agent'
                                                        sx={{
                                                            borderRadius: 20,
                                                            background: 'linear-gradient(45deg, #673ab7 30%, #1e88e5 90%)'
                                                        }}
                                                        variant='contained'
                                                        onClick={onSaveAndProcess}
                                                    >
                                                        Save Agent
                                                    </Button>
                                                </Stack>
                                            </Available>
                                        )}
                                    </div>
                                </Grid>
                                {!isNewAgent && !loadingAssistant && !isTemplatePreview && (
                                    <Grid item xs={12} md={6} lg={6} sm={6}>
                                        <Box sx={{ mt: 2 }}>
                                            {customization.isDarkMode && (
                                                <MemoizedFullPageChat
                                                    chatflowid={chatflowId}
                                                    chatflow={canvas.chatflow}
                                                    apiHost={baseURL}
                                                    theme={{
                                                        button: {
                                                            backgroundColor: '#32353b',
                                                            iconColor: '#ffffff'
                                                        },
                                                        chatWindow: {
                                                            height: pageHeight(),
                                                            showTitle: true,
                                                            backgroundColor: '#23262c',
                                                            title: '  Preview',
                                                            botMessage: {
                                                                backgroundColor: '#32353b',
                                                                textColor: '#ffffff'
                                                            },
                                                            userMessage: {
                                                                backgroundColor: '#191b1f',
                                                                textColor: '#ffffff'
                                                            },
                                                            textInput: {
                                                                backgroundColor: '#32353b',
                                                                textColor: '#ffffff'
                                                            },
                                                            footer: {
                                                                showFooter: false
                                                            }
                                                        }
                                                    }}
                                                />
                                            )}
                                            {!customization.isDarkMode && (
                                                <MemoizedFullPageChat
                                                    chatflowid={chatflowId}
                                                    chatflow={canvas.chatflow}
                                                    apiHost={baseURL}
                                                    theme={{
                                                        button: {
                                                            backgroundColor: '#eeeeee',
                                                            iconColor: '#333333'
                                                        },
                                                        chatWindow: {
                                                            height: pageHeight(),
                                                            showTitle: true,
                                                            backgroundColor: '#fafafa',
                                                            title: '  Preview',
                                                            botMessage: {
                                                                backgroundColor: '#ffffff',
                                                                textColor: '#303235'
                                                            },
                                                            userMessage: {
                                                                backgroundColor: '#f7f8ff',
                                                                textColor: '#303235'
                                                            },
                                                            textInput: {
                                                                backgroundColor: '#ffffff',
                                                                textColor: '#303235'
                                                            },
                                                            footer: {
                                                                showFooter: false
                                                            }
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Stack>
                )}
            </MainCard>
            {loading && <BackdropLoader open={loading} />}
            {apiDialogOpen && <APICodeDialog show={apiDialogOpen} dialogProps={apiDialogProps} onCancel={() => setAPIDialogOpen(false)} />}
            {isSettingsOpen && (
                <Settings
                    chatflow={canvas.chatflow}
                    isSettingsOpen={isSettingsOpen}
                    anchorEl={settingsRef.current}
                    onClose={() => setSettingsOpen(false)}
                    onSettingsItemClick={onSettingsItemClick}
                    onUploadFile={onUploadFile}
                    isCustomAssistant={true}
                />
            )}
            <ViewMessagesDialog
                show={viewMessagesDialogOpen}
                dialogProps={viewMessagesDialogProps}
                onCancel={() => setViewMessagesDialogOpen(false)}
            />
            <ViewLeadsDialog show={viewLeadsDialogOpen} dialogProps={viewLeadsDialogProps} onCancel={() => setViewLeadsDialogOpen(false)} />
            <ChatflowConfigurationDialog
                key='agentConfiguration'
                show={chatflowConfigurationDialogOpen}
                dialogProps={chatflowConfigurationDialogProps}
                onCancel={() => setChatflowConfigurationDialogOpen(false)}
            />
            <PromptGeneratorDialog
                show={assistantPromptGeneratorDialogOpen}
                dialogProps={assistantPromptGeneratorDialogProps}
                onCancel={() => setAssistantPromptGeneratorDialogOpen(false)}
                onConfirm={(generatedInstruction) => {
                    setCustomAssistantInstruction(generatedInstruction)
                    setAssistantPromptGeneratorDialogOpen(false)
                }}
            />
            <ExpandTextDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onCancel={() => setShowExpandDialog(false)}
                onConfirm={(newValue) => {
                    if (expandDialogTarget === 'instruction') {
                        setCustomAssistantInstruction(newValue)
                    } else if (expandDialogTarget?.startsWith('jsonSchema_')) {
                        const idx = parseInt(expandDialogTarget.split('_')[1])
                        handleStructuredOutputChange(idx, 'jsonSchema', newValue)
                    }
                    setShowExpandDialog(false)
                }}
            ></ExpandTextDialog>
            <ExportAsTemplateDialog
                show={exportAsTemplateDialogOpen}
                dialogProps={exportAsTemplateDialogProps}
                onCancel={() => setExportAsTemplateDialogOpen(false)}
            />
            <Dialog
                open={modelConfigDialogOpen}
                onClose={() => {
                    if (previousChatModelRef.current) {
                        setSelectedChatModel(previousChatModelRef.current)
                        previousChatModelRef.current = null
                    }
                    setModelConfigDialogOpen(false)
                }}
                fullWidth
                maxWidth='sm'
            >
                <DialogTitle>
                    <Stack direction='row' alignItems='center' spacing={1}>
                        {selectedChatModel?.name && (
                            <Box
                                component='img'
                                src={`${baseURL}/api/v1/node-icon/${selectedChatModel.name}`}
                                alt={selectedChatModel.label}
                                sx={{
                                    width: 28,
                                    height: 28,
                                    objectFit: 'contain',
                                    borderRadius: '50%',
                                    p: 0.5,
                                    backgroundColor: customization.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                                }}
                            />
                        )}
                        <Typography variant='h4'>{selectedChatModel?.label || selectedChatModel?.name} Configuration</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedChatModel &&
                        Object.keys(selectedChatModel).length > 0 &&
                        showHideInputParams(selectedChatModel)
                            .filter(
                                (ip) =>
                                    !ip.hidden &&
                                    ip.display !== false &&
                                    ['credential', 'model', 'modelName', 'customModel', 'customModelName'].includes(ip.name)
                            )
                            .map((ip, idx) => (
                                <DocStoreInputHandler
                                    key={idx}
                                    inputParam={ip}
                                    data={selectedChatModel}
                                    onNodeDataChange={handleChatModelDataChange}
                                />
                            ))}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (previousChatModelRef.current) {
                                setSelectedChatModel(previousChatModelRef.current)
                                previousChatModelRef.current = null
                            }
                            setModelConfigDialogOpen(false)
                        }}
                    >
                        Cancel
                    </Button>
                    <StyledButton
                        variant='contained'
                        disabled={!selectedChatModel?.credential}
                        onClick={() => {
                            previousChatModelRef.current = null
                            setModelConfigDialogOpen(false)
                        }}
                    >
                        Confirm
                    </StyledButton>
                </DialogActions>
            </Dialog>
            <ConfirmDialog />
        </>
    )
}

CustomAssistantConfigurePreview.propTypes = {
    chatflowType: PropTypes.string
}

export default CustomAssistantConfigurePreview
