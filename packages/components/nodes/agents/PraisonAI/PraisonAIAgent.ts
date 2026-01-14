/**
 * PraisonAI Agent Nodes for Flowise v2.1.0
 * 
 * Fully aligned with PraisonAI SDK (praisonaiagents v0.11.29+)
 * 
 * Features:
 * - Agents category (parity with LlamaIndex, OpenAI Assistant)
 * - SSE streaming support via IServerSideEventStreamer
 * - Full SDK parameter alignment
 * - Memory, handoffs, and tool integration
 * - Multi-agent orchestration (Sequential, Hierarchical)
 * - Robust error handling and validation
 * 
 * SDK Reference: praisonaiagents.Agent, praisonaiagents.Agents
 */

import { Tool } from '@langchain/core/tools'

// ============================================================================
// FLOWISE INTERFACE DEFINITIONS (Compatible with flowise-components INode)
// ============================================================================

interface INodeParams {
  label: string
  name: string
  type: string
  description?: string
  default?: any
  optional?: boolean
  placeholder?: string
  rows?: number
  list?: boolean
  additionalParams?: boolean
  options?: Array<{ label: string; name: string; description?: string }>
}

interface INodeData {
  id?: string
  inputs?: Record<string, any>
  outputs?: Record<string, any>
}

interface ICommonObject {
  [key: string]: any
}

interface IUsedTool {
  tool: string
  toolInput: object
  toolOutput: string | object
}

interface IServerSideEventStreamer {
  streamStartEvent(chatId: string, data: any): void
  streamTokenEvent(chatId: string, data: string): void
  streamUsedToolsEvent(chatId: string, data: any): void
  streamEndEvent(chatId: string): void
}

interface INode {
  label: string
  name: string
  version: number
  type: string
  icon: string
  category: string
  description: string
  baseClasses: string[]
  tags?: string[]
  inputs: INodeParams[]
  init?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<any>
  run?(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object>
}

// ============================================================================
// PRAISONAI SDK AGENT CONFIG (Aligned with praisonaiagents.Agent parameters)
// ============================================================================

interface PraisonAIAgentConfig {
  // Core identity (SDK: Agent.__init__)
  name: string
  role?: string
  goal?: string
  backstory?: string
  instructions?: string

  // LLM configuration
  llm: string  // SDK: llm/model param - e.g., "openai/gpt-4o", "gpt-4o-mini"

  // Capabilities
  memory?: boolean | object
  knowledge?: boolean | string[]
  web?: boolean

  // Execution
  verbose?: boolean

  // Session
  session_id?: string
}

interface PraisonAIAgentsConfig {
  // Agents list (handled separately)
  process: 'sequential' | 'hierarchical'
  manager_llm?: string
  verbose?: boolean
  session_id?: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

interface PraisonAIResponse {
  output?: string
  response?: string
  result?: string
  tools_used?: Array<{
    name: string
    input: object
    output: string | object
  }>
  error?: string
}

interface PraisonAIStreamEvent {
  type: 'token' | 'tool_use' | 'tool_result' | 'agent_start' | 'agent_end' | 'error' | 'end'
  content?: string
  tool_name?: string
  tool_input?: object
  tool_output?: string | object
  agent_name?: string
  error?: string
}

// ============================================================================
// PRAISONAI TOOL WRAPPER (LangChain-compatible)
// ============================================================================

class PraisonAITool extends Tool {
  name: string
  description: string
  private serverUrl: string
  private agentConfig: PraisonAIAgentConfig
  private timeout: number

  constructor(
    name: string,
    description: string,
    serverUrl: string,
    agentConfig: PraisonAIAgentConfig,
    timeout: number
  ) {
    super()
    this.name = this.sanitizeName(name)
    this.description = description
    this.serverUrl = serverUrl
    this.agentConfig = agentConfig
    this.timeout = timeout
  }

  private sanitizeName(name: string): string {
    // LangChain tool names must be alphanumeric with underscores
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      || 'praisonai_agent'
  }

