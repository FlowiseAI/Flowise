import { parseFrontmatter } from './parser'

describe('parseFrontmatter — happy path', () => {
    it('parses minimal valid skill (name + description only)', () => {
        const raw = `---\nname: web-research\ndescription: Structured approach to research\n---\n\n# Body\nhi`
        const result = parseFrontmatter(raw)
        expect('name' in result).toBe(true)
        if ('name' in result) {
            expect(result.name).toBe('web-research')
            expect(result.description).toBe('Structured approach to research')
        }
    })

    it('parses all optional fields', () => {
        const raw = `---
name: code-review
description: Thorough code review
license: MIT
compatibility: ">=1.0.0"
allowed-tools: [search_web, fetch_url]
metadata:
  author: harshit
---

body`
        const result = parseFrontmatter(raw)
        expect('name' in result).toBe(true)
        if ('name' in result) {
            expect(result.license).toBe('MIT')
            expect(result.compatibility).toBe('>=1.0.0')
            expect(result.allowedTools).toEqual(['search_web', 'fetch_url'])
            expect(result.metadata).toEqual({ author: 'harshit' })
        }
    })
})
