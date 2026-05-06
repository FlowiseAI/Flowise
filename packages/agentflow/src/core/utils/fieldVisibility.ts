import get from 'lodash/get'
import isEqual from 'lodash/isEqual'

import type { InputParam } from '../types'

/** Detects characters that signal intentional regex usage (excludes `.` and `\` which appear in normal names). */
const REGEX_INTENT = /[|()^$*+?[\]]/

/** Maximum length for regex patterns to mitigate ReDoS from untrusted input. */
const MAX_REGEX_LENGTH = 200

/**
 * Detect patterns likely to cause catastrophic backtracking.
 * Rejects any pattern containing a group with an inner quantifier or alternation
 * that is itself quantified, e.g. (a+)+, (a*)+, (a|aa)+, (a+ )+.
 */
function hasNestedQuantifier(pattern: string): boolean {
    let depth = 0
    let hasInnerQuantifierOrAlt = false
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i]
        if (ch === '\\') {
            i++ // skip escaped char
            continue
        }
        if (ch === '(') {
            depth++
            hasInnerQuantifierOrAlt = false
        } else if (ch === ')') {
            if (depth > 0) {
                depth--
                // Check if the group is followed by a quantifier
                const next = pattern[i + 1]
                if (hasInnerQuantifierOrAlt && (next === '+' || next === '*' || next === '?' || next === '{')) {
                    return true
                }
            }
            hasInnerQuantifierOrAlt = false
        } else if (depth > 0 && (ch === '+' || ch === '*' || ch === '?' || ch === '|')) {
            hasInnerQuantifierOrAlt = true
        }
    }
    return false
}

/**
 * Safe regex test: rejects patterns that are oversized, contain nested quantifiers
 * (the primary cause of catastrophic backtracking), or are syntactically invalid.
 */
function safeRegexTest(pattern: string, value: string): boolean {
    if (pattern.length > MAX_REGEX_LENGTH) return false
    if (hasNestedQuantifier(pattern)) return false
    try {
        return new RegExp(pattern).test(value)
    } catch {
        return false
    }
}

/**
 * Check if a ground value matches a comparison value using the same matrix
 * as the UI's _showHideOperation in genericHelper.js.
 *
 * Ground values are normalized to arrays so scalar and array inputs share
 * a single code path, reducing duplication.
 */
export function conditionMatches(groundValue: unknown, comparisonValue: unknown): boolean {
    const groundArr: unknown[] = Array.isArray(groundValue) ? groundValue : [groundValue]

    if (Array.isArray(comparisonValue)) {
        return comparisonValue.some((val) => groundArr.includes(val))
    }
    if (typeof comparisonValue === 'string') {
        return groundArr.some((val) => {
            if (comparisonValue === val) return true
            if (REGEX_INTENT.test(comparisonValue)) {
                return safeRegexTest(comparisonValue, String(val))
            }
            return false
        })
    }
    if (typeof comparisonValue === 'boolean' || typeof comparisonValue === 'number') {
        return groundArr.includes(comparisonValue)
    }
    if (typeof comparisonValue === 'object' && comparisonValue !== null) {
        return groundArr.some((val) => isEqual(comparisonValue, val))
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

function inputValuesWithDeclaredDefaults(params: InputParam[], inputValues: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...inputValues }
    for (const param of params) {
        if (param.default === undefined) continue
        if (merged[param.name] === undefined) {
            merged[param.name] = param.default
        }
    }
    return merged
}

/**
 * Evaluate visibility for all params, returning new param objects with computed `display`.
 * Also filters individual options within `type: 'options'` params based on their own show/hide conditions.
 * Does not mutate the originals.
 */
export function evaluateFieldVisibility(params: InputParam[], inputValues: Record<string, unknown>, arrayIndex?: number): InputParam[] {
    const effectiveInputs = inputValuesWithDeclaredDefaults(params, inputValues)
    return params.map((param) => {
        const withDisplay = { ...param, display: evaluateParamVisibility(param, effectiveInputs, arrayIndex) }

        if (withDisplay.type === 'options' && withDisplay.options) {
            const filteredOptions = withDisplay.options.filter((opt) => {
                if (typeof opt === 'string' || (!opt.show && !opt.hide)) return true
                return evaluateParamVisibility(
                    { id: '', name: '', label: '', type: '', show: opt.show, hide: opt.hide },
                    effectiveInputs,
                    arrayIndex
                )
            })
            return filteredOptions.length === withDisplay.options.length ? withDisplay : { ...withDisplay, options: filteredOptions }
        }

        return withDisplay
    })
}

export function applyVisibleFieldDefaults(
    params: InputParam[],
    inputValues: Record<string, unknown>,
    arrayIndex?: number
): Record<string, unknown> {
    const effectiveInputs = inputValuesWithDeclaredDefaults(params, inputValues)
    const result: Record<string, unknown> = { ...inputValues }
    for (const param of params) {
        if (param.default === undefined) continue
        if (result[param.name] !== undefined) continue
        if (!evaluateParamVisibility(param, effectiveInputs, arrayIndex)) continue
        result[param.name] = param.default
    }
    return result
}

/**
 * Return a copy of inputValues with keys for hidden params removed.
 */
export function stripHiddenFieldValues(
    params: InputParam[],
    inputValues: Record<string, unknown>,
    arrayIndex?: number
): Record<string, unknown> {
    const effectiveInputs = inputValuesWithDeclaredDefaults(params, inputValues)
    const result: Record<string, unknown> = { ...inputValues }
    for (const param of params) {
        if (!evaluateParamVisibility(param, effectiveInputs, arrayIndex)) {
            delete result[param.name]
        }
    }
    return result
}
