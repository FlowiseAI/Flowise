import { Serializable } from '@langchain/core/load/serializable'
import { NodeFileStore } from 'langchain/stores/file/node'
import { isUnsafeFilePath, isWithinWorkspace } from './validator'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Security configuration for file operations
 */
export interface FileSecurityConfig {
    /** Base workspace path - all file operations are restricted to this directory */
    workspacePath: string
    /** Whether to enforce workspace boundaries (default: true) */
    enforceWorkspaceBoundaries?: boolean
    /** Maximum file size in bytes (default: 10MB) */
    maxFileSize?: number
    /** Allowed file extensions (if empty, all extensions allowed) */
    allowedExtensions?: string[]
    /** Blocked file extensions */
    blockedExtensions?: string[]
}

/**
 * Secure file store that enforces workspace boundaries and validates file operations
 */
export class SecureFileStore extends Serializable {
    lc_namespace = ['flowise', 'components', 'stores', 'file']

    private config: Required<FileSecurityConfig>
    private nodeFileStore: NodeFileStore

    constructor(config: FileSecurityConfig) {
        super()

        // Set default configuration
        this.config = {
            workspacePath: config.workspacePath,
            enforceWorkspaceBoundaries: config.enforceWorkspaceBoundaries ?? true,
            maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB default
            allowedExtensions: config.allowedExtensions ?? [],
            blockedExtensions: config.blockedExtensions ?? [
                '.exe',
                '.bat',
                '.cmd',
                '.sh',
                '.ps1',
                '.vbs',
                '.scr',
                '.com',
                '.pif',
                '.dll',
                '.sys',
                '.msi',
                '.jar'
            ]
        }

        // Validate workspace path
        if (!this.config.workspacePath || !path.isAbsolute(this.config.workspacePath)) {
            throw new Error('Workspace path must be an absolute path')
        }

        // Ensure workspace directory exists
        if (!fs.existsSync(this.config.workspacePath)) {
            throw new Error(`Workspace directory does not exist: ${this.config.workspacePath}`)
        }

        // Initialize the underlying NodeFileStore with workspace path
        this.nodeFileStore = new NodeFileStore(this.config.workspacePath)
    }

    /**
     * Validates a file path against security policies
     */
    private validateFilePath(filePath: string): void {
        // Check for unsafe path patterns
        if (isUnsafeFilePath(filePath)) {
            throw new Error(`Unsafe file path detected: ${filePath}`)
        }

        // Enforce workspace boundaries if enabled
        if (this.config.enforceWorkspaceBoundaries) {
            if (!isWithinWorkspace(filePath, this.config.workspacePath)) {
                throw new Error(`File path outside workspace boundaries: ${filePath}`)
            }
        }

        // Check file extension
        const ext = path.extname(filePath).toLowerCase()

        // Check blocked extensions
        if (this.config.blockedExtensions.includes(ext)) {
            throw new Error(`File extension not allowed: ${ext}`)
        }

        // Check allowed extensions (if specified)
        if (this.config.allowedExtensions.length > 0 && !this.config.allowedExtensions.includes(ext)) {
            throw new Error(`File extension not in allowed list: ${ext}`)
        }
    }

    /**
     * Validates file size
     */
    private validateFileSize(content: string): void {
        const sizeInBytes = Buffer.byteLength(content, 'utf8')
        if (sizeInBytes > this.config.maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size: ${sizeInBytes} > ${this.config.maxFileSize}`)
        }
    }

    /**
     * Reads a file with security validation
     */
    async readFile(filePath: string): Promise<string> {
        this.validateFilePath(filePath)

        try {
            return await this.nodeFileStore.readFile(filePath)
        } catch (error) {
            // Provide generic error message to avoid information leakage
            throw new Error(`Failed to read file: ${path.basename(filePath)}`)
        }
    }

    /**
     * Writes a file with security validation
     */
    async writeFile(filePath: string, contents: string): Promise<void> {
        this.validateFilePath(filePath)
        this.validateFileSize(contents)

        try {
            // Ensure the directory exists
            const dir = path.dirname(path.resolve(this.config.workspacePath, filePath))
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }

            await this.nodeFileStore.writeFile(filePath, contents)
        } catch (error) {
            // Provide generic error message to avoid information leakage
            throw new Error(`Failed to write file: ${path.basename(filePath)}`)
        }
    }

    /**
     * Gets the workspace configuration
     */
    getConfig(): Readonly<Required<FileSecurityConfig>> {
        return { ...this.config }
    }

    /**
     * Creates a secure file store with workspace enforcement disabled (for backward compatibility)
     * WARNING: This should only be used when absolutely necessary and with proper user consent
     */
    static createUnsecure(basePath?: string): SecureFileStore {
        const workspacePath = basePath || process.cwd()
        return new SecureFileStore({
            workspacePath,
            enforceWorkspaceBoundaries: false,
            maxFileSize: 50 * 1024 * 1024, // 50MB for insecure mode
            blockedExtensions: [] // No extension restrictions in insecure mode
        })
    }
}
