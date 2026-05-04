import { SkillFileTree, SkillTreeNode } from '../entities'
import { createFileResolver } from './fileResolver'

// ---------------------------------------------------------------------------
// Tree builders — modelled on docs/example-testing/recruiting/ &
// docs/example-testing/human-resources/. Both scenarios are flat: every file
// lives at the workspace root, so the canonical relative path between two
// siblings is "./<name>".
// ---------------------------------------------------------------------------

const file = (id: string, name: string, parent_id: string | null = null, order = 0): SkillTreeNode => ({
    id,
    node_type: 'file',
    name,
    parent_id,
    order,
    extension: name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '',
    size: 0
})

const folder = (id: string, name: string, parent_id: string | null = null, order = 0): SkillTreeNode => ({
    id,
    node_type: 'folder',
    name,
    parent_id,
    order,
    extension: '',
    size: 0
})

const flatRecruiting = (): SkillFileTree => ({
    nodes: [
        file('resume', 'resume-screener.md'),
        file('interview', 'interview-questions.md'),
        file('email', 'email-drafter.md'),
        file('jd', 'job-description.txt'),
        file('score', 'scoring_algorithm.js')
    ]
})

const nestedTree = (): SkillFileTree => ({
    // root/
    //   recruiting/
    //     resume.md
    //     interview.md
    //   shared/
    //     common.md
    nodes: [
        folder('root', 'root'),
        folder('recruiting', 'recruiting', 'root'),
        folder('shared', 'shared', 'root'),
        file('resume', 'resume.md', 'recruiting'),
        file('interview', 'interview.md', 'recruiting'),
        file('common', 'common.md', 'shared')
    ]
})

// ---------------------------------------------------------------------------
// resolvePath — caller is a real skill node
// ---------------------------------------------------------------------------

describe('FileResolver.resolvePath (skill → skill at the same level)', () => {
    const r = createFileResolver(flatRecruiting())

    it('returns "./<sibling>" for two flat-root siblings', () => {
        expect(r.resolvePath('resume', 'jd')).toBe('./job-description.txt')
        expect(r.resolvePath('resume', 'score')).toBe('./scoring_algorithm.js')
    })

    it('produces a relative path between two skill files in the same flat workspace', () => {
        expect(r.resolvePath('email', 'resume')).toBe('./resume-screener.md')
        expect(r.resolvePath('email', 'interview')).toBe('./interview-questions.md')
    })

    it('returns null when the target node is unknown', () => {
        expect(r.resolvePath('resume', 'does-not-exist')).toBeNull()
    })

    it('falls back to skills/<absolute> when the caller is unknown', () => {
        expect(r.resolvePath('ghost', 'jd')).toBe('skills/job-description.txt')
    })
})

describe('FileResolver.resolvePath (nested folders)', () => {
    const r = createFileResolver(nestedTree())

    it('returns "./<sibling>" for two files under the same folder', () => {
        expect(r.resolvePath('resume', 'interview')).toBe('./interview.md')
    })

    it('walks up and back down across folder boundaries', () => {
        // recruiting/resume.md → shared/common.md
        // fromDirChain = [root, recruiting]; toChain = [root, shared, common]
        // common prefix length = 1 → up = 1, down = [shared, common.md]
        expect(r.resolvePath('resume', 'common')).toBe('../shared/common.md')
    })

    it('returns absolute path when the caller is the synthetic anonymous node', () => {
        expect(r.resolvePath('__anon__', 'resume')).toBe('skills/root/recruiting/resume.md')
    })
})

// ---------------------------------------------------------------------------
// absolutePath
// ---------------------------------------------------------------------------

describe('FileResolver.absolutePath', () => {
    const flat = createFileResolver(flatRecruiting())
    const nested = createFileResolver(nestedTree())

    it('resolves a flat-root file to skills/<name>', () => {
        expect(flat.absolutePath('jd')).toBe('skills/job-description.txt')
    })

    it('joins parent folder names for nested files', () => {
        expect(nested.absolutePath('resume')).toBe('skills/root/recruiting/resume.md')
        expect(nested.absolutePath('common')).toBe('skills/root/shared/common.md')
    })

    it('returns null for unknown node ids', () => {
        expect(flat.absolutePath('mystery')).toBeNull()
    })
})
