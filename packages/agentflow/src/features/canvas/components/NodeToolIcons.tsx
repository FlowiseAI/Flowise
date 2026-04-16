import { memo } from 'react'

import { Box } from '@mui/material'
import { darken } from '@mui/material/styles'

import { useApiContext, useConfigContext } from '@/infrastructure/store'

import { getBuiltInAnthropicToolIcon, getBuiltInGeminiToolIcon, getBuiltInOpenAIToolIcon } from '../nodeIcons'

interface ToolEntry {
    [key: string]: unknown
}

type BuiltInProvider = 'openai' | 'gemini' | 'anthropic'

interface ToolConfig {
    tools: ToolEntry[]
    toolProperty: string | string[]
    builtInProvider?: BuiltInProvider
}

const builtInIconGetters: Record<BuiltInProvider, (_name: string) => React.ReactElement | null> = {
    openai: getBuiltInOpenAIToolIcon,
    gemini: getBuiltInGeminiToolIcon,
    anthropic: getBuiltInAnthropicToolIcon
}

export interface NodeToolIconsProps {
    inputs?: Record<string, unknown>
    nodeColor?: string
}

function parseToolArray(value: unknown): ToolEntry[] {
    if (!value) return []
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.map((tool: unknown) => ({ builtInTool: tool })) : []
        } catch {
            return []
        }
    }
    if (Array.isArray(value)) return value.map((tool) => ({ builtInTool: tool }))
    return []
}

function NodeToolIconsComponent({ inputs, nodeColor = '#4A90D9' }: NodeToolIconsProps) {
    const { apiBaseUrl } = useApiContext()
    const { isDarkMode } = useConfigContext()

    if (!inputs) return null

    const singleTool = inputs.selectedTool ?? inputs.toolAgentflowSelectedTool

    const toolConfigs: ToolConfig[] = [
        { tools: Array.isArray(inputs.llmTools) ? (inputs.llmTools as ToolEntry[]) : [], toolProperty: 'llmSelectedTool' },
        { tools: Array.isArray(inputs.agentTools) ? (inputs.agentTools as ToolEntry[]) : [], toolProperty: 'agentSelectedTool' },
        {
            tools: singleTool ? [{ selectedTool: singleTool }] : [],
            toolProperty: ['selectedTool', 'toolAgentflowSelectedTool']
        },
        {
            tools: Array.isArray(inputs.agentKnowledgeVSEmbeddings) ? (inputs.agentKnowledgeVSEmbeddings as ToolEntry[]) : [],
            toolProperty: ['vectorStore', 'embeddingModel']
        },
        {
            tools: parseToolArray(inputs.agentToolsBuiltInOpenAI),
            toolProperty: 'builtInTool',
            builtInProvider: 'openai' as const
        },
        {
            tools: parseToolArray(inputs.agentToolsBuiltInGemini),
            toolProperty: 'builtInTool',
            builtInProvider: 'gemini' as const
        },
        {
            tools: parseToolArray(inputs.agentToolsBuiltInAnthropic),
            toolProperty: 'builtInTool',
            builtInProvider: 'anthropic' as const
        }
    ]

    const validConfigs = toolConfigs.filter((config) => config.tools.length > 0)
    if (validConfigs.length === 0) return null

    const builtInBg = isDarkMode ? darken(nodeColor, 0.5) : darken(nodeColor, 0.2)

    return (
        <>
            {validConfigs.map((config, configIndex) => (
                <Box key={`tools-${configIndex}`} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {config.tools.flatMap((tool, toolIndex) => {
                        if (Array.isArray(config.toolProperty)) {
                            return config.toolProperty
                                .filter((prop) => tool[prop])
                                .map((prop, propIndex) => {
                                    const toolName = tool[prop] as string
                                    return (
                                        <Box
                                            key={`tool-${configIndex}-${toolIndex}-${propIndex}`}
                                            component='img'
                                            src={`${apiBaseUrl}/api/v1/node-icon/${encodeURIComponent(toolName)}`}
                                            alt={toolName}
                                            sx={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                padding: 0.3,
                                                objectFit: 'contain'
                                            }}
                                        />
                                    )
                                })
                        }

                        const toolName = tool[config.toolProperty as string] as string
                        if (!toolName) return []

                        if (config.builtInProvider) {
                            const icon = builtInIconGetters[config.builtInProvider](toolName)
                            if (!icon) return []
                            return [
                                <Box
                                    key={`tool-${configIndex}-${toolIndex}`}
                                    sx={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        backgroundColor: builtInBg,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: 0.2
                                    }}
                                >
                                    {icon}
                                </Box>
                            ]
                        }

                        return [
                            <Box
                                key={`tool-${configIndex}-${toolIndex}`}
                                component='img'
                                src={`${apiBaseUrl}/api/v1/node-icon/${encodeURIComponent(toolName)}`}
                                alt={toolName}
                                sx={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    padding: 0.3,
                                    objectFit: 'contain'
                                }}
                            />
                        ]
                    })}
                </Box>
            ))}
        </>
    )
}

export const NodeToolIcons = memo(NodeToolIconsComponent)
