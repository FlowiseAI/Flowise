import type { HeaderRenderProps, ValidationResult } from '@/core/types'

export interface AgentflowHeaderProps extends HeaderRenderProps {
    readOnly?: boolean
}

/**
 * Default header component for the Agentflow canvas
 */
export function AgentflowHeader({ flowName, isDirty, readOnly, onSave }: AgentflowHeaderProps) {
    return (
        <div className='agentflow-header'>
            <span className='agentflow-title'>
                {flowName}
                {isDirty && ' *'}
            </span>
            <div className='agentflow-header-actions'>
                <button onClick={onSave} disabled={readOnly}>
                    Save
                </button>
            </div>
        </div>
    )
}

/**
 * Creates header props from agentflow state and handlers
 */
export function createHeaderProps(
    flowName: string,
    isDirty: boolean,
    onSave: () => void,
    toJSON: () => string,
    validate: () => ValidationResult
): HeaderRenderProps {
    return {
        flowName,
        isDirty,
        onSave,
        onExport: () => {
            const json = toJSON()
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'flow.json'
            a.click()
            URL.revokeObjectURL(url)
        },
        onValidate: validate
    }
}
