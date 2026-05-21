import { DataSource } from 'typeorm'
import { z } from 'zod/v3'
import { ICommonObject, IDatabaseEntity, INodeData } from '../../../src/Interface'
import { convertSchemaToZod, getVars } from '../../../src/utils'
import { DynamicStructuredTool } from '../CustomTool/core'
import { formatToolName, SkillBundle, SkillBundleEntry, ToolReference } from './utils'

/**
 * Build live `DynamicStructuredTool` instances for every enabled custom
 * tool referenced by the selected `SkillBundleEntry` set.
 *
 * Why this exists
 * ---------------
 * The compiled bundle records every `{{tool.<provider>.<toolName>.<uuid>}}`
 * placeholder it saw on each skill page as a `ToolReference` (see
 * `SkillBundleEntry.tools.references`). At runtime we want the agent
 * to actually be able to invoke those tools — which, for the `custom`
 * type, means rebuilding the same `DynamicStructuredTool` that the
 * `CustomTool` node would produce from the DB row pointed at by `uuid`.
 *
 * Behaviour
 * ---------
 *   - Only references with `type === 'custom'` and `enabled !== false`
 *     are materialised. Other reference types (mcp / http / builtin)
 *     stay in the per-skill "You may also use:" hint until they grow
 *     a dedicated runtime path.
 *   - References are deduped by `uuid` — two selected skill pages can
 *     point at the same tool without producing two `Tool` instances.
 *   - Missing DB rows or unparseable schemas are silently skipped; the
 *     bundle was published in the past and the underlying tool may
 *     have been deleted since. Surfacing that as an init-time error
 *     would break the whole Skill node for one stale reference.
 *   - Tool names are taken from the live DB row (`row.name`) so they
 *     stay in sync with what the user sees in the Tools UI. Collisions
 *     between distinct uuids get a numeric `_2`, `_3`, … suffix.
 */

interface BuildCustomToolsArgs {
    bundle: SkillBundle
    selectedIds: string[]
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    nodeData: INodeData
    options: ICommonObject
}

export const buildCustomToolsFromBundle = async (args: BuildCustomToolsArgs): Promise<DynamicStructuredTool[]> => {
    const { bundle, selectedIds, appDataSource, databaseEntities, nodeData, options } = args

    if (!appDataSource || !databaseEntities?.['Tool']) return []

    const refsByUuid = collectCustomRefs(bundle, selectedIds)
    if (!refsByUuid.size) return []

    // Workspace `Variable`s + chatflow context, identical to what the
    // `CustomTool` node injects via `$vars` / `$flow`.
    const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
    const flow = { chatflowId: options.chatflowid }

    const tools: DynamicStructuredTool[] = []
    const usedNames = new Set<string>()
    const toolRepo = appDataSource.getRepository(databaseEntities['Tool'])

    for (const [uuid, ref] of refsByUuid) {
        let row: any = null
        try {
            row = await toolRepo.findOneBy({ id: uuid })
        } catch {
            row = null
        }
        if (!row) continue

        let schema: z.ZodObject<ICommonObject, 'strip', z.ZodTypeAny>
        try {
            schema = z.object(convertSchemaToZod(row.schema || '[]')) as z.ZodObject<ICommonObject, 'strip', z.ZodTypeAny>
        } catch {
            // Saved schema is malformed — skip rather than break the
            // whole skill node for one bad reference.
            continue
        }

        const baseName = formatToolName(row.name || ref.toolName || 'tool')
        const name = uniqueName(baseName, usedNames)
        usedNames.add(name)

        const tool = new DynamicStructuredTool({
            name,
            description: row.description || `Custom tool ${row.name || ref.toolName}`,
            schema,
            code: row.func || ''
        })
        tool.setVariables(variables)
        tool.setFlowObject(flow)
        tools.push(tool)
    }

    return tools
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const collectCustomRefs = (bundle: SkillBundle, selectedIds: string[]): Map<string, ToolReference> => {
    const out = new Map<string, ToolReference>()
    for (const nodeId of selectedIds) {
        const entry: SkillBundleEntry | undefined = bundle.entries?.[nodeId]
        if (!entry || entry.kind !== 'skill') continue
        const refs = entry.tools?.references ?? []
        for (const ref of refs) {
            if (!ref || typeof ref.uuid !== 'string' || !ref.uuid) continue
            if (ref.enabled === false) continue
            // Only 'custom' references have a corresponding `Tool` row;
            // other types are surfaced via the textual hint instead.
            if (ref.type !== 'custom') continue
            if (!out.has(ref.uuid)) out.set(ref.uuid, ref)
        }
    }
    return out
}

const uniqueName = (base: string, used: Set<string>): string => {
    if (!used.has(base)) return base
    let i = 2
    while (used.has(`${base}_${i}`)) i += 1
    return `${base}_${i}`
}
