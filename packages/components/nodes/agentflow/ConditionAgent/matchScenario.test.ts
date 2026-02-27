import { findBestScenarioIndex } from './matchScenario'

describe('findBestScenarioIndex', () => {
    const scenarios = [{ scenario: 'billing issue' }, { scenario: 'technical support' }, { scenario: 'other' }]

    it('matches exact scenario (case-insensitive)', () => {
        expect(findBestScenarioIndex(scenarios, 'Technical Support')).toBe(1)
    })

    it('matches exact scenario with surrounding whitespace', () => {
        expect(findBestScenarioIndex(scenarios, '  billing issue  ')).toBe(0)
    })

    it('matches abbreviated output using startsWith fallback', () => {
        expect(findBestScenarioIndex(scenarios, 'tech')).toBe(1)
    })

    it('matches substring output in either direction', () => {
        expect(findBestScenarioIndex(scenarios, 'need help with billing issue today')).toBe(0)
    })

    it('falls back to last scenario when no match is found', () => {
        expect(findBestScenarioIndex(scenarios, 'completely unrelated')).toBe(2)
    })

    it('returns -1 for empty scenarios list', () => {
        expect(findBestScenarioIndex([], 'anything')).toBe(-1)
    })
})
