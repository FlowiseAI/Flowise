import { BackendProtocol, FileData } from './BackendProtocol'
import { LocalBackend } from './backends/LocalBackend'
import { StateBackend } from './backends/StateBackend'

type FileStore = Record<string, FileData>

export function getSandboxType(): string {
    return process.env.SANDBOX_TYPE || 'state'
}

export async function createBackend(initialFiles?: FileStore): Promise<BackendProtocol> {
    const type = getSandboxType()
    switch (type) {
        case 'state':
            return new StateBackend(initialFiles)
        case 'local':
            return new LocalBackend(process.env.SANDBOX_LOCAL_PATH)
        default:
            throw new Error(`Unknown SANDBOX_TYPE: ${type}`)
    }
}
