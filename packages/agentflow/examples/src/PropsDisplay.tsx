/**
 * PropsDisplay Component
 *
 * Displays Agentflow component props in an expandable accordion format
 */

interface PropsDisplayProps {
    exampleName: string
    props: Record<string, string | boolean>
    exampleId: string
    showProps: boolean
    onToggleProps: (show: boolean) => void
}

export function PropsDisplay({ exampleName, props, exampleId, showProps, onToggleProps }: PropsDisplayProps) {
    return (
        <div
            key={exampleId}
            style={{
                background: '#f8f9fa',
                borderBottom: '1px solid #e0e0e0',
                flexShrink: 0
            }}
        >
            {/* Accordion Header */}
            <button
                onClick={() => onToggleProps(!showProps)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: showProps ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: showProps ? '1px solid #e0e0e0' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (!showProps) e.currentTarget.style.background = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                    if (!showProps) e.currentTarget.style.background = 'transparent'
                }}
            >
                <span style={{ fontSize: '14px', color: '#666' }}>{showProps ? '▼' : '▶'}</span>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>Agentflow Props</h3>
                <span
                    style={{
                        fontSize: '11px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 500
                    }}
                >
                    {Object.keys(props).length} props
                </span>
            </button>

            {/* Accordion Content */}
            {showProps && (
                <div
                    style={{
                        padding: '16px',
                        maxHeight: '300px',
                        overflow: 'auto'
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '16px',
                            fontSize: '13px',
                            fontFamily: 'monospace'
                        }}
                    >
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#333' }}>
                            {`<Agentflow\n${Object.entries(props)
                                .map(([key, value], index, arr) => {
                                    const isLast = index === arr.length - 1
                                    let displayValue: string

                                    if (typeof value === 'boolean') {
                                        displayValue = `{${value}}`
                                    } else if (typeof value === 'string') {
                                        // Check if it's an expression (starts with { or contains =>)
                                        if (value.startsWith('{') || value.includes('=>')) {
                                            displayValue = value
                                        } else {
                                            displayValue = `"${value}"`
                                        }
                                    } else {
                                        displayValue = `"${String(value)}"`
                                    }

                                    return `  ${key}=${displayValue}${isLast ? '' : '\n'}`
                                })
                                .join('')}\n/>`}
                        </pre>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                        ℹ️ These are the main props used in the <strong>{exampleName}</strong> example. See the source code for complete
                        implementation details.
                    </div>
                </div>
            )}
        </div>
    )
}
