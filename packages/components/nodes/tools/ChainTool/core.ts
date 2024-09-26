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
                const childManagers = runManager?.getChild()
                const handlers = childManagers?.handlers?.filter((handler) => !(handler instanceof CustomChainHandler)) || []
                if (childManagers) childManagers.handlers = handlers

                if ((chain as any).prompt && (chain as any).prompt.promptValues) {
                    const promptValues = handleEscapeCharacters((chain as any).prompt.promptValues, true)
                    const values = await chain.call(promptValues, childManagers)
                    return values?.text
                }

                const values = chain.run(input, childManagers)
                return values
            }
        })
        this.chain = chain
    }
}
