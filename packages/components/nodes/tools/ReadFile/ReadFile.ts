import { z } from 'zod'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { Serializable } from '@langchain/core/load/serializable'
import { NodeFileStore } from 'langchain/stores/file/node'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

abstract class BaseFileStore extends Serializable {
    abstract readFile(path: string): Promise<string>
    abstract writeFile(path: string, contents: string): Promise<void>
}

class ReadFile_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Read File'
        this.name = 'readFile'
        this.version = 1.0
        this.type = 'ReadFile'
        this.icon = 'readfile.svg'
        this.category = 'Tools'
        this.description = 'Read file from disk'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(ReadFileTool)]
        this.inputs = [
            {
                label: 'Base Path',
                name: 'basePath',
                placeholder: `C:\\Users\\User\\Desktop`,
                type: 'string',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const basePath = nodeData.inputs?.basePath as string
        const store = basePath ? new NodeFileStore(basePath) : new NodeFileStore()
        return new ReadFileTool({ store })
    }
}

interface ReadFileParams extends ToolParams {
    store: BaseFileStore
}

/**
 * Class for reading files from the disk. Extends the StructuredTool
 * class.
 */
export class ReadFileTool extends StructuredTool {
    static lc_name() {
        return 'ReadFileTool'
    }

    schema = z.object({
        file_path: z.string().describe('name of file')
    })

    name = 'read_file'

    description = 'Read file from disk'

    store: BaseFileStore

    constructor({ store }: ReadFileParams) {
        super(...arguments)

        this.store = store
    }

    async _call({ file_path }: z.infer<typeof this.schema>) {
        return await this.store.readFile(file_path)
    }
}

module.exports = { nodeClass: ReadFile_Tools }