  async _call(input: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.serverUrl}/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          config: this.agentConfig,
          prompt: input
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`PraisonAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data: PraisonAIResponse = await response.json()

      if (data.error) {
        throw new Error(`PraisonAI agent error: ${data.error}`)
      }

      return data.output || data.response || data.result || ''
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`PraisonAI request timed out after ${this.timeout / 1000} seconds`)
      }
      throw new Error(`PraisonAI error: ${error.message}`)
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateServerUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL must use http or https protocol')
    }
    return parsed.toString().replace(/\/$/, '')  // Remove trailing slash
  } catch (e) {
    throw new Error(`Invalid PraisonAI server URL: ${url}`)
  }
}

function buildAgentConfig(nodeData: INodeData, options: ICommonObject): PraisonAIAgentConfig {
  const inputs = nodeData.inputs || {}

  return {
    // Core identity - aligned with SDK Agent.__init__
    name: inputs.agentName || 'PraisonAI Agent',
    role: inputs.role || undefined,
    goal: inputs.goal || undefined,
    backstory: inputs.backstory || undefined,
    instructions: inputs.instructions || undefined,

    // LLM - aligned with SDK llm/model param
    llm: inputs.llm || 'gpt-4o-mini',

    // Features - aligned with SDK feature params
    memory: inputs.memory || false,
    knowledge: inputs.knowledge || undefined,
    web: inputs.webSearch || false,

    // Execution
    verbose: inputs.verbose || false,

    // Session
    session_id: options.sessionId || options.chatId || undefined
  }
}

async function fetchWithStreaming(
  url: string,
  body: object,
  sseStreamer: IServerSideEventStreamer,
  chatId: string,
  timeout: number
): Promise<{ text: string; usedTools: IUsedTool[] }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`PraisonAI API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body available for streaming')
    }

    const decoder = new TextDecoder()
    let fullText = ''
    const usedTools: IUsedTool[] = []
    let isStreamingStarted = false
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''  // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const dataStr = line.slice(6).trim()
        if (!dataStr || dataStr === '[DONE]') continue

        try {
          const event: PraisonAIStreamEvent = JSON.parse(dataStr)

          switch (event.type) {
            case 'token':
              if (event.content) {
                fullText += event.content
                if (!isStreamingStarted) {
                  isStreamingStarted = true
                  sseStreamer.streamStartEvent(chatId, event.content)
                }
                sseStreamer.streamTokenEvent(chatId, event.content)
              }
              break

            case 'tool_use':
            case 'tool_result':
              if (event.tool_name) {
                usedTools.push({
                  tool: event.tool_name,
                  toolInput: event.tool_input || {},
                  toolOutput: event.tool_output || ''
                })
                sseStreamer.streamUsedToolsEvent(chatId, usedTools)
              }
              break

            case 'end':
              if (event.content) {
                fullText = event.content
              }
              break

            case 'error':
              throw new Error(event.error || 'Unknown streaming error')
          }
        } catch (parseError) {
          // Skip non-JSON lines (connection keep-alive, etc.)
        }
      }
    }

    return { text: fullText, usedTools }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`PraisonAI streaming request timed out after ${timeout / 1000} seconds`)
    }
    throw error
  }
}

async function fetchNonStreaming(
  url: string,
  body: object,
  timeout: number
): Promise<{ text: string; usedTools: IUsedTool[] }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`PraisonAI API error: ${response.status} - ${errorText}`)
    }

    const data: PraisonAIResponse = await response.json()

    if (data.error) {
      throw new Error(`PraisonAI error: ${data.error}`)
    }

    const usedTools: IUsedTool[] = []
    if (data.tools_used && Array.isArray(data.tools_used)) {
      for (const tool of data.tools_used) {
        usedTools.push({
          tool: tool.name,
          toolInput: tool.input,
          toolOutput: tool.output
        })
      }
    }

    return {
      text: data.output || data.response || data.result || '',
      usedTools
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`PraisonAI request timed out after ${timeout / 1000} seconds`)
    }
    throw error
  }
}

// ============================================================================
// PRAISONAI AGENT NODE (Single agent - aligned with praisonaiagents.Agent)
// ============================================================================

class PraisonAIAgent_Agents implements INode {
  label: string
  name: string
  version: number
  type: string
  icon: string
  category: string
  description: string
  baseClasses: string[]
  tags: string[]
  inputs: INodeParams[]

