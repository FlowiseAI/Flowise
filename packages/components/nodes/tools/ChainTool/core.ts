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
                // prevent sending SSE events of the sub-chain
                const sseStreamer = runManager?.handlers.find((handler) => handler instanceof CustomChainHandler)?.sseStreamer
                if (runManager) {
                    const callbacks = runManager.handlers
                    for (let i = 0; i < callbacks.length; i += 1) {
                        if (callbacks[i] instanceof CustomChainHandler) {
                            ;(callbacks[i] as any).sseStreamer = undefined
                        }
                    }
                }

                if ((chain as any).prompt && (chain as any).prompt.promptValues) {
                    const promptValues = handleEscapeCharacters((chain as any).prompt.promptValues, true)

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

                const values = chain.run(input, runManager?.getChild())
                if (runManager && sseStreamer) {
                    const callbacks = runManager.handlers
                    for (let i = 0; i < callbacks.length; i += 1) {
                        if (callbacks[i] instanceof CustomChainHandler) {
                            ;(callbacks[i] as any).sseStreamer = sseStreamer
                        }
                    }
                }
                return values
            }
        })
        this.chain = chain
    }
}
