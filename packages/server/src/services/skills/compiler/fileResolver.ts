import { SkillFileTree } from '../entities'
import { buildIndex, computePath, computeRelativePath } from '../utils/tree'

/**
 * Resolve a `{{skill.<nodeId>}}` placeholder to a path string.
 *
 *   - caller is a real skill node → relative path ("./sub.md", "../assets/foo.png").
 *   - caller is the anonymous runtime prompt → absolute "skills/<path>".
 *
 * Unknown node ids return `null`; callers render `SKILL_V2_BROKEN_REFERENCE`.
 */
export interface FileResolver {
    resolvePath(fromNodeId: string, toNodeId: string): string | null
    absolutePath(nodeId: string): string | null
}

export const createFileResolver = (tree: SkillFileTree): FileResolver => {
    const index = buildIndex(tree)
    return {
        resolvePath(fromNodeId: string, toNodeId: string): string | null {
            if (!index.has(toNodeId)) return null
            if (fromNodeId === '__anon__' || !index.has(fromNodeId)) {
                return `skills/${computePath(toNodeId, index)}`
            }
            try {
                return computeRelativePath(fromNodeId, toNodeId, index)
            } catch {
                return null
            }
        },
        absolutePath(nodeId: string): string | null {
            if (!index.has(nodeId)) return null
            return `skills/${computePath(nodeId, index)}`
        }
    }
}
