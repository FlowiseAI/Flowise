import { lazy, Suspense } from 'react'

import type { RichTextEditorProps } from './RichTextEditor'

const RichTextEditorLazy = lazy(() => import('./RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

/**
 * Lazy-loaded RichTextEditor — keeps TipTap + highlight.js out of the main bundle.
 * This is the public API; use this instead of importing RichTextEditor directly.
 */
export function RichTextEditor(props: RichTextEditorProps) {
    return (
        <Suspense fallback={<div style={{ minHeight: props.rows ? `${props.rows * 1.4375}rem` : '2.4rem' }} />}>
            <RichTextEditorLazy {...props} />
        </Suspense>
    )
}
