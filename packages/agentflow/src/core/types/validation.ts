// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
}

export interface ValidationError {
    nodeId?: string
    edgeId?: string
    message: string
    type: 'error' | 'warning'
}
