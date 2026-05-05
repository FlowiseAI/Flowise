export interface SkillFrontmatter {
    name: string
    description: string
    license?: string
    compatibility?: string
    allowedTools?: string[]
    metadata?: Record<string, unknown>
}

export interface SkillMetadata extends SkillFrontmatter {
    sourcePath: string
    skillPath: string
}

export interface SkillSource {
    path: string
    label: string
}

export interface ValidationError {
    line?: number
    field?: string
    message: string
}
