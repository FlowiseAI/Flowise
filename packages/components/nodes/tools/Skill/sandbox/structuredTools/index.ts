/**
 * Skill — structured filesystem tools (Layer 4 siblings of `execute`).
 *
 * One `StructuredTool` per `BackendProtocol` method, registered
 * alongside the `ExecuteTool` when `isSandboxBackend(backend)` is true.
 *
 * Each tool:
 *   - Constructs with a `BackendProtocol` reference.
 *   - Names itself `<verb>_<SkillName>` so multi-Skill chatflows don't
 *     collide.
 *   - Returns a deterministic text result with an `Error: …` first
 *     line when the underlying backend reported an error.
 *   - NEVER throws to the agent runtime — errors flow through the
 *     return value so the function-calling loop stays clean.
 */

export * from './buildStructuredFsTools'
export * from './LsTool'
export * from './ReadFileTool'
export * from './WriteFileTool'
export * from './EditFileTool'
export * from './GlobTool'
export * from './GrepTool'
