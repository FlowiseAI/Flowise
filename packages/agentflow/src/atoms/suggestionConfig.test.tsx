import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'

import { createSuggestionConfig } from './suggestionConfig'
import type { SuggestionItem } from './SuggestionDropdown'

const ITEMS: SuggestionItem[] = [
    { id: 'question', label: 'question', description: "User's question", category: 'Chat Context' },
    { id: 'chat_history', label: 'chat_history', description: 'Past conversation', category: 'Chat Context' },
    { id: '$flow.state.count', label: '$flow.state.count', description: 'Counter', category: 'Flow State' }
]

describe('createSuggestionConfig', () => {
    const config = createSuggestionConfig(ITEMS)

    it('uses {{ as trigger character', () => {
        expect(config.char).toBe('{{')
    })

    describe('items() filtering', () => {
        const items = config.items as (args: { query: string }) => SuggestionItem[]

        it('returns all items when query is empty', () => {
            expect(items({ query: '' })).toEqual(ITEMS)
        })

        it('filters by label (case-insensitive)', () => {
            const result = items({ query: 'QUESTION' })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('question')
        })

        it('filters by id', () => {
            const result = items({ query: '$flow.state' })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('$flow.state.count')
        })

        it('matches partial strings', () => {
            const result = items({ query: 'chat' })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('chat_history')
        })

        it('returns empty array when nothing matches', () => {
            expect(items({ query: 'nonexistent' })).toHaveLength(0)
        })
    })

    describe('render lifecycle', () => {
        const mockEditor = { view: { dom: document.createElement('div') } }
        const mockClientRect = jest.fn(() => new DOMRect(10, 20, 100, 30))

        function makeProps(overrides: Record<string, unknown> = {}) {
            return {
                editor: mockEditor,
                range: { from: 0, to: 5 },
                query: '',
                text: '',
                items: ITEMS,
                command: jest.fn(),
                decorationNode: null,
                clientRect: mockClientRect,
                ...overrides
            } as unknown as Parameters<NonNullable<ReturnType<typeof config.render>['onStart']>>[0]
        }

        beforeEach(() => {
            jest.clearAllMocks()
        })

        it('onStart creates a ReactRenderer and tippy popup', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps())

            expect(ReactRenderer).toHaveBeenCalledTimes(1)
            expect(tippy).toHaveBeenCalledTimes(1)
        })

        it('onUpdate refreshes component props and popup position', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps())

            const renderer = (ReactRenderer as jest.Mock).mock.results[0].value
            const tippyInstance = (tippy as unknown as jest.Mock).mock.results[0].value[0]

            lifecycle.onUpdate!(makeProps())
            expect(renderer.updateProps).toHaveBeenCalled()
            expect(tippyInstance.setProps).toHaveBeenCalled()
        })

        it('onKeyDown returns true for Escape and hides popup', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps())

            const tippyInstance = (tippy as unknown as jest.Mock).mock.results[0].value[0]
            const result = lifecycle.onKeyDown!({
                view: {} as never,
                event: new KeyboardEvent('keydown', { key: 'Escape' }),
                range: { from: 0, to: 5 }
            })

            expect(result).toBe(true)
            expect(tippyInstance.hide).toHaveBeenCalled()
        })

        it('onKeyDown returns false when component ref is null', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps())

            const result = lifecycle.onKeyDown!({
                view: {} as never,
                event: new KeyboardEvent('keydown', { key: 'ArrowDown' }),
                range: { from: 0, to: 5 }
            })

            expect(result).toBe(false)
        })

        it('onKeyDown delegates to component ref when available', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps())

            const renderer = (ReactRenderer as jest.Mock).mock.results[0].value
            const mockOnKeyDown = jest.fn(() => true)
            renderer.ref = { onKeyDown: mockOnKeyDown }

            const props = {
                view: {} as never,
                event: new KeyboardEvent('keydown', { key: 'ArrowDown' }),
                range: { from: 0, to: 5 }
            }
            const result = lifecycle.onKeyDown!(props)

            expect(mockOnKeyDown).toHaveBeenCalledWith(props)
            expect(result).toBe(true)
        })

        it('onExit destroys component and popup', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps())

            const renderer = (ReactRenderer as jest.Mock).mock.results[0].value
            const tippyInstance = (tippy as unknown as jest.Mock).mock.results[0].value[0]

            lifecycle.onExit!()

            expect(renderer.destroy).toHaveBeenCalled()
            expect(tippyInstance.destroy).toHaveBeenCalled()
        })

        it('uses DOM_RECT_FALLBACK when clientRect is null', () => {
            const lifecycle = config.render()
            lifecycle.onStart!(makeProps({ clientRect: null }))

            // Verify tippy was called — the fallback is used inside getReferenceClientRect
            const tippyConfig = (tippy as unknown as jest.Mock).mock.calls[0][1]
            const rect = tippyConfig.getReferenceClientRect()
            // Should return the fallback DOMRect (all zeros)
            expect(rect.x).toBe(0)
            expect(rect.y).toBe(0)
        })
    })
})
