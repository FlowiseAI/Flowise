/**
 * Shared TypeScript types for the Skill service layer.
 *
 * These types never leak into the database — the only relational column is the
 * `Skill` row defined in `packages/server/src/database/entities/Skill.ts`.
 */

// =============================================================================
// File tree (persisted as JSON in Skill.fileTree)
// =============================================================================

export type SkillNodeType = 'file' | 'folder'

export interface SkillTreeNode {
    id: string
    node_type: SkillNodeType
    name: string
    parent_id: string | null
    order: number
    extension: string
    size: number
}

export interface SkillFileTree {
    nodes: SkillTreeNode[]
}

// =============================================================================
// Classification
// =============================================================================

export type SkillKind = 'skill' | 'data' | 'code' | 'binary'

// =============================================================================
// Per-node sidecar stored next to the content payload.
// =============================================================================

export interface SkillNodeMeta {
    digest: string
    size: number
    mime: string
}

// =============================================================================
// Skill-author metadata (lives inside the .json payload of skill-kind nodes)
// =============================================================================

export type ToolReferenceType = 'custom'

export interface ToolReference {
    type: ToolReferenceType
    provider: string
    toolName: string
    uuid: string
    credentialId?: string
    enabled: boolean
    config?: Record<string, unknown>
}

export interface FileReference {
    source: 'app'
    nodeId: string
}

export interface SkillMetadata {
    tools: Record<string /* uuid */, ToolReference>
    files?: FileReference[]
}

// =============================================================================
// The compile-time projection of a tree node (+ its payload).
// =============================================================================

export interface SkillDocument {
    nodeId: string
    kind: SkillKind
    path: string
    filename: string
    extension: string
    content: string
    metadata: SkillMetadata
    contentDigest: string
}

// =============================================================================
// Compiled artifacts — SkillBundle + entries
// =============================================================================

export interface ToolDependency {
    type: ToolReferenceType
    provider: string
    toolName: string
}

export interface ToolDependencies {
    dependencies: ToolDependency[]
    references: ToolReference[]
}

export interface AssetReferences {
    references: FileReference[]
}

export interface SkillBundleEntry {
    nodeId: string
    kind: SkillKind
    name: string
    path: string
    source: { nodeId: string; contentDigest: string }
    tools: ToolDependencies
    files: AssetReferences
    content: string
    // Pre-propagation snapshot of the node's directly-referenced tools/files.
    // Optional so bundles compiled before this field was added still load.
    directTools?: ToolDependency[]
    directFiles?: FileReference[]
}

export interface SkillBundle {
    schemaVersion: 1
    bundleId: string
    workspaceId: string
    skillId: string
    builtAt: string
    entries: Record<string, SkillBundleEntry>
    dependencyGraph: Record<string, string[]>
    reverseGraph: Record<string, string[]>
}

// =============================================================================
// Compile input
// =============================================================================

export interface CompileInput {
    skillId: string
    workspaceId: string
    fileTree: SkillFileTree
    nodeDocuments: SkillDocument[]
}

// =============================================================================
// Payload shapes on disk
// =============================================================================

export interface SkillNodePayload {
    content: string
    metadata?: SkillMetadata
}

export interface PublishedPointer {
    currentBundleId: string
    publishedAt: string
}

// =============================================================================
// API DTOs
// =============================================================================

export interface CreateSkillDto {
    name: string
    description?: string
    iconSrc?: string
    color?: string
}

export interface UpdateSkillDto {
    name?: string
    description?: string
    iconSrc?: string
    color?: string
}

export interface CreateNodeDto {
    parentId: string | null
    name: string
    node_type: SkillNodeType
    extension?: string
    order?: number
    content?: string
    metadata?: SkillMetadata
}

export interface UpdateNodeDto {
    name?: string
    parentId?: string | null
    order?: number
    content?: string
    metadata?: SkillMetadata
}
