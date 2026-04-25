import { z } from 'zod'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

export interface SkillLangChainToolInput extends ToolParams {
    name: string
    description: string
    markdown: string
    schema: z.ZodObject<any, any, any, any>
    llm: BaseChatModel
}

export class SkillLangChainTool extends StructuredTool {
    name: string
    description: string
    // @ts-ignore
    schema: z.ZodObject<any, any, any, any>

    private markdown: string
    private llm: BaseChatModel

    constructor(fields: SkillLangChainToolInput) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.markdown = fields.markdown
        this.schema = fields.schema
        this.llm = fields.llm
    }

    protected async _call(arg: z.output<typeof this.schema>): Promise<string> {
        const response = await this.llm.invoke([
            { role: 'system', content: this.markdown },
            { role: 'user', content: JSON.stringify(arg) }
        ])
        return typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    }
}
