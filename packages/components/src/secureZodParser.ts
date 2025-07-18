import { z } from 'zod'

/**
 * This parser safely handles Zod schema strings without allowing arbitrary code execution
 */
export class SecureZodSchemaParser {
    private static readonly ALLOWED_TYPES = [
        'string',
        'number',
        'int',
        'boolean',
        'date',
        'object',
        'array',
        'enum',
        'optional',
        'max',
        'min',
        'describe'
    ]

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

        if (!schema.startsWith('z.object(')) {
            throw new Error('Schema must start with z.object()')
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

    private static buildZodSchema(parsed: Record<string, any>): z.ZodObject<any> {
        const schemaObj: Record<string, z.ZodTypeAny> = {}

        for (const [key, typeInfo] of Object.entries(parsed)) {
            schemaObj[key] = this.buildZodType(typeInfo)
        }

        return z.object(schemaObj)
    }

    private static buildZodType(typeInfo: any): z.ZodTypeAny {
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
        for (const modifier of typeInfo.modifiers || []) {
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
                default:
                    // Ignore unknown modifiers for compatibility
                    break
            }
        }

        return zodType
    }
}
