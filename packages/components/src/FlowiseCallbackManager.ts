import { CallbackManager } from '@langchain/core/callbacks/manager'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { Serialized } from '@langchain/core/dist/load/serializable'
import type { BaseMessage } from '@langchain/core/messages'
import type { ChainValues } from '@langchain/core/utils/types'
import {
    CallbackManagerForChainRun,
    CallbackManagerForLLMRun,
    CallbackManagerForRetrieverRun,
    CallbackManagerForToolRun
} from '@langchain/core/callbacks/manager'
import { v4 as uuidv4 } from 'uuid'

import { consumeCallback } from '@langchain/core/callbacks/promises'
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain'
import { LunaryHandler } from '@langchain/community/callbacks/handlers/lunary'
import { RunTree, RunTreeConfig } from 'langsmith'
import { addParentId, getParentId, isParentIdInitialized } from './handler'

export class FlowiseCallbackManager extends CallbackManager {
    parentIdHashMap: Record<string, string | undefined> = {}
    parentIdInitialized: boolean = false
    copies: FlowiseCallbackManager[] = []
    correlationId: string
    sessionId: string
    input: string
    constructor(
        id: string,
        input: string = '',
        sessionId: string = '',
        parentRunId?: string,
        options?: {
            handlers?: BaseCallbackHandler[] | undefined
            inheritableHandlers?: BaseCallbackHandler[] | undefined
            tags?: string[] | undefined
            inheritableTags?: string[] | undefined
            metadata?: Record<string, unknown> | undefined
            inheritableMetadata?: Record<string, unknown> | undefined
        }
    ) {
        super(parentRunId, options)
        this.correlationId = id
        this.input = input
        this.sessionId = sessionId
    }

    addHandler(handler: BaseCallbackHandler, inherit?: boolean): void {
        super.addHandler(handler, inherit)
    }

    removeHandler(handler: BaseCallbackHandler): void {
        super.removeHandler(handler)
    }

    setHandlers(handlers: BaseCallbackHandler[], inherit?: boolean): void {
        super.setHandlers(handlers, inherit)
    }

    async handleLLMStart(
        llm: Serialized,
        prompts: string[],
        _runId: string | undefined = undefined,
        _parentRunId: string | undefined = undefined,
        extraParams: Record<string, unknown> | undefined = undefined,
        _tags: string[] | undefined = undefined,
        _metadata: Record<string, unknown> | undefined = undefined,
        runName: string | undefined = undefined
    ): Promise<CallbackManagerForLLMRun[]> {
        console.log('******FlowiseCallbackManager.handleLLMStart()')
        return super.handleLLMStart(llm, prompts, _runId, this._parentRunId, extraParams, this.tags, this.metadata, runName)
    }

    async handleChatModelStart(
        llm: Serialized,
        messages: BaseMessage[][],
        _runId?: string,
        _parentRunId?: string,
        extraParams?: Record<string, unknown>,
        _tags?: string[],
        _metadata?: Record<string, unknown>,
        runName?: string | undefined
    ): Promise<CallbackManagerForLLMRun[]> {
        console.log('******FlowiseCallbackManager.handleChatModelStart()')
        return super.handleChatModelStart(llm, messages, _runId, this._parentRunId, extraParams, this.tags, this.metadata, runName)
    }

    async handleChainStart(
        chain: Serialized,
        inputs: ChainValues,
        runId = uuidv4(),
        runType: string | undefined = undefined,
        _tags: string[] | undefined = undefined,
        _metadata: Record<string, unknown> | undefined = undefined,
        runName: string | undefined = undefined
    ): Promise<CallbackManagerForChainRun> {
        await this.generateParentIds()
        await Promise.all(
            this.handlers.map((handler) =>
                consumeCallback(async () => {
                    if (!handler.ignoreChain) {
                        try {
                            const parentRunId = this.getDerivedParentId(handler)
                            console.log('**** Using parentRunId: ' + parentRunId)
                            await handler.handleChainStart?.(
                                chain,
                                inputs,
                                runId as string,
                                parentRunId,
                                this.tags,
                                this.metadata,
                                runType,
                                runName
                            )
                        } catch (err) {
                            console.error(`Error in handler ${handler.constructor.name}, handleChainStart: ${err}`)
                        }
                    }
                }, handler.awaitHandlers)
            )
        )
        return new CallbackManagerForChainRun(
            runId as string,
            this.handlers,
            this.inheritableHandlers,
            this.tags,
            this.inheritableTags,
            this.metadata,
            this.inheritableMetadata,
            this._parentRunId
        )
    }

