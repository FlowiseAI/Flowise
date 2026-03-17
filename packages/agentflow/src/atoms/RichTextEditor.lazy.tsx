import { lazy, Suspense } from 'react'

import { tokens } from '@/core/theme/tokens'

import type { RichTextEditorProps } from './RichTextEditor'

const RichTextEditorLazy = lazy(() => import('./RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

/**
 * Lazy-loaded RichTextEditor — keeps TipTap + highlight.js out of the main bundle.
 * This is the public API; use this instead of importing RichTextEditor directly.
 */
export function RichTextEditor(props: RichTextEditorProps) {
    const { rowHeightRem, singleLineHeightRem } = tokens.typography
    return (
        <Suspense fallback={<div style={{ minHeight: props.rows ? `${props.rows * rowHeightRem}rem` : `${singleLineHeightRem}rem` }} />}>
            <RichTextEditorLazy {...props} />
        </Suspense>
    )
}
