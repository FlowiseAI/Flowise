import { DynamicTool, DynamicToolInput } from '@langchain/core/tools'
import { BaseChain } from 'langchain/chains'
import { handleEscapeCharacters } from '../../../src/utils'

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
                    const values = await chain.call(promptValues, runManager?.getChild())
                    return values?.text
                }
                return chain.run(input, runManager?.getChild())
            }
        })
        this.chain = chain
    }
}
