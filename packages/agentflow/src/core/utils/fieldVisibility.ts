import get from 'lodash/get'
import isEqual from 'lodash/isEqual'

import type { InputParam } from '../types'

/** Detects characters that signal intentional regex usage (excludes `.` and `\` which appear in normal names). */
const REGEX_INTENT = /[|()^$*+?[\]]/

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
                    try {
                        return new RegExp(comparisonValue).test(String(val))
                    } catch {
                        return false
                    }
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
                try {
                    return new RegExp(comparisonValue).test(String(groundValue))
                } catch {
                    return false
                }
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

/**
 * Evaluate whether a single param should be visible given current input values.
 */
export function evaluateParamVisibility(param: InputParam, inputValues: Record<string, unknown>, arrayIndex?: number): boolean {
    let display = true

    if (param.show) {
        for (const [rawPath, comparisonValue] of Object.entries(param.show)) {
            const path = arrayIndex !== undefined ? rawPath.replace('$index', String(arrayIndex)) : rawPath
            let groundValue: unknown = get(inputValues, path, '')
            if (typeof groundValue === 'string' && groundValue.startsWith('[') && groundValue.endsWith(']')) {
                try {
                    groundValue = JSON.parse(groundValue)
                } catch {
                    // keep as string
                }
            }
            if (!conditionMatches(groundValue, comparisonValue)) {
                display = false
            }
        }
    }

    if (param.hide) {
        for (const [rawPath, comparisonValue] of Object.entries(param.hide)) {
            const path = arrayIndex !== undefined ? rawPath.replace('$index', String(arrayIndex)) : rawPath
            let groundValue: unknown = get(inputValues, path, '')
            if (typeof groundValue === 'string' && groundValue.startsWith('[') && groundValue.endsWith(']')) {
                try {
                    groundValue = JSON.parse(groundValue)
                } catch {
                    // keep as string
                }
            }
            if (conditionMatches(groundValue, comparisonValue)) {
                display = false
            }
        }
    }

    return display
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
