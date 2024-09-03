import { z } from 'zod'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { Serializable } from '@langchain/core/load/serializable'
import { NodeFileStore } from 'langchain/stores/file/node'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import * as fs from 'fs'
import * as path from 'path'

abstract class BaseFileStore extends Serializable {
    abstract readFile(path: string): Promise<string>
    abstract writeFile(path: string, contents: string): Promise<void>
}

class ReadFiletree_Tools implements INode {
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
        this.label = 'Read Filetree'
        this.name = 'readFiletree'
        this.version = 1.0
        this.type = 'ReadFiletree'
        this.icon = 'readfiletree.svg'
        this.category = 'Tools'
        this.description = 'Read file tree from disk, respecting .gitignore'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(ReadFiletreeTool)]
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
        return new ReadFiletreeTool({ store })
    }
}

interface ReadFiletreeParams extends ToolParams {
    store: BaseFileStore
}

class ReadFiletreeTool extends StructuredTool {
    static lc_name() {
        return 'ReadFiletreeTool'
    }

    schema = z.object({
        directory_path: z.string().describe('path of the directory')
    })

    name = 'read_filetree'
    description = 'Read file tree from disk, respecting .gitignore'
    store: BaseFileStore

    constructor({ store }: ReadFiletreeParams) {
        super()
        this.store = store
    }

    async _call({ directory_path }: z.infer<typeof this.schema>) {
        return this.fileTree(directory_path)
    }

    private parseGitignore(rootDir: string): string[] {
        const gitignorePath = path.join(rootDir, '.gitignore')
        let patterns = ['.git']  // Always ignore .git directory

        if (fs.existsSync(gitignorePath)) {
            const content = fs.readFileSync(gitignorePath, 'utf-8')
            patterns = patterns.concat(
                content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
            )
        }

        return patterns
    }

    private shouldIgnore(filePath: string, rootDir: string, ignorePatterns: string[]): boolean {
        const relPath = path.relative(rootDir, filePath)

        for (const pattern of ignorePatterns) {
            if (pattern.endsWith('/')) {
                // If the pattern ends with '/', it should only match directories
                if (fs.statSync(filePath).isDirectory() &&
                    (this.fnmatch(relPath, pattern.slice(0, -1)) || this.fnmatch(relPath + '/', pattern))) {
                    return true
                }
            } else {
                // For patterns without trailing '/', match both files and directories
                if (this.fnmatch(relPath, pattern)) {
                    return true
                }
            }
        }

        return false
    }

    private fnmatch(name: string, pattern: string): boolean {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
        return new RegExp(`^${regexPattern}$`).test(name)
    }

    private generateTree(rootDir: string, ignorePatterns: string[], prefix: string = ''): string {
        let output: string[] = []
        const entries = fs.readdirSync(rootDir).sort()

        ignorePatterns = this.parseGitignore(rootDir).concat(ignorePatterns)

        entries.forEach((entry, index) => {
            const entryPath = path.join(rootDir, entry)

            if (this.shouldIgnore(entryPath, rootDir, ignorePatterns)) {
                return
            }

            const isLast = (index === entries.length - 1)
            output.push(`${prefix}${isLast ? '└── ' : '├── '}${entry}`)

            if (fs.statSync(entryPath).isDirectory()) {
                output.push(this.generateTree(
                    entryPath,
                    ignorePatterns,
                    prefix + (isLast ? '    ' : '│   ')
                ))
            }
        })

        return output.join('\n')
    }

    private fileTree(inputDir: string): string {
        if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
            return `Error: ${inputDir} is not a valid directory.`
        }

        const tree = this.generateTree(inputDir, [])
        return `.\n${tree}`
    }
}

module.exports = { nodeClass: ReadFiletree_Tools }
