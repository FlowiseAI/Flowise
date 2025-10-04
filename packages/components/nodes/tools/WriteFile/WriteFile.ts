import { z } from 'zod'
import path from 'path'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { Serializable } from '@langchain/core/load/serializable'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getUserHome } from '../../../src/utils'
import { SecureFileStore, FileSecurityConfig } from '../../../src/SecureFileStore'

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
    warning: string

    constructor() {
        this.label = 'Write File'
        this.name = 'writeFile'
        this.version = 2.0
        this.type = 'WriteFile'
        this.icon = 'writefile.svg'
        this.category = 'Tools'
        this.warning = 'This tool can be used to write files to the disk. It is recommended to use this tool with caution.'
        this.description = 'Write file to disk'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(WriteFileTool)]
        this.inputs = [
            {
                label: 'Workspace Path',
                name: 'workspacePath',
                placeholder: `C:\\Users\\User\\MyProject`,
                type: 'string',
                description: 'Base workspace directory for file operations. All file paths will be relative to this directory.',
                optional: true
            },
            {
                label: 'Enforce Workspace Boundaries',
                name: 'enforceWorkspaceBoundaries',
                type: 'boolean',
                description: 'When enabled, restricts file access to the workspace directory for security. Recommended: true',
                default: true,
                optional: true
            },
            {
                label: 'Max File Size (MB)',
                name: 'maxFileSize',
                type: 'number',
                description: 'Maximum file size in megabytes that can be written',
                default: 10,
                optional: true
            },
            {
                label: 'Allowed Extensions',
                name: 'allowedExtensions',
                type: 'string',
                description: 'Comma-separated list of allowed file extensions (e.g., .txt,.json,.md). Leave empty to allow all.',
                placeholder: '.txt,.json,.md,.py,.js',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const workspacePath = nodeData.inputs?.workspacePath as string
        const enforceWorkspaceBoundaries = nodeData.inputs?.enforceWorkspaceBoundaries !== false // Default to true
        const maxFileSize = nodeData.inputs?.maxFileSize as number
        const allowedExtensions = nodeData.inputs?.allowedExtensions as string

        // Parse allowed extensions
        const allowedExtensionsList = allowedExtensions ? allowedExtensions.split(',').map((ext) => ext.trim().toLowerCase()) : []

        let store: BaseFileStore

        if (workspacePath) {
            // Create secure file store with workspace boundaries
            const config: FileSecurityConfig = {
                workspacePath,
                enforceWorkspaceBoundaries,
                maxFileSize: maxFileSize ? maxFileSize * 1024 * 1024 : undefined, // Convert MB to bytes
                allowedExtensions: allowedExtensionsList.length > 0 ? allowedExtensionsList : undefined
            }
            store = new SecureFileStore(config)
        } else {
            // Fallback to current working directory with security warnings
            if (enforceWorkspaceBoundaries) {
                const fallbackWorkspacePath = path.join(getUserHome(), '.flowise')
                console.warn(`[WriteFile] No workspace path specified, using ${fallbackWorkspacePath} with security restrictions`)
                store = new SecureFileStore({
                    workspacePath: fallbackWorkspacePath,
                    enforceWorkspaceBoundaries: true,
                    maxFileSize: maxFileSize ? maxFileSize * 1024 * 1024 : undefined,
                    allowedExtensions: allowedExtensionsList.length > 0 ? allowedExtensionsList : undefined
                })
            } else {
                console.warn('[WriteFile] SECURITY WARNING: Workspace boundaries disabled - unrestricted file access enabled')
                store = SecureFileStore.createUnsecure()
            }
        }

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
    }) as any

    name = 'write_file'

    description = 'Write file to disk'

    store: BaseFileStore

    constructor({ store, ...rest }: WriteFileParams) {
        super(rest)

        this.store = store
    }

    async _call({ file_path, text }: z.infer<typeof this.schema>) {
        await this.store.writeFile(file_path, text)
        return `File written to ${file_path} successfully.`
    }
}

module.exports = { nodeClass: WriteFile_Tools }
