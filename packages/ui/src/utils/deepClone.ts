export const deepClone = <T>(obj: T, hash = new WeakMap()): T => {
    // 处理null
    if (obj === null) {
        return null as T
    }

    // 处理基本类型
    if (typeof obj !== 'object') {
        return obj
    }

    // 处理日期对象
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T
    }

    // 处理正则表达式
    if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags) as T
    }

    // 处理Map
    if (obj instanceof Map) {
        const newMap = new Map()
        obj.forEach((value, key) => {
            newMap.set(deepClone(key, hash), deepClone(value, hash))
        })
        return newMap as T
    }

    // 处理Set
    if (obj instanceof Set) {
        const newSet = new Set()
        obj.forEach((value) => {
            newSet.add(deepClone(value, hash))
        })
        return newSet as T
    }

    // 检查循环引用
    if (hash.has(obj as object)) {
        return hash.get(obj as object) as T
    }

    // 处理数组
    if (Array.isArray(obj)) {
        const newArray: any[] = []
        hash.set(obj as object, newArray)
        obj.forEach((item, index) => {
            newArray[index] = deepClone(item, hash)
        })
        return newArray as T
    }

    // 处理普通对象
    const cloneObj = Object.create(Object.getPrototypeOf(obj))
    hash.set(obj as object, cloneObj)

    // 处理Symbol类型的key
    const symbolProperties = Object.getOwnPropertySymbols(obj as object)
    if (symbolProperties.length > 0) {
        symbolProperties.forEach((symbol) => {
            cloneObj[symbol] = deepClone((obj as any)[symbol], hash)
        })
    }

    // 处理不可枚举属性和常规属性
    Object.getOwnPropertyNames(obj).forEach((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(obj as object, key)
        if (descriptor) {
            if (descriptor.value !== undefined) {
                cloneObj[key] = deepClone((obj as any)[key], hash)
            }
            Object.defineProperty(cloneObj, key, {
                ...descriptor,
                value: descriptor.value !== undefined ? deepClone(descriptor.value, hash) : descriptor.value
            })
        }
    })

    return cloneObj as T
}
