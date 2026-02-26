import { z } from 'zod'

/**
 * This parser safely handles Zod schema strings without allowing arbitrary code execution
 */
export class SecureZodSchemaParser {
    // Base primitives this parser can build via the switch in buildZodType
    private static readonly ALLOWED_BASE_TYPES = ['string', 'number', 'boolean', 'date', 'enum'] as const
    // Safe method modifiers supported by applyModifiers
    private static readonly ALLOWED_MODIFIERS = ['int', 'optional', 'max', 'min', 'describe', 'default', 'array'] as const

    /**
     * Safely parse a Zod schema string into a Zod schema object
     * @param schemaString The Zod schema as a string (e.g., "z.object({name: z.string()})")
     * @returns A Zod schema object
     * @throws Error if the schema is invalid or contains unsafe patterns
     */
    static parseZodSchema(schemaString: string): z.ZodTypeAny {
        try {
            // Remove comments and normalize whitespace
            const cleanedSchema = this.cleanSchemaString(schemaString)

            // Parse the schema structure
            const parsed = this.parseSchemaStructure(cleanedSchema)

            // Build the Zod schema securely
            return this.buildZodSchema(parsed)
        } catch (error) {
            throw new Error(`Failed to parse Zod schema: ${error.message}`)
        }
    }

    private static cleanSchemaString(schema: string): string {
        // Remove single-line comments
        schema = schema.replace(/\/\/.*$/gm, '')

        // Remove multi-line comments
        schema = schema.replace(/\/\*[\s\S]*?\*\//g, '')

        // Normalize whitespace
        schema = schema.replace(/\s+/g, ' ').trim()

        return schema
    }

    private static parseSchemaStructure(schema: string): any {
        // This is a simplified parser that handles common Zod patterns safely
        // It does NOT use eval/Function and only handles predefined safe patterns

        if (schema.startsWith('z.array(')) {
            // Top-level array
            return this.parseZodType(schema)
        }

        if (schema.startsWith('z.union(')) {
            // Top-level union
            return this.parseZodType(schema)
        }

        if (!schema.startsWith('z.object(')) {
            throw new Error('Schema must start with z.object(), z.array(), z.union()')
        }

        // Extract the object content
        const objectMatch = schema.match(/z\.object\(\s*\{([\s\S]*)\}\s*\)/)
        if (!objectMatch) {
            throw new Error('Invalid z.object() syntax')
        }

        const objectContent = objectMatch[1]
        return this.parseObjectProperties(objectContent)
    }

    private static parseObjectProperties(content: string): Record<string, any> {
        const properties: Record<string, any> = {}

        // Split by comma, but handle nested structures
        const props = this.splitProperties(content)

        for (const prop of props) {
            const [key, value] = this.parseProperty(prop)
            if (key && value) {
                properties[key] = value
            }
        }

        return properties
    }

    private static splitProperties(content: string): string[] {
        const properties: string[] = []
        let current = ''
        let depth = 0
        let inString = false
        let stringChar = ''

        for (let i = 0; i < content.length; i++) {
            const char = content[i]

            if (!inString && (char === '"' || char === "'")) {
                inString = true
                stringChar = char
            } else if (inString && char === stringChar && content[i - 1] !== '\\') {
                inString = false
            } else if (!inString) {
                if (char === '(' || char === '[' || char === '{') {
                    depth++
                } else if (char === ')' || char === ']' || char === '}') {
                    depth--
                } else if (char === ',' && depth === 0) {
                    properties.push(current.trim())
                    current = ''
                    continue
                }
            }

            current += char
        }

        if (current.trim()) {
            properties.push(current.trim())
        }

        return properties
    }

    private static parseProperty(prop: string): [string | null, any] {
        const colonIndex = prop.indexOf(':')
        if (colonIndex === -1) return [null, null]

        const key = prop.substring(0, colonIndex).trim().replace(/['"]/g, '')
        const value = prop.substring(colonIndex + 1).trim()

        return [key, this.parseZodType(value)]
    }

    private static parseZodType(typeStr: string): any {
        // Check if this is a nested object (not in an array)
        if (typeStr.startsWith('z.object(') && !typeStr.startsWith('z.array(')) {
            // Check if there are modifiers after the object
            const objectWithModifiers = this.extractObjectWithModifiers(typeStr)
            if (objectWithModifiers.hasModifiers) {
                const objectMatch = objectWithModifiers.objectPart.match(/z\.object\(\s*\{([\s\S]*)\}\s*\)/)
                if (!objectMatch) {
                    throw new Error('Invalid object syntax')
                }

                const objectContent = objectMatch[1]
                const objectProperties = this.parseObjectProperties(objectContent)

                return {
                    isNestedObject: true,
                    objectSchema: objectProperties,
                    modifiers: objectWithModifiers.modifiers
                }
            }

            // Original code for objects without modifiers
            const objectMatch = typeStr.match(/z\.object\(\s*\{([\s\S]*)\}\s*\)/)
            if (!objectMatch) {
                throw new Error('Invalid object syntax')
            }

            const objectContent = objectMatch[1]
            const objectProperties = this.parseObjectProperties(objectContent)

            return {
                isNestedObject: true,
                objectSchema: objectProperties
            }
        }

        // Check if this is any kind of array
        if (typeStr.startsWith('z.array(')) {
            // Check if there are modifiers after the array
            const arrayWithModifiers = this.extractArrayWithModifiers(typeStr)
            if (arrayWithModifiers.hasModifiers) {
                const arrayResult = this.parseArray(arrayWithModifiers.arrayPart)
                // Convert array result to have modifiers
                return {
                    ...arrayResult,
                    modifiers: arrayWithModifiers.modifiers
                }
            }
            return this.parseArray(typeStr)
        }

        // Check if this is a union
        if (typeStr.startsWith('z.union(')) {
            return this.parseUnion(typeStr)
        }

        // Check if this is a literal
        if (typeStr.startsWith('z.literal(')) {
            return this.parseLiteral(typeStr)
        }

        const type: { base: string; modifiers: any[]; baseArgs?: any[] } = { base: '', modifiers: [] }

        // Handle chained methods like z.string().max(500).optional()
        const parts = typeStr.split('.')

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim()

            if (i === 0) {
                // First part should be 'z'
                if (part !== 'z') {
                    throw new Error(`Expected 'z' but got '${part}'`)
                }
                continue
            }

            if (i === 1) {
                // Second part is the base type
                const baseMatch = part.match(/^(\w+)(\(.*\))?$/)
                if (!baseMatch) {
                    throw new Error(`Invalid base type: ${part}`)
                }

                type.base = baseMatch[1]
                if (baseMatch[2]) {
                    // Parse arguments for base type (e.g., enum values)
                    const args = this.parseArguments(baseMatch[2])
                    type.baseArgs = args
                }
            } else {
                // Subsequent parts are modifiers
                const modMatch = part.match(/^(\w+)(\(.*\))?$/)
                if (!modMatch) {
                    throw new Error(`Invalid modifier: ${part}`)
                }

                const modName = modMatch[1]
                const modArgs = modMatch[2] ? this.parseArguments(modMatch[2]) : []

                type.modifiers.push({ name: modName, args: modArgs })
            }
        }

        return type
    }

    private static parseArray(typeStr: string): any {
        // Extract the content inside array()
        const arrayContentMatch = typeStr.match(/z\.array\(\s*([\s\S]*)\s*\)$/)
        if (!arrayContentMatch) {
            throw new Error('Invalid array syntax')
        }

        const arrayContent = arrayContentMatch[1].trim()

        // Parse the object inside the array
        if (arrayContent.startsWith('z.object(')) {
            // Extract object content
            const objectMatch = arrayContent.match(/z\.object\(\s*\{([\s\S]*)\}\s*\)/)
            if (!objectMatch) {
                throw new Error('Invalid object syntax inside array')
            }

            const objectContent = objectMatch[1]
            const objectProperties = this.parseObjectProperties(objectContent)

            // Validate each property in the nested object
            for (const propValue of Object.values(objectProperties)) {
                this.validateTypeInfo(propValue)
            }

            return {
                isArrayOfObjects: true,
                objectSchema: objectProperties
            }
        }

        // Handle simple arrays (e.g., z.array(z.string()))
        const innerType = this.parseZodType(arrayContent)

        return {
            isSimpleArray: true,
            innerType: innerType
        }
    }

    private static parseUnion(typeStr: string): any {
        // Check if there are modifiers after the union
        const unionWithModifiers = this.extractUnionWithModifiers(typeStr)

        // Extract the content inside union([...])
        const unionMatch = unionWithModifiers.unionPart.match(/z\.union\(\s*\[([\s\S]*)\]\s*\)$/)
        if (!unionMatch) {
            throw new Error('Invalid union syntax - must be z.union([type1, type2, ...])')
        }

        const unionContent = unionMatch[1].trim()

        // Split union members by comma, handling nested structures
        const members = this.splitUnionMembers(unionContent)

        if (members.length < 2) {
            throw new Error('Union must have at least 2 members')
        }

        // Parse each union member
        const parsedMembers = members.map((member) => this.parseZodType(member.trim()))

        // Validate each member
        for (const member of parsedMembers) {
            this.validateTypeInfo(member)
        }

        const result: any = {
            isUnion: true,
            members: parsedMembers
        }

        // Add modifiers if present
        if (unionWithModifiers.hasModifiers) {
            result.modifiers = unionWithModifiers.modifiers
        }

        return result
    }

    private static parseLiteral(typeStr: string): any {
        // Check if there are modifiers after the literal
        const literalWithModifiers = this.extractLiteralWithModifiers(typeStr)

        // Extract the content inside literal(...)
        const literalMatch = literalWithModifiers.literalPart.match(/z\.literal\(\s*([\s\S]*?)\s*\)$/)
        if (!literalMatch) {
            throw new Error('Invalid literal syntax - must be z.literal(value)')
        }

        const literalContent = literalMatch[1].trim()

        // Parse the literal value (string, number, or boolean)
        let literalValue: string | number | boolean

        if (literalContent.startsWith('"') && literalContent.endsWith('"')) {
            // String literal
            literalValue = literalContent.slice(1, -1)
        } else if (literalContent.startsWith("'") && literalContent.endsWith("'")) {
            // String literal with single quotes
            literalValue = literalContent.slice(1, -1)
        } else if (literalContent === 'true') {
            literalValue = true
        } else if (literalContent === 'false') {
            literalValue = false
        } else if (literalContent.match(/^-?\d+$/)) {
            // Integer literal
            literalValue = parseInt(literalContent, 10)
        } else if (literalContent.match(/^-?\d+\.\d+$/)) {
            // Float literal
            literalValue = parseFloat(literalContent)
        } else {
            throw new Error(`Invalid literal value: ${literalContent}`)
        }

        const result: any = {
            isLiteral: true,
            value: literalValue
        }

        // Add modifiers if present
        if (literalWithModifiers.hasModifiers) {
            result.modifiers = literalWithModifiers.modifiers
        }

        return result
    }

    private static extractLiteralWithModifiers(typeStr: string): { literalPart: string; modifiers: any[]; hasModifiers: boolean } {
        // Find the matching closing parenthesis for z.literal(...)
        let depth = 1
        let literalEndIndex = -1
        const literalStartIndex = typeStr.indexOf('z.literal(')
        if (literalStartIndex === -1) {
            return { literalPart: typeStr, modifiers: [], hasModifiers: false }
        }
        let startIndex = literalStartIndex + 'z.literal('.length

        let inString = false
        let stringChar = ''

        for (let i = startIndex; i < typeStr.length; i++) {
            const char = typeStr[i]

            if (inString) {
                if (char === stringChar && typeStr[i - 1] !== '\\') {
                    inString = false
                }
            } else if (char === '"' || char === "'") {
                inString = true
                stringChar = char
            } else if (char === '(') {
                depth++
            } else if (char === ')') {
                depth--
                if (depth === 0) {
                    literalEndIndex = i + 1
                    break
                }
            }
        }

        if (literalEndIndex === -1) {
            return { literalPart: typeStr, modifiers: [], hasModifiers: false }
        }

        const literalPart = typeStr.substring(0, literalEndIndex)
        const remainingPart = typeStr.substring(literalEndIndex)

        if (!remainingPart.startsWith('.')) {
            return { literalPart: typeStr, modifiers: [], hasModifiers: false }
        }

        // Parse modifiers (handles nested args and quoted strings)
        const modifiers: any[] = []
        let i = 1 // skip leading '.'
        while (i < remainingPart.length) {
            const nameMatch = remainingPart.substring(i).match(/^(\w+)/)
            if (!nameMatch) break
            const modName = nameMatch[1]
            i += modName.length
            let modArgs: any[] = []
            if (i < remainingPart.length && remainingPart[i] === '(') {
                let depth = 0,
                    inStr = false,
                    strCh = '',
                    start = i
                for (let j = i; j < remainingPart.length; j++) {
                    const ch = remainingPart[j]
                    if (inStr) {
                        // Count consecutive backslashes before the quote
                        let backslashCount = 0
                        for (let k = j - 1; k >= 0 && remainingPart[k] === '\\'; k--) {
                            backslashCount++
                        }
                        // If even number of backslashes (including 0), the quote is not escaped
                        if (ch === strCh && backslashCount % 2 === 0) inStr = false
                    } else if (ch === '"' || ch === "'") {
                        inStr = true
                        strCh = ch
                    } else if (ch === '(') depth++
                    else if (ch === ')') {
                        depth--
                        if (depth === 0) {
                            const argsStr = remainingPart.substring(start, j + 1)
                            // Allow object defaults and complex args
                            modArgs = this.parseComplexArguments(argsStr)
                            i = j + 1
                            break
                        }
                    }
                }
            }
            if (!this.ALLOWED_MODIFIERS.includes(modName as any)) {
                throw new Error(`Unsupported modifier: ${modName}`)
            }
            modifiers.push({ name: modName, args: modArgs })
            if (i < remainingPart.length && remainingPart[i] === '.') i++
        }

        return { literalPart, modifiers, hasModifiers: true }
    }

    private static splitUnionMembers(content: string): string[] {
        const members: string[] = []
        let current = ''
        let depth = 0
        let inString = false
        let stringChar = ''

        for (let i = 0; i < content.length; i++) {
            const char = content[i]

            if (!inString && (char === '"' || char === "'")) {
                inString = true
                stringChar = char
            } else if (inString && char === stringChar && content[i - 1] !== '\\') {
                inString = false
            } else if (!inString) {
                if (char === '(' || char === '[' || char === '{') {
                    depth++
                } else if (char === ')' || char === ']' || char === '}') {
                    depth--
                } else if (char === ',' && depth === 0) {
                    members.push(current.trim())
                    current = ''
                    continue
                }
            }

            current += char
        }

        if (current.trim()) {
            members.push(current.trim())
        }

        return members
    }

    private static extractUnionWithModifiers(typeStr: string): { unionPart: string; modifiers: any[]; hasModifiers: boolean } {
        // Find the matching closing bracket and parenthesis for z.union([...])
        let depth = 1
        let unionEndIndex = -1
        const unionStartIndex = typeStr.indexOf('z.union(')
        if (unionStartIndex === -1) {
            return { unionPart: typeStr, modifiers: [], hasModifiers: false }
        }
        let startIndex = unionStartIndex + 'z.union('.length

        let inString = false
        let stringChar = ''

        for (let i = startIndex; i < typeStr.length; i++) {
            const char = typeStr[i]

            if (inString) {
                if (char === stringChar && typeStr[i - 1] !== '\\') {
                    inString = false
                }
            } else if (char === '"' || char === "'") {
                inString = true
                stringChar = char
            } else if (char === '(' || char === '[') {
                depth++
            } else if (char === ')' || char === ']') {
                depth--
                if (depth === 0) {
                    unionEndIndex = i + 1
                    break
                }
            }
        }

        if (unionEndIndex === -1) {
            return { unionPart: typeStr, modifiers: [], hasModifiers: false }
        }

        const unionPart = typeStr.substring(0, unionEndIndex)
        const remainingPart = typeStr.substring(unionEndIndex)

        if (!remainingPart.startsWith('.')) {
            return { unionPart: typeStr, modifiers: [], hasModifiers: false }
        }

        // Parse modifiers (handles nested args and quoted strings)
        const modifiers: any[] = []
        let i = 1 // skip leading '.'
        while (i < remainingPart.length) {
            const nameMatch = remainingPart.substring(i).match(/^(\w+)/)
            if (!nameMatch) break
            const modName = nameMatch[1]
            i += modName.length
            let modArgs: any[] = []
            if (i < remainingPart.length && remainingPart[i] === '(') {
                let depth = 0,
                    inStr = false,
                    strCh = '',
                    start = i
                for (let j = i; j < remainingPart.length; j++) {
                    const ch = remainingPart[j]
                    if (inStr) {
                        // Count consecutive backslashes before the quote
                        let backslashCount = 0
                        for (let k = j - 1; k >= 0 && remainingPart[k] === '\\'; k--) {
                            backslashCount++
                        }
                        // If even number of backslashes (including 0), the quote is not escaped
                        if (ch === strCh && backslashCount % 2 === 0) inStr = false
                    } else if (ch === '"' || ch === "'") {
                        inStr = true
                        strCh = ch
                    } else if (ch === '(') depth++
                    else if (ch === ')') {
                        depth--
                        if (depth === 0) {
                            const argsStr = remainingPart.substring(start, j + 1)
                            // Allow object defaults and complex args
                            modArgs = this.parseComplexArguments(argsStr)
                            i = j + 1
                            break
                        }
                    }
                }
            }
            if (!this.ALLOWED_MODIFIERS.includes(modName as any)) {
                throw new Error(`Unsupported modifier: ${modName}`)
            }
            modifiers.push({ name: modName, args: modArgs })
            if (i < remainingPart.length && remainingPart[i] === '.') i++
        }

        return { unionPart, modifiers, hasModifiers: true }
    }

    private static validateTypeInfo(typeInfo: any): void {
        // If it's a nested object or array of objects, validate each property
        if (typeInfo.isNestedObject || typeInfo.isArrayOfObjects) {
            for (const propValue of Object.values(typeInfo.objectSchema)) {
                this.validateTypeInfo(propValue)
            }
            return
        }

        // If it's a simple array, validate the inner type
        if (typeInfo.isSimpleArray) {
            this.validateTypeInfo(typeInfo.innerType)
            return
        }

        // If it's a union, validate each member
        if (typeInfo.isUnion) {
            for (const member of typeInfo.members) {
                this.validateTypeInfo(member)
            }
            return
        }

        // If it's a literal, no further validation needed
        if (typeInfo.isLiteral) {
            return
        }

        // Validate base type
        if (!this.ALLOWED_BASE_TYPES.includes(typeInfo.base)) {
            throw new Error(`Unsupported type: ${typeInfo.base}`)
        }

        // Validate modifiers
        for (const modifier of typeInfo.modifiers || []) {
            if (!this.ALLOWED_MODIFIERS.includes(modifier.name)) {
                throw new Error(`Unsupported modifier: ${modifier.name}`)
            }
        }
    }

    private static parseArguments(argsStr: string): any[] {
        // Remove outer parentheses
        const inner = argsStr.slice(1, -1).trim()
        if (!inner) return []

        // Simple argument parsing for basic cases
        if (inner.startsWith('[') && inner.endsWith(']')) {
            // Array argument
            const arrayContent = inner.slice(1, -1)
            return [this.parseArrayContent(arrayContent)]
        } else if (inner.match(/^\d+$/)) {
            // Number argument
            return [parseInt(inner, 10)]
        } else if (inner.startsWith('"') && inner.endsWith('"')) {
            // String argument
            return [inner.slice(1, -1)]
        } else {
            // Try to parse as comma-separated values
            return inner.split(',').map((arg) => {
                arg = arg.trim()
                if (arg.match(/^\d+$/)) return parseInt(arg, 10)
                if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1)
                return arg
            })
        }
    }

    private static parseArrayContent(content: string): string[] {
        const items: string[] = []
        let current = ''
        let inString = false
        let stringChar = ''

        for (let i = 0; i < content.length; i++) {
            const char = content[i]

            if (!inString && (char === '"' || char === "'")) {
                inString = true
                stringChar = char
                current += char
            } else if (inString && char === stringChar && content[i - 1] !== '\\') {
                inString = false
                current += char
            } else if (!inString && char === ',') {
                items.push(current.trim().replace(/^["']|["']$/g, ''))
                current = ''
            } else {
                current += char
            }
        }

        if (current.trim()) {
            items.push(current.trim().replace(/^["']|["']$/g, ''))
        }

        return items
    }

    private static extractArrayWithModifiers(typeStr: string): { arrayPart: string; modifiers: any[]; hasModifiers: boolean } {
        // Find the matching closing parenthesis for z.array(
        let depth = 0
        let arrayEndIndex = -1
        let startIndex = typeStr.indexOf('z.array(') + 7 // Position after "z.array"

        for (let i = startIndex; i < typeStr.length; i++) {
            if (typeStr[i] === '(') depth++
            else if (typeStr[i] === ')') {
                depth--
                if (depth === 0) {
                    arrayEndIndex = i + 1
                    break
                }
            }
        }

        if (arrayEndIndex === -1) {
            return { arrayPart: typeStr, modifiers: [], hasModifiers: false }
        }

        const arrayPart = typeStr.substring(0, arrayEndIndex)
        const remainingPart = typeStr.substring(arrayEndIndex)

        if (!remainingPart.startsWith('.')) {
            return { arrayPart: typeStr, modifiers: [], hasModifiers: false }
        }

        // Parse modifiers
        const modifiers: any[] = []
        const modifierParts = remainingPart.substring(1).split('.')

        for (const part of modifierParts) {
            const modMatch = part.match(/^(\w+)(\(.*\))?$/)
            if (!modMatch) {
                throw new Error(`Invalid modifier: ${part}`)
            }

            const modName = modMatch[1]
            const modArgs = modMatch[2] ? this.parseArguments(modMatch[2]) : []

            if (!this.ALLOWED_MODIFIERS.includes(modName as any)) {
                throw new Error(`Unsupported modifier: ${modName}`)
            }

            modifiers.push({ name: modName, args: modArgs })
        }

        return { arrayPart, modifiers, hasModifiers: true }
    }

    private static extractObjectWithModifiers(typeStr: string): { objectPart: string; modifiers: any[]; hasModifiers: boolean } {
        // Find the matching closing brace and parenthesis for z.object({...})
        let braceDepth = 0
        let parenDepth = 0
        let objectEndIndex = -1
        let startIndex = typeStr.indexOf('z.object(') + 8 // Position after "z.object"
        let foundOpenBrace = false

        for (let i = startIndex; i < typeStr.length; i++) {
            if (typeStr[i] === '{') {
                braceDepth++
                foundOpenBrace = true
            } else if (typeStr[i] === '}') {
                braceDepth--
            } else if (typeStr[i] === '(' && foundOpenBrace) {
                parenDepth++
            } else if (typeStr[i] === ')' && foundOpenBrace) {
                if (braceDepth === 0 && parenDepth === 0) {
                    objectEndIndex = i + 1
                    break
                }
                parenDepth--
            }
        }

        if (objectEndIndex === -1) {
            return { objectPart: typeStr, modifiers: [], hasModifiers: false }
        }

        const objectPart = typeStr.substring(0, objectEndIndex)
        const remainingPart = typeStr.substring(objectEndIndex)

        if (!remainingPart.startsWith('.')) {
            return { objectPart: typeStr, modifiers: [], hasModifiers: false }
        }

        // Parse modifiers (need special handling for .default() with object argument)
        const modifiers: any[] = []
        let i = 1 // Skip the initial dot

        while (i < remainingPart.length) {
            // Find modifier name
            const modNameMatch = remainingPart.substring(i).match(/^(\w+)/)
            if (!modNameMatch) break

            const modName = modNameMatch[1]
            i += modName.length

            // Check for arguments
            let modArgs: any[] = []
            if (i < remainingPart.length && remainingPart[i] === '(') {
                // Find matching closing paren, handling nested structures
                let depth = 0
                let argStart = i
                for (let j = i; j < remainingPart.length; j++) {
                    if (remainingPart[j] === '(') depth++
                    else if (remainingPart[j] === ')') {
                        depth--
                        if (depth === 0) {
                            const argsStr = remainingPart.substring(argStart, j + 1)
                            modArgs = this.parseComplexArguments(argsStr)
                            i = j + 1
                            break
                        }
                    }
                }
            }

            if (!this.ALLOWED_MODIFIERS.includes(modName as any)) {
                throw new Error(`Unsupported modifier: ${modName}`)
            }

            modifiers.push({ name: modName, args: modArgs })

            // Skip dot if present
            if (i < remainingPart.length && remainingPart[i] === '.') {
                i++
            }
        }

        return { objectPart, modifiers, hasModifiers: modifiers.length > 0 }
    }

    private static parseComplexArguments(argsStr: string): any[] {
        // Remove outer parentheses
        const inner = argsStr.slice(1, -1).trim()
        if (!inner) return []

        // Check if it's an object literal
        if (inner.startsWith('{') && inner.endsWith('}')) {
            // Parse object literal for .default()
            return [this.parseObjectLiteral(inner)]
        }

        // Use existing parseArguments for simple cases
        return this.parseArguments(argsStr)
    }

    private static parseObjectLiteral(objStr: string): any {
        // Simple object literal parser for default values
        const obj: any = {}
        const content = objStr.slice(1, -1).trim() // Remove { }

        if (!content) return obj

        // Split by comma at depth 0
        const props = this.splitProperties(content)

        for (const prop of props) {
            const colonIndex = prop.indexOf(':')
            if (colonIndex === -1) continue

            const key = prop.substring(0, colonIndex).trim().replace(/['"]/g, '')
            const valueStr = prop.substring(colonIndex + 1).trim()

            // Parse the value
            if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                // Array value
                const arrayContent = valueStr.slice(1, -1)
                obj[key] = this.parseArrayContent(arrayContent)
            } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
                // String value
                obj[key] = valueStr.slice(1, -1)
            } else if (valueStr.match(/^\d+$/)) {
                // Number value
                obj[key] = parseInt(valueStr, 10)
            } else {
                obj[key] = valueStr
            }
        }

        return obj
    }

    private static buildZodSchema(parsed: Record<string, any> | any): z.ZodTypeAny {
        // If parsed is not a plain object with string keys, it's a top-level non-object schema
        if (parsed.isArrayOfObjects || parsed.isSimpleArray || parsed.isUnion || parsed.isLiteral) {
            return this.buildZodType(parsed)
        }

        // Otherwise, build a z.object
        const schemaObj: Record<string, z.ZodTypeAny> = {}

        for (const [key, typeInfo] of Object.entries(parsed)) {
            schemaObj[key] = this.buildZodType(typeInfo)
        }

        return z.object(schemaObj)
    }

    private static buildZodType(typeInfo: any): z.ZodTypeAny {
        // Special case for nested objects
        if (typeInfo.isNestedObject) {
            let zodType: z.ZodTypeAny = this.buildZodSchema(typeInfo.objectSchema)

            // Apply modifiers if present
            if (typeInfo.modifiers) {
                zodType = this.applyModifiers(zodType, typeInfo.modifiers)
            }

            return zodType
        }

        // Special case for array of objects
        if (typeInfo.isArrayOfObjects) {
            const objectSchema = this.buildZodSchema(typeInfo.objectSchema)
            let zodType: z.ZodTypeAny = z.array(objectSchema)

            // Apply modifiers if present
            if (typeInfo.modifiers) {
                zodType = this.applyModifiers(zodType, typeInfo.modifiers)
            }

            return zodType
        }

        // Special case for simple arrays
        if (typeInfo.isSimpleArray) {
            const innerZodType = this.buildZodType(typeInfo.innerType)
            let zodType: z.ZodTypeAny = z.array(innerZodType)

            // Apply modifiers if present
            if (typeInfo.modifiers) {
                zodType = this.applyModifiers(zodType, typeInfo.modifiers)
            }

            return zodType
        }

        // Special case for unions
        if (typeInfo.isUnion) {
            // Build each union member
            const builtMembers = typeInfo.members.map((member: any) => this.buildZodType(member))

            // z.union requires at least 2 members and a tuple type
            if (builtMembers.length < 2) {
                throw new Error('Union must have at least 2 members')
            }

            // Create the union with proper tuple typing
            let zodType: z.ZodTypeAny = z.union([builtMembers[0], builtMembers[1], ...builtMembers.slice(2)] as [
                z.ZodTypeAny,
                z.ZodTypeAny,
                ...z.ZodTypeAny[]
            ])

            // Apply modifiers if present
            if (typeInfo.modifiers) {
                zodType = this.applyModifiers(zodType, typeInfo.modifiers)
            }

            return zodType
        }

        // Special case for literals
        if (typeInfo.isLiteral) {
            let zodType: z.ZodTypeAny = z.literal(typeInfo.value)

            // Apply modifiers if present
            if (typeInfo.modifiers) {
                zodType = this.applyModifiers(zodType, typeInfo.modifiers)
            }

            return zodType
        }

        let zodType: z.ZodTypeAny

        // Build base type
        switch (typeInfo.base) {
            case 'string':
                zodType = z.string()
                break
            case 'number':
                zodType = z.number()
                break
            case 'boolean':
                zodType = z.boolean()
                break
            case 'date':
                zodType = z.date()
                break
            case 'enum':
                if (typeInfo.baseArgs && typeInfo.baseArgs[0] && Array.isArray(typeInfo.baseArgs[0])) {
                    const enumValues = typeInfo.baseArgs[0] as [string, ...string[]]
                    zodType = z.enum(enumValues)
                } else {
                    throw new Error('enum requires array of values')
                }
                break
            default:
                throw new Error(`Unsupported base type: ${typeInfo.base}`)
        }

        // Apply modifiers
        zodType = this.applyModifiers(zodType, typeInfo.modifiers || [])

        return zodType
    }

    private static applyModifiers(zodType: z.ZodTypeAny, modifiers: any[]): z.ZodTypeAny {
        for (const modifier of modifiers) {
            switch (modifier.name) {
                case 'int':
                    if (zodType._def?.typeName === 'ZodNumber') {
                        zodType = (zodType as z.ZodNumber).int()
                    }
                    break
                case 'max':
                    if (modifier.args[0] !== undefined) {
                        if (zodType._def?.typeName === 'ZodString') {
                            zodType = (zodType as z.ZodString).max(modifier.args[0])
                        } else if (zodType._def?.typeName === 'ZodArray') {
                            zodType = (zodType as z.ZodArray<any>).max(modifier.args[0])
                        }
                    }
                    break
                case 'min':
                    if (modifier.args[0] !== undefined) {
                        if (zodType._def?.typeName === 'ZodString') {
                            zodType = (zodType as z.ZodString).min(modifier.args[0])
                        } else if (zodType._def?.typeName === 'ZodArray') {
                            zodType = (zodType as z.ZodArray<any>).min(modifier.args[0])
                        }
                    }
                    break
                case 'optional':
                    zodType = zodType.optional()
                    break
                case 'array':
                    zodType = z.array(zodType)
                    break
                case 'describe':
                    if (modifier.args[0]) {
                        zodType = zodType.describe(modifier.args[0])
                    }
                    break
                case 'default':
                    if (modifier.args[0] !== undefined) {
                        zodType = zodType.default(modifier.args[0])
                    }
                    break
                default:
                    // Ignore unknown modifiers for compatibility
                    break
            }
        }
        return zodType
    }
}
