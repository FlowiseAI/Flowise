import { BaseOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, FewShotPromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts'
import { BaseLanguageModel, BaseLanguageModelCallOptions } from '@langchain/core/language_models/base'
import { LLMChain } from 'langchain/chains'
import { ICommonObject } from '../../src'

export const CATEGORY = 'Output Parsers'

export const formatResponse = (response: string | object): string | object => {
    if (typeof response === 'object') {
        return { json: response }
    }
    return response
}

export const injectOutputParser = (
    outputParser: BaseOutputParser<unknown>,
    chain: LLMChain<string | object | BaseLanguageModel<any, BaseLanguageModelCallOptions>>,
    promptValues: ICommonObject | undefined = undefined
) => {
    if (outputParser && chain.prompt) {
        const formatInstructions = outputParser.getFormatInstructions()
        if (chain.prompt instanceof PromptTemplate) {
            let pt = chain.prompt
            pt.template = pt.template + '\n{format_instructions}'
            chain.prompt.partialVariables = { format_instructions: formatInstructions }
        } else if (chain.prompt instanceof ChatPromptTemplate) {
            let pt = chain.prompt
            pt.promptMessages.forEach((msg) => {
                if (msg instanceof SystemMessagePromptTemplate) {
                    ;(msg.prompt as any).partialVariables = { format_instructions: outputParser.getFormatInstructions() }
                    ;(msg.prompt as any).template = ((msg.prompt as any).template + '\n{format_instructions}') as string
                }
            })
        } else if (chain.prompt instanceof FewShotPromptTemplate) {
            chain.prompt.examplePrompt.partialVariables = { format_instructions: formatInstructions }
            chain.prompt.examplePrompt.template = chain.prompt.examplePrompt.template + '\n{format_instructions}'
        }

        chain.prompt.inputVariables.push('format_instructions')
        if (promptValues) {
            promptValues = { ...promptValues, format_instructions: outputParser.getFormatInstructions() }
        }
    }
    return promptValues
}
