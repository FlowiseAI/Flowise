import { DynamicTool, DynamicToolInput } from '@langchain/core/tools'
import { BaseChain } from 'langchain/chains'
import { handleEscapeCharacters } from '../../../src/utils'
import { CustomChainHandler } from '../../../src'

export interface ChainToolInput extends Omit<DynamicToolInput, 'func'> {
    chain: BaseChain
}

export class ChainTool extends DynamicTool {
    chain: BaseChain

    constructor({ chain, ...rest }: ChainToolInput) {
        super({
            ...rest,
            func: async (input, runManager) => {
                // To enable LLM Chain which has promptValues
                if ((chain as any).prompt && (chain as any).prompt.promptValues) {
                    const promptValues = handleEscapeCharacters((chain as any).prompt.promptValues, true)
                    const sseStreamer = runManager?.handlers.find((handler) => handler instanceof CustomChainHandler)?.sseStreamer
                    if (runManager) {
                        const callbacks = runManager.handlers
                        for (let i = 0; i < callbacks.length; i += 1) {
                            if (callbacks[i] instanceof CustomChainHandler) {
                                ;(callbacks[i] as any).sseStreamer = undefined
                            }
                        }
                    }

                    const values = await chain.call(promptValues, runManager?.getChild())
                    if (runManager && sseStreamer) {
                        const callbacks = runManager.handlers
                        for (let i = 0; i < callbacks.length; i += 1) {
                            if (callbacks[i] instanceof CustomChainHandler) {
                                ;(callbacks[i] as any).sseStreamer = sseStreamer
                            }
                        }
                    }
                    return values?.text
                }
                return chain.run(input, runManager?.getChild())
            }
        })
        this.chain = chain
    }
}
