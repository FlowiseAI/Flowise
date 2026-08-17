/**
 * Keenable returns whole-page text where other search tools return a short
 * snippet, so cap it — this output goes straight into the agent's context.
 */
export const MAX_SNIPPET_CHARS = 500

export interface KeenableResult {
    title?: string
    url: string
    /** Frequently empty; `snippet` is where the page text is. */
    description?: string
    /** Raw page text, newlines included. */
    snippet?: string
    published_at?: string | null
}

/**
 * Picks a result's text.
 *
 * Keenable returns both `snippet` and `description`: `snippet` carries the page
 * text and `description` is frequently empty, so prefer whichever has content.
 * Snippets arrive as raw page text, hence the whitespace collapse and the cap.
 */
export const resultSnippet = (result: Pick<KeenableResult, 'description' | 'snippet'>): string =>
    (result.snippet || result.description || '').split(/\s+/).filter(Boolean).join(' ').slice(0, MAX_SNIPPET_CHARS)
