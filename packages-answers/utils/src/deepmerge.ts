export function deepmerge(target: { [x: string]: any }, ...sources: any[]): any {
    if (!sources.length) return target
    const source = sources.shift()

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} })
                deepmerge(target[key], source[key])
            } else {
                Object.assign(target, { [key]: source[key] })
            }
        }
    }

    return deepmerge(target, ...sources)
}

function isObject(item: any) {
    return item && typeof item === 'object' && !Array.isArray(item)
}