    private async generateParentIds() {
        if (!isParentIdInitialized(this.correlationId)) {
            const parentIds: any = {}
            for (const handler of this.handlers) {
                if (Object.prototype.hasOwnProperty.call(handler, 'langfuse')) {
                    // parent run is created when langfuse is created
                } else if (handler instanceof LangChainTracer) {
                    const parentRunConfig: RunTreeConfig = {
                        name: 'Multichain',
                        run_type: 'chain',
                        inputs: { input: this.input },
                        serialized: {},
                        project_name: handler.projectName,
                        // @ts-ignore
                        client: handler.client
                    }
                    const parentRun = new RunTree(parentRunConfig)
                    await parentRun.postRun()
                    parentIds.langsmith = {
                        id: parentRun.id
                    }
                } else if (handler instanceof LunaryHandler) {
                    this.parentIdHashMap['lunary'] = undefined
                }
            }
            addParentId(this.correlationId, parentIds)
        }
    }

    private getDerivedParentId(handler: BaseCallbackHandler): string | undefined {
        const parentIds = getParentId(this.correlationId)
        if (!parentIds) return undefined

        if (Object.prototype.hasOwnProperty.call(handler, 'langfuse')) {
            return parentIds?.langfuse?.id
        } else if (handler instanceof LangChainTracer) {
            return parentIds?.langsmith?.id
        } else if (handler instanceof LunaryHandler) {
            return parentIds?.lunary
        }
        return undefined
    }

    async handleToolStart(
        tool: Serialized,
        input: string,
        runId?: string,
        _parentRunId?: string | undefined,
        _tags?: string[] | undefined,
        _metadata?: Record<string, unknown> | undefined,
        runName?: string | undefined
    ): Promise<CallbackManagerForToolRun> {
        return super.handleToolStart(tool, input, runId, this._parentRunId, this.tags, this.metadata, runName)
    }

    handleRetrieverStart(
        retriever: Serialized,
        query: string,
        runId?: string,
        _parentRunId?: string | undefined,
        _tags?: string[] | undefined,
        _metadata?: Record<string, unknown> | undefined,
        runName?: string | undefined
    ): Promise<CallbackManagerForRetrieverRun> {
        return super.handleRetrieverStart(retriever, query, runId, this._parentRunId, this.tags, this.metadata, runName)
    }

    copy(additionalHandlers: BaseCallbackHandler[] = [], inherit = true): CallbackManager {
        const manager = new FlowiseCallbackManager(this.correlationId, this.input, this.sessionId)
        manager.parentIdHashMap = this.parentIdHashMap
        manager.parentIdInitialized = this.parentIdInitialized
        manager.input = this.input
        for (const handler of this.handlers) {
            const inheritable = this.inheritableHandlers.includes(handler)
            manager.addHandler(handler, inheritable)
        }
        for (const tag of this.tags) {
            const inheritable = this.inheritableTags.includes(tag)
            manager.addTags([tag], inheritable)
        }
        for (const key of Object.keys(this.metadata)) {
            const inheritable = Object.keys(this.inheritableMetadata).includes(key)
            manager.addMetadata({ [key]: this.metadata[key] }, inheritable)
        }
        for (const handler of additionalHandlers) {
            if (
                // Prevent multiple copies of console_callback_handler
                manager.handlers.filter((h) => h.name === 'console_callback_handler').some((h) => h.name === handler.name)
            ) {
                continue
            }
            manager.addHandler(handler, inherit)
        }
        return manager
    }
}
