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

describe('parseFrontmatter — required field validation', () => {
    it('rejects missing frontmatter block', () => {
        const result = parseFrontmatter('# just a body, no frontmatter')
        expect('message' in result).toBe(true)
        if ('message' in result) expect(result.message).toMatch(/missing frontmatter/i)
    })

    it('rejects malformed YAML', () => {
        const raw = `---\nname: foo\n  : : bad\n---\nbody`
        const result = parseFrontmatter(raw)
        expect('message' in result).toBe(true)
        if ('message' in result) expect(result.message).toMatch(/invalid YAML/i)
    })

    it('rejects missing name', () => {
        const raw = `---\ndescription: no name here\n---\nbody`
        const result = parseFrontmatter(raw)
        expect('field' in result && result.field).toBe('name')
    })

    it('rejects invalid name format (uppercase)', () => {
        const raw = `---\nname: WebResearch\ndescription: x\n---\nbody`
        const result = parseFrontmatter(raw)
        expect('field' in result && result.field).toBe('name')
    })

    it('rejects invalid name format (spaces)', () => {
        const raw = `---\nname: web research\ndescription: x\n---\nbody`
        const result = parseFrontmatter(raw)
        expect('field' in result && result.field).toBe('name')
    })

    it('rejects missing description', () => {
        const raw = `---\nname: ok-name\n---\nbody`
        const result = parseFrontmatter(raw)
        expect('field' in result && result.field).toBe('description')
    })

    it('rejects oversized description (> 200 chars)', () => {
        const desc = 'x'.repeat(201)
        const raw = `---\nname: ok-name\ndescription: ${desc}\n---\nbody`
        const result = parseFrontmatter(raw)
        expect('field' in result && result.field).toBe('description')
    })
})
