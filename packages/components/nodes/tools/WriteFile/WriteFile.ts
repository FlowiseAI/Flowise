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

class WriteFile_Tools implements INode {
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
        this.label = 'Write File'
        this.name = 'writeFile'
        this.version = 1.0
        this.type = 'WriteFile'
        this.icon = 'writefile.svg'
        this.category = 'Tools'
        this.description = 'Write file to disk'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(WriteFileTool)]
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
        return new WriteFileTool({ store })
    }
}

interface WriteFileParams extends ToolParams {
    store: BaseFileStore
}

/**
 * Class for writing data to files on the disk. Extends the StructuredTool
 * class.
 */
export class WriteFileTool extends StructuredTool {
    static lc_name() {
        return 'WriteFileTool'
    }

    schema = z.object({
        file_path: z.string().describe('name of file'),
        text: z.string().describe('text to write to file')
    })

    name = 'write_file'

    description = 'Write file from disk'

    store: BaseFileStore

    constructor({ store, ...rest }: WriteFileParams) {
        super(rest)

        this.store = store
    }

    async _call({ file_path, text }: z.infer<typeof this.schema>) {
        await this.store.writeFile(file_path, text)
        return 'File written to successfully.'
    }
}

module.exports = { nodeClass: WriteFile_Tools }
