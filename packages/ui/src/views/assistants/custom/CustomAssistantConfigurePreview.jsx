import { cloneDeep, set } from 'lodash'
import { memo, useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { FullPageChat } from 'flowise-embed-react'
import PropTypes from 'prop-types'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// Material-UI
import { IconButton, Avatar, ButtonBase, Toolbar, Box, Button, Grid, OutlinedInput, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconCode,
    IconArrowLeft,
    IconDeviceFloppy,
    IconSettings,
    IconX,
    IconTrash,
    IconWand,
    IconArrowsMaximize
} from '@tabler/icons-react'

// Project import
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { StyledFab } from '@/ui-component/button/StyledFab'
import ErrorBoundary from '@/ErrorBoundary'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'
import APICodeDialog from '@/views/chatflows/APICodeDialog'
import ViewMessagesDialog from '@/ui-component/dialog/ViewMessagesDialog'
import ChatflowConfigurationDialog from '@/ui-component/dialog/ChatflowConfigurationDialog'
import ViewLeadsDialog from '@/ui-component/dialog/ViewLeadsDialog'
import Settings from '@/views/settings'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import PromptGeneratorDialog from '@/ui-component/dialog/PromptGeneratorDialog'
import { Available } from '@/ui-component/rbac/available'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'
import { SwitchInput } from '@/ui-component/switch/Switch'

// API
import assistantsApi from '@/api/assistants'
import chatflowsApi from '@/api/chatflows'
import nodesApi from '@/api/nodes'
import documentstoreApi from '@/api/documentstore'

// Const
import { baseURL } from '@/store/constant'
import { SET_CHATFLOW, closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// Utils
import { initNode, showHideInputParams } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import { toolAgentFlow } from './toolAgentFlow'

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

const CustomAssistantConfigurePreview = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const settingsRef = useRef()
    const canvas = useSelector((state) => state.canvas)
    const customization = useSelector((state) => state.customization)

    const getSpecificAssistantApi = useApi(assistantsApi.getSpecificAssistant)
    const getChatModelsApi = useApi(assistantsApi.getChatModels)
    const getDocStoresApi = useApi(assistantsApi.getDocStores)
    const getToolsApi = useApi(assistantsApi.getTools)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    const { id: customAssistantId } = useParams()

    const [chatModelsComponents, setChatModelsComponents] = useState([])
    const [chatModelsOptions, setChatModelsOptions] = useState([])
    const [selectedChatModel, setSelectedChatModel] = useState({})
    const [selectedCustomAssistant, setSelectedCustomAssistant] = useState({})
    const [customAssistantInstruction, setCustomAssistantInstruction] = useState('You are helpful assistant')
    const [customAssistantFlowId, setCustomAssistantFlowId] = useState()
    const [documentStoreOptions, setDocumentStoreOptions] = useState([])
    const [selectedDocumentStores, setSelectedDocumentStores] = useState([])
    const [toolComponents, setToolComponents] = useState([])
    const [toolOptions, setToolOptions] = useState([])
    const [selectedTools, setSelectedTools] = useState([])

    const [apiDialogOpen, setAPIDialogOpen] = useState(false)
    const [apiDialogProps, setAPIDialogProps] = useState({})
    const [viewMessagesDialogOpen, setViewMessagesDialogOpen] = useState(false)
    const [viewMessagesDialogProps, setViewMessagesDialogProps] = useState({})
    const [viewLeadsDialogOpen, setViewLeadsDialogOpen] = useState(false)
    const [viewLeadsDialogProps, setViewLeadsDialogProps] = useState({})
    const [chatflowConfigurationDialogOpen, setChatflowConfigurationDialogOpen] = useState(false)
    const [chatflowConfigurationDialogProps, setChatflowConfigurationDialogProps] = useState({})
    const [isSettingsOpen, setSettingsOpen] = useState(false)
    const [assistantPromptGeneratorDialogOpen, setAssistantPromptGeneratorDialogOpen] = useState(false)
    const [assistantPromptGeneratorDialogProps, setAssistantPromptGeneratorDialogProps] = useState({})
    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})

    const [loading, setLoading] = useState(false)
    const [loadingAssistant, setLoadingAssistant] = useState(true)
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

        if (!selectedChatModel || !selectedChatModel.name) {
            canSubmit = false
        }

        canSubmit = checkInputParamsMandatory()

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

    const onSaveAndProcess = async () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const flowData = await prepareConfig()
            if (!flowData) return
            const saveObj = {
                id: customAssistantId,
                name: selectedCustomAssistant.name,
                flowData: JSON.stringify(flowData),
                type: 'ASSISTANT'
            }
            try {
                let saveResp
                if (!customAssistantFlowId) {
                    saveResp = await chatflowsApi.createNewChatflow(saveObj)
                } else {
                    saveResp = await chatflowsApi.updateChatflow(customAssistantFlowId, saveObj)
                }

                if (saveResp.data) {
                    setCustomAssistantFlowId(saveResp.data.id)
                    dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })

                    const assistantDetails = {
                        ...selectedCustomAssistant,
                        chatModel: selectedChatModel,
                        instruction: customAssistantInstruction,
                        flowId: saveResp.data.id,
                        documentStores: selectedDocumentStores,
                        tools: selectedTools
                    }

                    const saveAssistantResp = await assistantsApi.updateAssistant(customAssistantId, {
                        details: JSON.stringify(assistantDetails)
                    })

                    if (saveAssistantResp.data) {
                        setLoading(false)
                        enqueueSnackbar({
                            message: 'Assistant saved successfully',
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
                }
            } catch (error) {
                setLoading(false)
                enqueueSnackbar({
                    message: `Failed to save assistant: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
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

    const addTools = async (toolAgentId) => {
        const nodes = []
        const edges = []

        for (let i = 0; i < selectedTools.length; i++) {
            try {
                const tool = selectedTools[i]
                const toolId = `${tool.name}_${i}`
                const toolNodeData = cloneDeep(tool)
                set(toolNodeData, 'inputs', tool.inputs)

                const toolNodeObj = {
                    id: toolId,
                    data: {
                        ...toolNodeData,
                        id: toolId
                    }
                }
                nodes.push(toolNodeObj)

                const toolEdge = {
                    source: toolId,
                    sourceHandle: `${toolId}-output-${tool.name}-Tool`,
                    target: toolAgentId,
                    targetHandle: `${toolAgentId}-input-tools-Tool`,
                    type: 'buttonedge',
                    id: `${toolId}-${toolId}-output-${tool.name}-Tool-${toolAgentId}-${toolAgentId}-input-tools-Tool`
                }
                edges.push(toolEdge)
            } catch (error) {
                console.error('Error adding tool', error)
            }
        }

        return { nodes, edges }
    }

    const addDocStore = async (toolAgentId) => {
        const docStoreVSNode = await nodesApi.getSpecificNode('documentStoreVS')
        const retrieverToolNode = await nodesApi.getSpecificNode('retrieverTool')

        const nodes = []
        const edges = []

        for (let i = 0; i < selectedDocumentStores.length; i++) {
            try {
                const docStoreVSId = `documentStoreVS_${i}`
                const retrieverToolId = `retrieverTool_${i}`

                const docStoreVSNodeData = cloneDeep(initNode(docStoreVSNode.data, docStoreVSId))
                const retrieverToolNodeData = cloneDeep(initNode(retrieverToolNode.data, retrieverToolId))

                set(docStoreVSNodeData, 'inputs.selectedStore', selectedDocumentStores[i].id)
                set(docStoreVSNodeData, 'outputs.output', 'retriever')

                const docStoreOption = documentStoreOptions.find((ds) => ds.name === selectedDocumentStores[i].id)
                // convert to small case and replace space with underscore
                const name = (docStoreOption?.label || '')
                    .toLowerCase()
                    .replace(/ /g, '_')
                    .replace(/[^a-z0-9_-]/g, '')
                const desc = selectedDocumentStores[i].description || docStoreOption?.description || ''

                set(retrieverToolNodeData, 'inputs', {
                    name,
                    description: desc,
                    retriever: `{{${docStoreVSId}.data.instance}}`,
                    returnSourceDocuments: selectedDocumentStores[i].returnSourceDocuments ?? false
                })

                const docStoreVS = {
                    id: docStoreVSId,
                    data: {
                        ...docStoreVSNodeData,
                        id: docStoreVSId
                    }
                }
                nodes.push(docStoreVS)

                const retrieverTool = {
                    id: retrieverToolId,
                    data: {
                        ...retrieverToolNodeData,
                        id: retrieverToolId
                    }
                }
                nodes.push(retrieverTool)

                const docStoreVSEdge = {
                    source: docStoreVSId,
                    sourceHandle: `${docStoreVSId}-output-retriever-BaseRetriever`,
                    target: retrieverToolId,
                    targetHandle: `${retrieverToolId}-input-retriever-BaseRetriever`,
                    type: 'buttonedge',
                    id: `${docStoreVSId}-${docStoreVSId}-output-retriever-BaseRetriever-${retrieverToolId}-${retrieverToolId}-input-retriever-BaseRetriever`
                }
                edges.push(docStoreVSEdge)

                const retrieverToolEdge = {
                    source: retrieverToolId,
                    sourceHandle: `${retrieverToolId}-output-retrieverTool-RetrieverTool|DynamicTool|Tool|StructuredTool|Runnable`,
                    target: toolAgentId,
                    targetHandle: `${toolAgentId}-input-tools-Tool`,
                    type: 'buttonedge',
                    id: `${retrieverToolId}-${retrieverToolId}-output-retrieverTool-RetrieverTool|DynamicTool|Tool|StructuredTool|Runnable-${toolAgentId}-${toolAgentId}-input-tools-Tool`
                }
                edges.push(retrieverToolEdge)
            } catch (error) {
                console.error('Error adding doc store', error)
            }
        }

        return { nodes, edges }
    }

    const prepareConfig = async () => {
        try {
            const config = {}

            const nodes = toolAgentFlow.nodes
            const edges = toolAgentFlow.edges
            const chatModelId = `${selectedChatModel.name}_0`
            const existingChatModelId = nodes.find((node) => node.data.category === 'Chat Models')?.id

            // Replace Chat Model
            let filteredNodes = nodes.filter((node) => node.data.category !== 'Chat Models')
            const toBeReplaceNode = {
                id: chatModelId,
                data: {
                    ...selectedChatModel,
                    id: chatModelId
                }
            }
            filteredNodes.push(toBeReplaceNode)

            // Replace Tool Agent inputs
            const toolAgentNode = filteredNodes.find((node) => node.data.name === 'toolAgent')
            const toolAgentId = toolAgentNode.id
            set(toolAgentNode.data.inputs, 'model', `{{${chatModelId}}}`)
            set(toolAgentNode.data.inputs, 'systemMessage', `${customAssistantInstruction}`)

            const agentTools = []
            if (selectedDocumentStores.length > 0) {
                const retrieverTools = selectedDocumentStores.map((_, index) => `{{retrieverTool_${index}}}`)
                agentTools.push(...retrieverTools)
            }
            if (selectedTools.length > 0) {
                const tools = selectedTools.map((_, index) => `{{${selectedTools[index].id}}}`)
                agentTools.push(...tools)
            }
            set(toolAgentNode.data.inputs, 'tools', agentTools)

            filteredNodes = filteredNodes.map((node) => (node.id === toolAgentNode.id ? toolAgentNode : node))

            // Go through each edge and loop through each key. Check if the string value of each key includes/contains existingChatModelId, if yes replace with chatModelId
            let filteredEdges = edges.map((edge) => {
                const newEdge = { ...edge }
                Object.keys(newEdge).forEach((key) => {
                    if (newEdge[key].includes(existingChatModelId)) {
                        newEdge[key] = newEdge[key].replaceAll(existingChatModelId, chatModelId)
                    }
                })
                return newEdge
            })

            // Add Doc Store
            if (selectedDocumentStores.length > 0) {
                const { nodes: newNodes, edges: newEdges } = await addDocStore(toolAgentId)
                filteredNodes = [...filteredNodes, ...newNodes]
                filteredEdges = [...filteredEdges, ...newEdges]
            }

            // Add Tools
            if (selectedTools.length > 0) {
                const { nodes: newNodes, edges: newEdges } = await addTools(toolAgentId)
                filteredNodes = [...filteredNodes, ...newNodes]
                filteredEdges = [...filteredEdges, ...newEdges]
            }

            config.nodes = filteredNodes
            config.edges = filteredEdges

            return config
        } catch (error) {
            console.error('Error preparing config', error)
            enqueueSnackbar({
                message: `Failed to save assistant: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
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
            return undefined
        }
    }

    const onSettingsItemClick = (setting) => {
        setSettingsOpen(false)

        if (setting === 'deleteAssistant') {
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
        } else if (setting === 'chatflowConfiguration') {
            setChatflowConfigurationDialogProps({
                title: `Assistant Configuration`,
                chatflow: canvas.chatflow
            })
            setChatflowConfigurationDialogOpen(true)
        }
    }

    const handleDeleteFlow = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${selectedCustomAssistant.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed && customAssistantId) {
            try {
                const resp = await assistantsApi.deleteAssistant(customAssistantId)
                if (resp.data && customAssistantFlowId) {
                    await chatflowsApi.deleteChatflow(customAssistantFlowId)
                }
                navigate(-1)
            } catch (error) {
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
    }

    const onExpandDialogClicked = (value) => {
        const dialogProps = {
            value,
            inputParam: {
                label: 'Instructions',
                name: 'instructions',
                type: 'string'
            },
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
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
                // replace the description of the selected document store
                const newSelectedDocumentStores = selectedDocumentStores.map((ds) => {
                    if (ds.id === storeId) {
                        return {
                            ...ds,
                            description: content
                        }
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
            chatflowid: customAssistantFlowId,
            chatflowApiKeyId: canvas.chatflow.apikeyid,
            isSessionMemory: true
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

    useEffect(() => {
        getChatModelsApi.request()
        getDocStoresApi.request()
        getToolsApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getDocStoresApi.data) {
            // Set options
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

            // Set options
            const options = getToolsApi.data.map((ds) => ({
                label: ds.label,
                name: ds.name,
                description: ds.description
            }))
            setToolOptions(options)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getToolsApi.data])

    useEffect(() => {
        if (getChatModelsApi.data) {
            setChatModelsComponents(getChatModelsApi.data)

            // Set options
            const options = getChatModelsApi.data.map((chatModel) => ({
                label: chatModel.label,
                name: chatModel.name,
                imageSrc: `${baseURL}/api/v1/node-icon/${chatModel.name}`
            }))
            setChatModelsOptions(options)

            if (customAssistantId) {
                setLoadingAssistant(true)
                getSpecificAssistantApi.request(customAssistantId)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatModelsApi.data])

    useEffect(() => {
        if (getSpecificAssistantApi.data) {
            setLoadingAssistant(false)
            try {
                const assistantDetails = JSON.parse(getSpecificAssistantApi.data.details)
                setSelectedCustomAssistant(assistantDetails)

                if (assistantDetails.chatModel) {
                    setSelectedChatModel(assistantDetails.chatModel)
                }

                if (assistantDetails.instruction) {
                    setCustomAssistantInstruction(assistantDetails.instruction)
                }

                if (assistantDetails.flowId) {
                    setCustomAssistantFlowId(assistantDetails.flowId)
                    getSpecificChatflowApi.request(assistantDetails.flowId)
                }

                if (assistantDetails.documentStores) {
                    setSelectedDocumentStores(assistantDetails.documentStores)
                }

                if (assistantDetails.tools) {
                    setSelectedTools(assistantDetails.tools)
                }
            } catch (error) {
                console.error('Error parsing assistant details', error)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificAssistantApi.data])

    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            dispatch({ type: SET_CHATFLOW, chatflow })
        } else if (getSpecificChatflowApi.error) {
            setError(`Failed to retrieve: ${getSpecificChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowApi.data, getSpecificChatflowApi.error])

    useEffect(() => {
        if (getSpecificAssistantApi.error) {
            setLoadingAssistant(false)
            setError(getSpecificAssistantApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificAssistantApi.error])

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

    const defaultWidth = () => {
        if (customAssistantFlowId && !loadingAssistant) {
            return 6
        }
        return 12
    }

    const pageHeight = () => {
        return window.innerHeight - 130
    }

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
                                                    <Typography sx={{ ml: 2, mr: 2 }} variant='h3'>
                                                        {selectedCustomAssistant?.name ?? ''}
                                                    </Typography>
                                                </Box>
                                                <div style={{ flex: 1 }}></div>
                                                {customAssistantFlowId && !loadingAssistant && (
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
                                                <Available permission={'assistants:create'}>
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
                                                {customAssistantFlowId && !loadingAssistant && (
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
                                                {!customAssistantFlowId && !loadingAssistant && (
                                                    <Available permission={'assistants:delete'}>
                                                        <ButtonBase ref={settingsRef} title='Delete Assistant' sx={{ borderRadius: '50%' }}>
                                                            <Avatar
                                                                variant='rounded'
                                                                sx={{
                                                                    ...theme.typography.commonAvatar,
                                                                    ...theme.typography.mediumAvatar,
                                                                    transition: 'all .2s ease-in-out',
                                                                    background: theme.palette.error.light,
                                                                    color: theme.palette.error.dark,
                                                                    '&:hover': {
                                                                        background: theme.palette.error.dark,
                                                                        color: theme.palette.error.light
                                                                    }
                                                                }}
                                                                onClick={handleDeleteFlow}
                                                            >
                                                                <IconTrash stroke={1.5} size='1.3rem' />
                                                            </Avatar>
                                                        </ButtonBase>
                                                    </Available>
                                                )}
                                            </Toolbar>
                                        </Box>
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
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <Typography>
                                                    Select Model<span style={{ color: 'red' }}>&nbsp;*</span>
                                                </Typography>
                                            </div>
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
                                        </Box>
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
                                                    sx={{
                                                        height: 25,
                                                        width: 25
                                                    }}
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
                                                <Typography>Knowledge (Document Stores)</Typography>
                                                <TooltipWithParser title='Give your assistant context about different document sources. Document stores must be upserted in advance.' />
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
                                            {selectedDocumentStores.length > 0 && (
                                                <Stack sx={{ mt: 3, position: 'relative', alignItems: 'center' }} direction='row'>
                                                    <Typography>
                                                        Describe Knowledge<span style={{ color: 'red' }}>&nbsp;*</span>
                                                    </Typography>
                                                    <TooltipWithParser title='Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information' />
                                                </Stack>
                                            )}
                                            {selectedDocumentStores.map((ds, index) => {
                                                return (
                                                    <Box sx={{ mt: 1, mb: 2 }} key={index}>
                                                        <Stack sx={{ position: 'relative', alignItems: 'center' }} direction='row'>
                                                            <div
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
                                                                    marginRight: 10,
                                                                    marginBottom: 10
                                                                }}
                                                            >
                                                                <span style={{ color: 'rgb(116,66,16)', marginRight: 10 }}>{ds.name}</span>
                                                                <IconButton
                                                                    sx={{ height: 15, width: 15, p: 0 }}
                                                                    onClick={() => onDocStoreItemDelete(ds.id)}
                                                                >
                                                                    <IconX />
                                                                </IconButton>
                                                            </div>
                                                            <div style={{ flex: 1 }}></div>
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
                                                            sx={{ mt: 1, width: '100%' }}
                                                            type={'text'}
                                                            multiline={true}
                                                            rows={3}
                                                            value={ds.description}
                                                            onChange={(event) => {
                                                                const newSelectedDocumentStores = [...selectedDocumentStores]
                                                                newSelectedDocumentStores[index].description = event.target.value
                                                                setSelectedDocumentStores(newSelectedDocumentStores)
                                                            }}
                                                        />
                                                        <Stack sx={{ mt: 2, position: 'relative', alignItems: 'center' }} direction='row'>
                                                            <Typography>Return Source Documents</Typography>
                                                            <TooltipWithParser title='Return the actual source documents that were used to answer the question' />
                                                        </Stack>
                                                        <SwitchInput
                                                            value={ds.returnSourceDocuments ?? false}
                                                            onChange={(newValue) => {
                                                                const newSelectedDocumentStores = [...selectedDocumentStores]
                                                                newSelectedDocumentStores[index].returnSourceDocuments = newValue
                                                                setSelectedDocumentStores(newSelectedDocumentStores)
                                                            }}
                                                        />
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                        {selectedChatModel && Object.keys(selectedChatModel).length > 0 && (
                                            <Box
                                                sx={{
                                                    p: 0,
                                                    mt: 1,
                                                    mb: 1,
                                                    border: 1,
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2
                                                }}
                                            >
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
                                            </Box>
                                        )}
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
                                                <Typography>Tools</Typography>
                                                <TooltipWithParser title='Tools are actions that your assistant can perform' />
                                            </Stack>
                                            {selectedTools.map((tool, index) => {
                                                return (
                                                    <Box
                                                        sx={{
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
                                                                        const newSelectedTools = selectedTools.filter((t, i) => i !== index)
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
                                                            <Box
                                                                sx={{
                                                                    p: 0,
                                                                    mt: 2,
                                                                    mb: 1
                                                                }}
                                                            >
                                                                {showHideInputParams(tool)
                                                                    .filter(
                                                                        (inputParam) => !inputParam.hidden && inputParam.display !== false
                                                                    )
                                                                    .map((inputParam, inputIndex) => (
                                                                        <DocStoreInputHandler
                                                                            key={inputIndex}
                                                                            inputParam={inputParam}
                                                                            data={tool}
                                                                            onNodeDataChange={handleToolDataChange(index)}
                                                                        />
                                                                    ))}
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
                                        {selectedChatModel && Object.keys(selectedChatModel).length > 0 && (
                                            <Available permission={'assistants:create'}>
                                                <Button
                                                    fullWidth
                                                    title='Save Assistant'
                                                    sx={{
                                                        mt: 1,
                                                        mb: 1,
                                                        borderRadius: 20,
                                                        background: 'linear-gradient(45deg, #673ab7 30%, #1e88e5 90%)'
                                                    }}
                                                    variant='contained'
                                                    onClick={onSaveAndProcess}
                                                >
                                                    Save Assistant
                                                </Button>
                                            </Available>
                                        )}
                                    </div>
                                </Grid>
                                {customAssistantFlowId && !loadingAssistant && (
                                    <Grid item xs={12} md={6} lg={6} sm={6}>
                                        <Box sx={{ mt: 2 }}>
                                            {customization.isDarkMode && (
                                                <MemoizedFullPageChat
                                                    chatflowid={customAssistantFlowId}
                                                    chatflow={canvas.chatflow}
                                                    apiHost={baseURL}
                                                    chatflowConfig={{}}
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
                                                    chatflowid={customAssistantFlowId}
                                                    chatflow={canvas.chatflow}
                                                    apiHost={baseURL}
                                                    chatflowConfig={{}}
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
                key='chatflowConfiguration'
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
                    setCustomAssistantInstruction(newValue)
                    setShowExpandDialog(false)
                }}
            ></ExpandTextDialog>
            <ConfirmDialog />
        </>
    )
}

export default CustomAssistantConfigurePreview
