import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { AgentAction, AgentFinish } from '@langchain/core/agents'
import { ChainValues } from '@langchain/core/utils/types'
import { IServerSideEventStreamer } from '../Interface'
import { Serialized } from '@langchain/core/load/serializable'

/**
 * Custom callback handler for streaming detailed intermediate information
 * during agent execution, specifically tool invocation inputs and outputs.
 */
export class CustomStreamingHandler extends BaseCallbackHandler {
    name = 'custom_streaming_handler'
    
    private sseStreamer: IServerSideEventStreamer
    private chatId: string
    
    constructor(sseStreamer: IServerSideEventStreamer, chatId: string) {
        super()
        this.sseStreamer = sseStreamer
        this.chatId = chatId
    }
    
    /**
     * Handle the start of a tool invocation
     */
    async handleToolStart(
        tool: Serialized,
        input: string,
        runId: string,
        parentRunId?: string,
        tags?: string[],
        metadata?: Record<string, unknown>,
        runName?: string
    ): Promise<void> {
        if (!this.sseStreamer) return
        
        const toolName = typeof tool === 'object' && tool.name ? tool.name : 'unknown-tool'
        const toolInput = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
        
        // Stream the tool invocation details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(
            this.chatId,
            'agent_trace',
            {
                step: "tool_start",
                name: toolName,
                input: toolInput,
                runId,
                parentRunId: parentRunId || null
            }
        )
    }
    
    /**
     * Handle the end of a tool invocation
     */
    async handleToolEnd(
        output: string | object,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        if (!this.sseStreamer) return
        
        const toolOutput = typeof output === 'string' ? output : JSON.stringify(output, null, 2)
        
        // Stream the tool output details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(
            this.chatId,
            'agent_trace',
            {
                step: "tool_end",
                output: toolOutput,
                runId,
                parentRunId: parentRunId || null
            }
        )
    }
    
    /**
     * Handle tool errors
     */
    async handleToolError(
        error: Error,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        if (!this.sseStreamer) return
        
        // Stream the tool error details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(
            this.chatId,
            'agent_trace',
            {
                step: "tool_error",
                error: error.message,
                runId,
                parentRunId: parentRunId || null
            }
        )
    }
    
    /**
     * Handle agent actions
     */
    async handleAgentAction(
        action: AgentAction,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        if (!this.sseStreamer) return
        
        // Stream the agent action details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(
            this.chatId,
            'agent_trace',
            {
                step: "agent_action",
                action: JSON.stringify(action),
                runId,
                parentRunId: parentRunId || null
            }
        )
    }
} 