import { Tool } from 'langchain/tools'

interface SummaryTool {
    name: string
    description?: string
    webhook: string
    input: string
}


export class RPATool extends Tool implements SummaryTool {
    name: string

    description: string

    webhook: string

    input: string

    constructor(fields: SummaryTool) {
        super()
        this.description =  `${fields.description}. input should be a string.${fields.input}`
        this.name = fields.name
        this.webhook = fields.webhook
        this.returnDirect = true

    }

    /** @ignore */
    async _call(input: string) {
        try {
            const headers = { "Content-Type": "application/json" };
            const body = JSON.stringify({ input: input });
            // @ts-ignore
            const response = await fetch(this.webhook, {
                method: "POST",
                headers,
                body,
            }).then((res: any) => res.json());
            return response?.msg;
            // const [num, name] = parseInputs(input)
            console.log(typeof input, input)
            // return `${this.shellFile} ${name} ${num}`
            // 判断filePath是否是一个文件
           
            return ''
        } catch (error) {
            console.log(error)
            return '111'
        }
    }
}
