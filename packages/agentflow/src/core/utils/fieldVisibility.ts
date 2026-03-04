import get from 'lodash/get'
import isEqual from 'lodash/isEqual'

import type { InputParam } from '../types'

/** Detects characters that signal intentional regex usage (excludes `.` and `\` which appear in normal names). */
const REGEX_INTENT = /[|()^$*+?[\]]/

/** Maximum length for regex patterns to mitigate ReDoS from untrusted input. */
const MAX_REGEX_LENGTH = 200

/** Timeout-safe regex test: compiles and tests the pattern, returning false for invalid or oversized patterns. */
function safeRegexTest(pattern: string, value: string): boolean {
    if (pattern.length > MAX_REGEX_LENGTH) return false
    try {
        return new RegExp(pattern).test(value)
    } catch {
        return false
    }
}

/**
 * Check if a ground value matches a comparison value using the same matrix
 * as the UI's _showHideOperation in genericHelper.js.
 */
export function conditionMatches(groundValue: unknown, comparisonValue: unknown): boolean {
    if (Array.isArray(groundValue)) {
        if (Array.isArray(comparisonValue)) {
            return comparisonValue.some((val) => (groundValue as unknown[]).includes(val))
        }
        if (typeof comparisonValue === 'string') {
            return (groundValue as unknown[]).some((val) => {
                if (comparisonValue === val) return true
                if (REGEX_INTENT.test(comparisonValue)) {
                    return safeRegexTest(comparisonValue, String(val))
                }
                return false
            })
        }
        if (typeof comparisonValue === 'boolean' || typeof comparisonValue === 'number') {
            return (groundValue as unknown[]).includes(comparisonValue)
        }
        if (typeof comparisonValue === 'object' && comparisonValue !== null) {
            return (groundValue as unknown[]).some((val) => isEqual(comparisonValue, val))
        }
    } else {
        if (Array.isArray(comparisonValue)) {
            return comparisonValue.includes(groundValue)
        }
        if (typeof comparisonValue === 'string') {
            if (comparisonValue === groundValue) return true
            if (REGEX_INTENT.test(comparisonValue)) {
                return safeRegexTest(comparisonValue, String(groundValue))
            }
            return false
        }
        if (typeof comparisonValue === 'boolean' || typeof comparisonValue === 'number') {
            return comparisonValue === groundValue
        }
        if (typeof comparisonValue === 'object' && comparisonValue !== null) {
            return isEqual(comparisonValue, groundValue)
        }
    }
    return false
}

/** Resolve a ground value from inputValues, parsing JSON-encoded arrays when found. */
function resolveGroundValue(inputValues: Record<string, unknown>, rawPath: string, arrayIndex?: number): unknown {
    const path = arrayIndex !== undefined ? rawPath.replace('$index', String(arrayIndex)) : rawPath
    let value: unknown = get(inputValues, path, '')
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
        try {
            value = JSON.parse(value)
        } catch {
            // keep as string
        }
    }
    return value
}

/**
 * Evaluate whether a single param should be visible given current input values.
 */
export function evaluateParamVisibility(param: InputParam, inputValues: Record<string, unknown>, arrayIndex?: number): boolean {
    if (param.show) {
        for (const [rawPath, comparisonValue] of Object.entries(param.show)) {
            const groundValue = resolveGroundValue(inputValues, rawPath, arrayIndex)
            if (!conditionMatches(groundValue, comparisonValue)) {
                return false
            }
        }
    }

    if (param.hide) {
        for (const [rawPath, comparisonValue] of Object.entries(param.hide)) {
            const groundValue = resolveGroundValue(inputValues, rawPath, arrayIndex)
            if (conditionMatches(groundValue, comparisonValue)) {
                return false
            }
        }
    }

    return true
}

/**
 * Evaluate visibility for all params, returning new param objects with computed `display`.
 * Does not mutate the originals.
 */
export function evaluateFieldVisibility(params: InputParam[], inputValues: Record<string, unknown>, arrayIndex?: number): InputParam[] {
    return params.map((param) => ({
        ...param,
        display: evaluateParamVisibility(param, inputValues, arrayIndex)
    }))
}

/**
 * Return a copy of inputValues with keys for hidden params removed.
 */
export function stripHiddenFieldValues(
    params: InputParam[],
    inputValues: Record<string, unknown>,
    arrayIndex?: number
): Record<string, unknown> {
    const result: Record<string, unknown> = { ...inputValues }
    for (const param of params) {
        if (!evaluateParamVisibility(param, inputValues, arrayIndex)) {
            delete result[param.name]
        }
    }
    return result
}
