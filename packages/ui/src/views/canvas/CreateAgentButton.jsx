import { useState, useEffect, useContext } from 'react'
import { useSelector } from 'react-redux'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    List,
    ListItem,
    Checkbox,
    ListItemText,
    ListSubheader
} from '@mui/material'
import { IconRobot, IconX } from '@tabler/icons-react'
import { StyledFab } from '@/ui-component/button/StyledFab'
import { flowContext } from '@/store/context/ReactFlowContext'
import { initNode, getUniqueNodeId } from '@/utils/genericHelper'
import { cloneDeep } from 'lodash'
import PropTypes from 'prop-types'

// Helper to get all node definitions - this would typically come from a prop or context
// For now, we'll assume it's passed in or available globally in a real scenario
// const allNodes = await nodesApi.getAllNodes(); // This line is conceptual

const LLM_OPTIONS = [
    {
        name: 'chatOpenAI',
        label: 'ChatOpenAI',
        icon: 'openai.svg',
        defaultModel: 'gpt-4o-mini'
    },
    {
        name: 'groqChat',
        label: 'GroqChat',
        icon: 'groq.png',
        defaultModel: 'llama3-70b-8192 (placeholder)'
    },
    {
        name: 'chatMistralAI',
        label: 'ChatMistralAI',
        icon: 'MistralAI.svg',
        defaultModel: 'mistral-tiny'
    },
    {
        name: 'chatAnthropic',
        label: 'ChatAnthropic',
        icon: 'Anthropic.svg',
        defaultModel: 'claude-3-5-sonnet@20240620'
    },
    {
        name: 'chatGoogleGenerativeAI',
        label: 'ChatGoogleGenerativeAI',
        icon: 'GoogleGemini.svg',
        defaultModel: 'gemini-1.5-flash-latest'
    },
    {
        name: 'chatGoogleVertexAI',
        label: 'ChatGoogleVertexAI',
        icon: 'GoogleVertex.svg',
        defaultModel: 'gemini-1.5-pro-exp-0801 (placeholder)'
    }
]