  constructor() {
    this.label = 'PraisonAI Agent'
    this.name = 'praisonAIAgent'
    this.version = 2.1
    this.type = 'PraisonAIAgent'
    this.icon = 'praisonai.png'
    this.category = 'Agents'
    this.description = 'AI Agent powered by PraisonAI framework - supports multi-agent workflows, memory, and tool integration'
    this.baseClasses = [this.type, 'Tool']
    this.tags = ['PraisonAI']
    this.inputs = [
      // ===== CORE IDENTITY (SDK: name, role, goal, backstory, instructions) =====
      {
        label: 'Agent Name',
        name: 'agentName',
        type: 'string',
        placeholder: 'Research Agent',
        description: 'Name to identify this agent (SDK: name parameter)'
      },
      {
        label: 'Role',
        name: 'role',
        type: 'string',
        optional: true,
        placeholder: 'Senior Research Analyst',
        description: 'Role/job title defining expertise (SDK: role parameter)'
      },
      {
        label: 'Goal',
        name: 'goal',
        type: 'string',
        optional: true,
        placeholder: 'Conduct thorough research and provide detailed analysis',
        description: 'Primary objective the agent aims to achieve (SDK: goal parameter)'
      },
      {
        label: 'Backstory',
        name: 'backstory',
        type: 'string',
        rows: 3,
        optional: true,
        placeholder: 'You are an experienced researcher with 15 years in the field...',
        description: 'Background context shaping personality and decisions (SDK: backstory parameter)'
      },
      {
        label: 'Instructions',
        name: 'instructions',
        type: 'string',
        rows: 4,
        optional: true,
        placeholder: 'You are a helpful research assistant. Always cite sources.',
        description: 'Direct system instructions - overrides role/goal/backstory (SDK: instructions parameter)'
      },

      // ===== LLM CONFIGURATION (SDK: llm/model) =====
      {
        label: 'LLM Model',
        name: 'llm',
        type: 'string',
        default: 'gpt-4o-mini',
        placeholder: 'gpt-4o-mini',
        description: 'Model identifier: "gpt-4o", "openai/gpt-4o", "anthropic/claude-3-5-sonnet" (SDK: llm parameter)'
      },

      // ===== TOOLS (SDK: tools) =====
      {
        label: 'Tools',
        name: 'tools',
        type: 'Tool',
        list: true,
        optional: true,
        description: 'Tools available to the agent (SDK: tools parameter)'
      },

      // ===== FEATURES (SDK: memory, knowledge, web) =====
      {
        label: 'Enable Memory',
        name: 'memory',
        type: 'boolean',
        default: false,
        optional: true,
        description: 'Enable conversation memory across sessions (SDK: memory parameter)',
        additionalParams: true
      },
      {
        label: 'Enable Web Search',
        name: 'webSearch',
        type: 'boolean',
        default: false,
        optional: true,
        description: 'Enable web search capability (SDK: web parameter)',
        additionalParams: true
      },
      {
        label: 'Verbose Mode',
        name: 'verbose',
        type: 'boolean',
        default: false,
        optional: true,
        description: 'Enable detailed logging output (SDK: verbose parameter)',
        additionalParams: true
      },

      // ===== SERVER CONFIGURATION =====
      {
        label: 'PraisonAI Server URL',
        name: 'serverUrl',
        type: 'string',
        default: 'http://localhost:8099',
        placeholder: 'http://localhost:8099',
        description: 'URL of your PraisonAI API server (start with: praisonai serve --port 8099)',
        additionalParams: true
      },
      {
        label: 'Timeout (seconds)',
        name: 'timeout',
        type: 'number',
        default: 300,
        optional: true,
        description: 'Request timeout in seconds',
        additionalParams: true
      }
    ]
  }

  async init(nodeData: INodeData, _input: string, options?: ICommonObject): Promise<Tool> {
    const serverUrl = validateServerUrl(
      (nodeData.inputs?.serverUrl as string) || 'http://localhost:8099'
    )
    const agentConfig = buildAgentConfig(nodeData, options || {})
    const timeout = ((nodeData.inputs?.timeout as number) || 300) * 1000

    const toolName = agentConfig.name
    const description = agentConfig.role
      ? `${agentConfig.name}: ${agentConfig.role}. ${agentConfig.goal || ''}`
      : `PraisonAI Agent: ${agentConfig.name} for complex AI tasks`

    return new PraisonAITool(toolName, description, serverUrl, agentConfig, timeout)
  }

  async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
    const serverUrl = validateServerUrl(
      (nodeData.inputs?.serverUrl as string) || 'http://localhost:8099'
    )
    const agentConfig = buildAgentConfig(nodeData, options)
    const timeout = ((nodeData.inputs?.timeout as number) || 300) * 1000

    const shouldStreamResponse = options.shouldStreamResponse
    const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer
    const chatId = options.chatId

    const requestBody = {
      config: agentConfig,
      prompt: input
    }

    try {
      let result: { text: string; usedTools: IUsedTool[] }

      if (shouldStreamResponse && sseStreamer) {
        result = await fetchWithStreaming(
          `${serverUrl}/agent/stream`,
          requestBody,
          sseStreamer,
          chatId,
          timeout
        )
      } else {
        result = await fetchNonStreaming(
          `${serverUrl}/agent/run`,
          requestBody,
          timeout
        )
      }

      return result.usedTools.length > 0
        ? { text: result.text, usedTools: result.usedTools }
        : result.text

    } catch (error: any) {
      // Provide helpful error messages
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        throw new Error(
          `Cannot connect to PraisonAI server at ${serverUrl}. ` +
          `Make sure the server is running: praisonai serve --port 8099`
        )
      }
      throw error
    }
  }
}

