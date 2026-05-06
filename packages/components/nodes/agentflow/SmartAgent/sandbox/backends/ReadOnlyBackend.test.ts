import { ReadOnlyBackend } from './ReadOnlyBackend'
import { StateBackend } from './StateBackend'

describe('ReadOnlyBackend', () => {
    const seed = async () => {
        const inner = new StateBackend()
        await inner.write('/a/SKILL.md', 'hello')
        return new ReadOnlyBackend(inner)
    }

    it('passes ls through', async () => {
        const b = await seed()
        const result = await b.ls('/a')
        expect('files' in result).toBe(true)
    })

    it('passes read through', async () => {
        const b = await seed()
        const result = await b.read('/a/SKILL.md')
        expect('content' in result).toBe(true)
        if ('content' in result) expect(result.content).toBe('hello')
    })

    it('rejects write with a clear error', async () => {
        const b = await seed()
        const result = await b.write('/a/new.md', 'nope')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/read[- ]?only/i)
    })

    it('rejects edit with a clear error', async () => {
        const b = await seed()
        const result = await b.edit('/a/SKILL.md', 'hello', 'world')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/read[- ]?only/i)
    })
})
