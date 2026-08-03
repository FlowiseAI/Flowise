/**
 * Shared helpers for working with Anthropic Claude models across providers
 * (direct Anthropic API, AWS Bedrock, Google Vertex AI, etc.).
 *
 * Different providers expose Claude with different name conventions:
 *   - Anthropic API:   "claude-opus-4-7"
 *   - AWS Bedrock:     "anthropic.claude-opus-4-7-v1", "us.anthropic.claude-opus-4-7-..."
 *   - Vertex AI:       "claude-opus-4-7", "claude-opus-4-7@20251015"
 *
 * The regex patterns below intentionally match only the version-bearing
 * portion of the name so they work across all of the above.
 */

/**
 * Model name patterns that do not accept sampling parameters
 * (`temperature`, `top_p`, `top_k`). Anthropic dropped support for these on
 * newer reasoning-first models, starting with Claude Opus 4.7. The patterns
 * cover Opus 4.7+ and any future Opus major versions (5.x, 6.x, ...).
 * Extend this list when new model families adopt the same restriction.
 */
export const MODELS_WITHOUT_SAMPLING_PARAMS: RegExp[] = [
    // Opus 4.7, 4.8, 4.9
    /opus-4-[7-9](?:\b|-)/,
    // Opus 5.x and beyond (single- or multi-digit major versions >= 5)
    /opus-(?:[5-9]|\d{2,})-/
]

/**
 * Returns false when the given model name matches any pattern in
 * `MODELS_WITHOUT_SAMPLING_PARAMS`. Callers should skip setting
 * `temperature`, `topP`, and `topK` when this returns false.
 */
export const supportsSamplingParams = (modelName?: string): boolean => {
    if (!modelName) return true
    return !MODELS_WITHOUT_SAMPLING_PARAMS.some((pattern) => pattern.test(modelName))
}
