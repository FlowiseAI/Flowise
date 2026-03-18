import { act, renderHook } from '@testing-library/react'

import { useStableKeys } from './useStableKeys'

describe('useStableKeys', () => {
    it('returns empty keys array when length is 0', () => {
        const { result } = renderHook(() => useStableKeys(0, 'item'))
        expect(result.current.keys).toEqual([])
    })

    it('generates keys with the given prefix on initial render', () => {
        const { result } = renderHook(() => useStableKeys(3, 'item'))
        expect(result.current.keys).toHaveLength(3)
        result.current.keys.forEach((key) => expect(key).toMatch(/^item-\d+$/))
    })

    it('uses the provided prefix in generated keys', () => {
        const { result } = renderHook(() => useStableKeys(2, 'condition'))
        result.current.keys.forEach((key) => expect(key).toMatch(/^condition-/))
    })

    it('all initial keys are unique', () => {
        const { result } = renderHook(() => useStableKeys(5, 'item'))
        const unique = new Set(result.current.keys)
        expect(unique.size).toBe(5)
    })

    it('returns the same key values when length is unchanged', () => {
        const { result, rerender } = renderHook(() => useStableKeys(3, 'item'))
        const firstKeys = [...result.current.keys]

        rerender()

        expect(result.current.keys).toEqual(firstKeys)
    })

    it('returns a stable removeKey reference across re-renders', () => {
        const { result, rerender } = renderHook(() => useStableKeys(3, 'item'))
        const firstRemoveKey = result.current.removeKey

        rerender()

        expect(result.current.removeKey).toBe(firstRemoveKey)
    })

    it('appends new keys when length increases', () => {
        let length = 2
        const { result, rerender } = renderHook(() => useStableKeys(length, 'item'))
        const originalKeys = [...result.current.keys]

        length = 4
        rerender()

        expect(result.current.keys).toHaveLength(4)
        expect(result.current.keys[0]).toBe(originalKeys[0])
        expect(result.current.keys[1]).toBe(originalKeys[1])
    })

    it('new keys are available in the same render pass (not deferred)', () => {
        let length = 1
        const { result, rerender } = renderHook(() => useStableKeys(length, 'item'))

        length = 3
        rerender()

        expect(result.current.keys).toHaveLength(3)
    })

    it('appended keys are unique and do not collide with existing ones', () => {
        let length = 2
        const { result, rerender } = renderHook(() => useStableKeys(length, 'item'))

        length = 5
        rerender()

        const unique = new Set(result.current.keys)
        expect(unique.size).toBe(5)
    })

    // removeKey tests pair the call with a length decrement, mirroring real usage where
    // the delete handler calls removeKey and updates the array in the same React update.
    // Length is set before act() so the state-flush re-render sees the new length.

    it('removeKey removes the key at the specified index', () => {
        let length = 3
        const { result } = renderHook(() => useStableKeys(length, 'item'))
        const [k0, , k2] = result.current.keys

        length = 2
        act(() => {
            result.current.removeKey(1)
        })

        expect(result.current.keys).toHaveLength(2)
        expect(result.current.keys[0]).toBe(k0)
        expect(result.current.keys[1]).toBe(k2)
    })

    it('removeKey removes the first key', () => {
        let length = 3
        const { result } = renderHook(() => useStableKeys(length, 'item'))
        const [, k1, k2] = result.current.keys

        length = 2
        act(() => {
            result.current.removeKey(0)
        })

        expect(result.current.keys).toEqual([k1, k2])
    })

    it('removeKey removes the last key', () => {
        let length = 3
        const { result } = renderHook(() => useStableKeys(length, 'item'))
        const [k0, k1] = result.current.keys

        length = 2
        act(() => {
            result.current.removeKey(2)
        })

        expect(result.current.keys).toEqual([k0, k1])
    })

    it('removeKey preserves the values of remaining keys', () => {
        let length = 4
        const { result } = renderHook(() => useStableKeys(length, 'item'))
        const original = [...result.current.keys]

        length = 3
        act(() => {
            result.current.removeKey(1)
        })

        expect(result.current.keys).toEqual([original[0], original[2], original[3]])
    })

    it('new keys added after a removal do not reuse the removed key value', () => {
        let length = 3
        const { result, rerender } = renderHook(() => useStableKeys(length, 'item'))
        const removedKey = result.current.keys[1]

        length = 2
        act(() => {
            result.current.removeKey(1)
        })

        length = 3
        rerender()

        expect(result.current.keys).not.toContain(removedKey)
    })
})