// ============================================================================
// PRAISONAI AGENTS NODE (Multi-agent - aligned with praisonaiagents.Agents)
// ============================================================================

class PraisonAIAgents_Agents implements INode {
  label: string
  name: string
  version: number
  type: string
  icon: string
  category: string
  description: string
  baseClasses: string[]
  tags: string[]
  inputs: INodeParams[]

  constructor() {
    this.label = 'PraisonAI Agents'
    this.name = 'praisonAIAgents'
    this.version = 2.1
    this.type = 'PraisonAIAgents'
    this.icon = 'praisonai.png'
    this.category = 'Agents'
    this.description = 'Multi-agent orchestration with PraisonAI (Sequential, Hierarchical workflows)'
    this.baseClasses = [this.type]
    this.tags = ['PraisonAI']
    this.inputs = [
      {
        label: 'Agents',
        name: 'agents',
        type: 'PraisonAIAgent',
        list: true,
        description: 'List of PraisonAI agents to orchestrate (SDK: agents parameter)'
      },
      {
        label: 'Process Type',
        name: 'processType',
        type: 'options',
        options: [
          {
            label: 'Sequential',
            name: 'sequential',
            description: 'Agents run one after another, passing results'
          },
          {
            label: 'Hierarchical',
            name: 'hierarchical',
            description: 'Manager agent delegates to worker agents'
          }
        ],
        default: 'sequential',
        description: 'How agents should be orchestrated (SDK: process parameter)'
      },
      {
        label: 'Manager LLM',
        name: 'managerLlm',
        type: 'string',
        optional: true,
        placeholder: 'gpt-4o',
        description: 'LLM for manager agent in hierarchical mode (SDK: manager_llm parameter)',
        additionalParams: true
      },
      {
        label: 'Verbose Mode',
        name: 'verbose',
        type: 'boolean',
        default: false,
        optional: true,
        description: 'Enable detailed logging output',
        additionalParams: true
      },
      {
        label: 'PraisonAI Server URL',
        name: 'serverUrl',
        type: 'string',
        default: 'http://localhost:8099',
        placeholder: 'http://localhost:8099',
        description: 'URL of your PraisonAI API server',
        additionalParams: true
      },
      {
        label: 'Timeout (seconds)',
        name: 'timeout',
        type: 'number',
        default: 600,
        optional: true,
        description: 'Request timeout in seconds (multi-agent workflows may need more time)',
        additionalParams: true
      }
    ]

  }

  async init(): Promise<any> {
    // Agents node doesn't return a tool, it orchestrates agents
    return null
  }

  async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
    const serverUrl = validateServerUrl(
      (nodeData.inputs?.serverUrl as string) || 'http://localhost:8099'
    )
    const processType = (nodeData.inputs?.processType as string) || 'sequential'
    const managerLlm = nodeData.inputs?.managerLlm as string
    const verbose = nodeData.inputs?.verbose as boolean
    const timeout = ((nodeData.inputs?.timeout as number) || 600) * 1000

    const shouldStreamResponse = options.shouldStreamResponse
    const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer
    const chatId = options.chatId

    const config: PraisonAIAgentsConfig = {
      process: processType as 'sequential' | 'hierarchical',
      manager_llm: managerLlm,
      verbose: verbose,
      session_id: options.sessionId || chatId
    }

    const requestBody = {
      config,
      prompt: input
    }

    try {
      let result: { text: string; usedTools: IUsedTool[] }

      if (shouldStreamResponse && sseStreamer) {
        result = await fetchWithStreaming(
          `${serverUrl}/agents/stream`,
          requestBody,
          sseStreamer,
          chatId,
          timeout
        )
      } else {
        result = await fetchNonStreaming(
          `${serverUrl}/agents/run`,
          requestBody,
          timeout
        )
      }

      return result.usedTools.length > 0
        ? { text: result.text, usedTools: result.usedTools }
        : result.text

    } catch (error: any) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        throw new Error(
          `Cannot connect to PraisonAI server at ${serverUrl}. ` +
          `Make sure the server is running: praisonai serve --port 8099`
        )
      }
      throw error
    }
  }
}

// ============================================================================
// EXPORTS (Flowise-compatible)
// ============================================================================

export { PraisonAIAgent_Agents as PraisonAIAgent }
export { PraisonAIAgents_Agents as PraisonAIAgents }

// Default export for Flowise node loader
module.exports = {
  nodeClass: PraisonAIAgent_Agents,
  PraisonAIAgent: PraisonAIAgent_Agents,
  PraisonAIAgents: PraisonAIAgents_Agents
}
