/**
 * Skill — legacy `SandboxBashTool` shim.
 *
 * The canonical implementation now lives in `./ExecuteTool.ts` and
 * follows the architecture-doc §6 envelope. We keep `SandboxBashTool`
 * and `buildBashToolDescription` as re-exports so:
 *
 *   - Existing imports across the codebase keep compiling during the
 *     migration window.
 *   - Older chatflows that bound to `bash_<SkillName>` continue to
 *     resolve (the new tool defaults to the same name unless
 *     `SKILL_EXEC_TOOL_NAME=execute` is set).
 *
 * Deprecation: a single log line will be emitted when the legacy JSON
 * envelope is requested via `SKILL_LEGACY_BASH_ENVELOPE=true` (see
 * `ExecuteTool.ts`).
 */

export {
    ExecuteTool as SandboxBashTool,
    buildExecuteToolDescription as buildBashToolDescription,
    formatExecuteResponse
} from './ExecuteTool'

export type { ExecuteToolArgs as SandboxBashArgs, ExecuteToolFields as SandboxBashToolFields } from './ExecuteTool'