const CreateAgentButton = ({ nodesData, canvasPublic, setNodes, setEdges, setDirtyReactFlow }) => {
    const { reactFlowInstance } = useContext(flowContext)
    const [open, setOpen] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.')
    const [selectedLLMName, setSelectedLLMName] = useState(LLM_OPTIONS[0]?.name || '')
    const [selectedTools, setSelectedTools] = useState([])

    const [availableTools, setAvailableTools] = useState([])
    const [availableMcpTools, setAvailableMcpTools] = useState([])

    const canvas = useSelector((state) => state.canvas)

    useEffect(() => {
        if (nodesData) {
            const regularToolsInternal = nodesData.filter(
                (node) =>
                    (node.type === 'Tool' || node.baseClasses?.includes('Tool')) && // Optional chaining
                    node.category !== 'Tools (MCP)' &&
                    node.name !== 'apiTool'
            )
            const mcpGatewaysInternal = nodesData.filter((node) => node.category === 'Tools (MCP)')
            setAvailableTools(regularToolsInternal)
            setAvailableMcpTools(mcpGatewaysInternal)
        }
    }, [nodesData])

    const handleOpen = () => setOpen(true)
    const handleClose = () => {
        setOpen(false)
        // Reset form if needed
        setSystemPrompt('You are a helpful AI assistant.')
        setSelectedLLMName(LLM_OPTIONS[0]?.name || '')
        setSelectedTools([])
    }

    const handleToolSelection = (toolName) => {
        setSelectedTools((prevSelected) =>
            prevSelected.includes(toolName) ? prevSelected.filter((t) => t !== toolName) : [...prevSelected, toolName]
        )
    }

    const handleCreateAgent = () => {
        if (!reactFlowInstance || !nodesData) {
            console.error('ReactFlowInstance or nodesData not available')
            // enqueueSnackbar({ message: 'Error: Required data not available for agent creation.', options: { variant: 'error' } })
            return
        }

        const allCurrentNodes = reactFlowInstance.getNodes()
        const newNodes = []
        const newEdges = []
        let toolAgentNodeId = ''
        let llmNodeId = ''
        let memoryNodeId = ''

        const nodeSpacing = 200 // Spacing between nodes
        let currentX = 250 // Starting X position
        const startingY = 250 // Starting Y position, LLM and Memory will be above Agent

        // 1. Create and Initialize Agent LLM Node
        const llmDef = nodesData.find((n) => n.name === selectedLLMName)
        if (llmDef) {
            llmNodeId = getUniqueNodeId(llmDef, allCurrentNodes.concat(newNodes))
            const initializedLLM = initNode(cloneDeep(llmDef), llmNodeId)
            // Credentials will be blank as per user instruction
            newNodes.push({
                id: llmNodeId,
                type: 'customNode',
                position: { x: currentX, y: startingY },
                data: initializedLLM
            })
            currentX += (initializedLLM.width || 100) + nodeSpacing
        } else {
            console.error(`LLM definition not found for ${selectedLLMName}`)
            return // Stop creation if LLM is missing
        }

        // 2. Create and Initialize Answer Chat Memory Node
        const memoryDef = nodesData.find((n) => n.name === 'AAIChatMemory')
        if (memoryDef) {
            memoryNodeId = getUniqueNodeId(memoryDef, allCurrentNodes.concat(newNodes))
            const initializedMemory = initNode(cloneDeep(memoryDef), memoryNodeId)
            newNodes.push({
                id: memoryNodeId,
                type: 'customNode',
                position: { x: currentX, y: startingY }, // Place next to LLM
                data: initializedMemory
            })
            currentX += (memoryDef.width || 100) + nodeSpacing
        } else {
            console.error('AAIChatMemory definition not found')
            return // Stop creation if memory is missing
        }

        // Reset X for Tool Agent (to be below LLM/Memory or centered)
        currentX = 250 + ((llmDef?.width || 100) + (memoryDef?.width || 100) + nodeSpacing) / 2 - 150 // Centerish

        // 3. Create and Initialize Tool Agent Node
        const toolAgentDef = nodesData.find((n) => n.name === 'toolAgent')
        if (toolAgentDef) {
            toolAgentNodeId = getUniqueNodeId(toolAgentDef, allCurrentNodes.concat(newNodes))
            const initializedToolAgent = initNode(cloneDeep(toolAgentDef), toolAgentNodeId)

            initializedToolAgent.inputs.systemMessage = systemPrompt
            if (memoryNodeId) initializedToolAgent.inputs.memory = `{{${memoryNodeId}.data.instance}}`
            if (llmNodeId) initializedToolAgent.inputs.model = `{{${llmNodeId}.data.instance}}`

            const toolInstanceIds = [] // Will be populated below

            newNodes.push({
                id: toolAgentNodeId,
                type: 'customNode',
                position: { x: currentX, y: startingY + nodeSpacing + 50 },
                data: initializedToolAgent // initializedToolAgent IS the data object for the React Flow node
            })
            currentX += (toolAgentDef.width || 150) + nodeSpacing
        } else {
            console.error('ToolAgent definition not found')
            return
        }

        // Reset X for tools row, start fresh under the agent
        currentX = 250
        let toolYPos = startingY + nodeSpacing + 50 + (toolAgentDef?.height || 100) + nodeSpacing

        // 4. Create and Initialize Selected Tool Nodes
        const createdToolNodeDetails = [] // To store { id, outputAnchorId }

        for (const toolName of selectedTools) {
            const toolDef = nodesData.find((n) => n.name === toolName)
            if (toolDef) {
                const idForTool = getUniqueNodeId(toolDef, allCurrentNodes.concat(newNodes))
                const initializedTool = initNode(cloneDeep(toolDef), idForTool)
                newNodes.push({
                    id: idForTool,
                    type: 'customNode',
                    position: { x: currentX, y: toolYPos },
                    data: initializedTool
                })
                // Assuming the first output anchor is the one to connect
                const outputAnchor = initializedTool.outputAnchors?.[0]
                if (outputAnchor) {
                    // If output anchor is options type, take the default selected one.
                    const outputAnchorId =
                        outputAnchor.type === 'options' && initializedTool.outputs?.[outputAnchor.name]
                            ? outputAnchor.options.find((opt) => opt.name === initializedTool.outputs[outputAnchor.name])?.id
                            : outputAnchor.id
                    if (outputAnchorId) {
                        createdToolNodeDetails.push({ id: idForTool, outputAnchorId: outputAnchorId, name: initializedTool.name })
                    } else {
                        console.warn(`Could not determine output anchor ID for tool: ${toolName}`)
                    }
                } else {
                    console.warn(`Tool ${toolName} has no output anchors defined.`)
                }

                currentX += (initializedTool.width || 100) + nodeSpacing
                if (currentX > 1200) {
                    // simple line break
                    currentX = 250
                    toolYPos += (toolDef?.height || 50) + nodeSpacing
                }
            }
        }

        // Update Tool Agent's tools input with created tool instances
        const toolAgentNodeInArray = newNodes.find((n) => n.id === toolAgentNodeId)
        if (toolAgentNodeInArray) {
            // Check if the node was actually added
            toolAgentNodeInArray.data.inputs.tools = createdToolNodeDetails.map((t) => `{{${t.id}.data.instance}}`)
        }

        // 5. Create Edges
        // Connect LLM to Tool Agent
        if (llmNodeId && toolAgentNodeId) {
            const llmNode = newNodes.find((n) => n.id === llmNodeId)
            const llmOutputAnchor = llmNode?.data.outputAnchors?.[0] // Assuming first output
            const llmOutputId =
                llmOutputAnchor?.type === 'options' && llmNode?.data.outputs?.[llmOutputAnchor.name]
                    ? llmOutputAnchor.options.find((opt) => opt.name === llmNode.data.outputs[llmOutputAnchor.name])?.id
                    : llmOutputAnchor?.id

            const toolAgentModelInput =
                toolAgentNodeInArray?.data.inputAnchors.find((a) => a.name === 'model') ||
                toolAgentNodeInArray?.data.inputParams.find((p) => p.name === 'model')
            if (llmOutputId && toolAgentModelInput) {
                newEdges.push({
                    id: `edge-${llmNodeId}-${llmOutputId}-${toolAgentNodeId}-${toolAgentModelInput.id}`,
                    source: llmNodeId,
                    sourceHandle: llmOutputId,
                    target: toolAgentNodeId,
                    targetHandle: toolAgentModelInput.id,
                    type: 'buttonedge'
                })
            }
        }

        // Connect Memory to Tool Agent
        if (memoryNodeId && toolAgentNodeId) {
            const memoryNode = newNodes.find((n) => n.id === memoryNodeId)
            const memoryOutputAnchor = memoryNode?.data.outputAnchors?.[0]
            const memoryOutputId =
                memoryOutputAnchor?.type === 'options' && memoryNode?.data.outputs?.[memoryOutputAnchor.name]
                    ? memoryOutputAnchor.options.find((opt) => opt.name === memoryNode.data.outputs[memoryOutputAnchor.name])?.id
                    : memoryOutputAnchor?.id

            const toolAgentMemoryInput =
                toolAgentNodeInArray?.data.inputAnchors.find((a) => a.name === 'memory') ||
                toolAgentNodeInArray?.data.inputParams.find((p) => p.name === 'memory')
            if (memoryOutputId && toolAgentMemoryInput) {
                newEdges.push({
                    id: `edge-${memoryNodeId}-${memoryOutputId}-${toolAgentNodeId}-${toolAgentMemoryInput.id}`,
                    source: memoryNodeId,
                    sourceHandle: memoryOutputId,
                    target: toolAgentNodeId,
                    targetHandle: toolAgentMemoryInput.id,
                    type: 'buttonedge'
                })
            }
        }

        // Connect Tools to Tool Agent
        const toolAgentToolsInput =
            toolAgentNodeInArray?.data.inputAnchors.find((a) => a.name === 'tools') ||
            toolAgentNodeInArray?.data.inputParams.find((p) => p.name === 'tools')

        if (toolAgentToolsInput) {
            for (const toolDetail of createdToolNodeDetails) {
                if (toolDetail.outputAnchorId) {
                    newEdges.push({
                        id: `edge-${toolDetail.id}-${toolDetail.outputAnchorId}-${toolAgentNodeId}-${toolAgentToolsInput.id}`,
                        source: toolDetail.id,
                        sourceHandle: toolDetail.outputAnchorId,
                        target: toolAgentNodeId,
                        targetHandle: toolAgentToolsInput.id, // connect to the list input anchor itself
                        type: 'buttonedge'
                    })
                }
            }
        }

        // 6. Update Canvas
        if (!canvasPublic) {
            // Only allow updates if not a public view
            if (setNodes) setNodes((nds) => nds.concat(newNodes))
            if (setEdges) setEdges((eds) => eds.concat(newEdges))
            if (setDirtyReactFlow) setDirtyReactFlow() // Use prop, renamed to avoid conflict
        } else {
            // Optional: show a message that creation is disabled on public canvas
            console.warn('Agent creation disabled on public canvas view.')
        }

        handleClose()
    }

    return (
        <>
            <StyledFab
                sx={{ left: 20, top: 80 }} // Positioned below the AddNodes FAB
                size='small'
                color='secondary'
                aria-label='create-agent'
                title='Create Tool Agent'
                onClick={handleOpen}
                disabled={canvasPublic} // Disable if canvas is public
            >
                <IconRobot />
            </StyledFab>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm' aria-labelledby='create-agent-dialog-title'>
                <DialogTitle sx={{ p: 2 }} id='create-agent-dialog-title'>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Create New Tool Agent
                        <Button onClick={handleClose} sx={{ minWidth: 'auto', p: 0.5 }}>
                            <IconX />
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 2 }}>
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            label='System Prompt'
                            multiline
                            rows={3}
                            fullWidth
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            variant='outlined'
                        />
                    </Box>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id='llm-select-label'>Agent LLM</InputLabel>
                        <Select
                            labelId='llm-select-label'
                            value={selectedLLMName}
                            label='Agent LLM'
                            onChange={(e) => setSelectedLLMName(e.target.value)}
                        >
                            {LLM_OPTIONS.map((llm) => (
                                <MenuItem key={llm.name} value={llm.name}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {llm.icon && canvas?.baseURL && (
                                            <img
                                                src={`${canvas.baseURL}/api/v1/node-icon/${llm.icon}`}
                                                alt={llm.label}
                                                style={{ width: 20, height: 20, marginRight: 8 }}
                                            />
                                        )}
                                        {llm.label} ({llm.defaultModel})
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant='subtitle1' sx={{ mb: 1 }}>
                        Select Tools
                    </Typography>
                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                        <List dense disablePadding>
                            {availableTools.length > 0 && (
                                <ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '30px' }}>Standard Tools</ListSubheader>
                            )}
                            {availableTools.map((tool) => (
                                <ListItem key={tool.name} dense disablePadding sx={{ pl: 1 }}>
                                    <Checkbox
                                        edge='start'
                                        checked={selectedTools.includes(tool.name)}
                                        onChange={() => handleToolSelection(tool.name)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                    <ListItemText
                                        primary={tool.label}
                                        secondary={tool.description}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ))}
                            {availableMcpTools.length > 0 && (
                                <ListSubheader
                                    sx={{ bgcolor: 'background.paper', lineHeight: '30px', mt: availableTools.length > 0 ? 1 : 0 }}
                                >
                                    MCP Tool Gateways
                                </ListSubheader>
                            )}
                            {availableMcpTools.map((tool) => (
                                <ListItem key={tool.name} dense disablePadding sx={{ pl: 1 }}>
                                    <Checkbox
                                        edge='start'
                                        checked={selectedTools.includes(tool.name)}
                                        onChange={() => handleToolSelection(tool.name)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                    <ListItemText
                                        primary={tool.label}
                                        secondary={tool.description}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ))}
                            {availableTools.length === 0 && availableMcpTools.length === 0 && (
                                <ListItem>
                                    <ListItemText primary='No tools available or found.' sx={{ textAlign: 'center' }} />
                                </ListItem>
                            )}
                        </List>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button variant='contained' onClick={handleCreateAgent} disabled={!selectedLLMName || canvasPublic}>
                        Create Agent
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

CreateAgentButton.propTypes = {
    nodesData: PropTypes.array,
    canvasPublic: PropTypes.bool,
    setNodes: PropTypes.func,
    setEdges: PropTypes.func,
    setDirtyReactFlow: PropTypes.func
}

export default CreateAgentButton
