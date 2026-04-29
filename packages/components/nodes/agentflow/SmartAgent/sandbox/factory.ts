import { BackendProtocol, FileData } from './protocol'
import { StateBackend } from './backends/state'

type FileStore = Record<string, FileData>

export async function createBackend(initialFiles?: FileStore): Promise<BackendProtocol> {
    const type = process.env.SANDBOX_TYPE || 'state'
    switch (type) {
        case 'state':
        default:
            return new StateBackend(initialFiles)
    }
}

export function filesystemEnabled(): boolean {
    return !!process.env.SANDBOX_TYPE
}
