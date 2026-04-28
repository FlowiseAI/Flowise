/**
 * This parser safely handles Supabase filter strings without allowing arbitrary code execution
 */
export class FilterParser {
    private static readonly ALLOWED_METHODS = ['filter', 'order', 'limit', 'range', 'single', 'maybeSingle']
    private static readonly ALLOWED_OPERATORS = [
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'like',
        'ilike',
        'is',
        'in',
        'cs',
        'cd',
        'sl',
        'sr',
        'nxl',
        'nxr',
        'adj',
        'ov',
        'fts',
        'plfts',
        'phfts',
        'wfts'
    ]

    /**
     * Safely parse a Supabase RPC filter string into a function
     * @param filterString The filter string (e.g., 'filter("metadata->a::int", "gt", 5).filter("metadata->c::int", "gt", 7)')
     * @returns A function that can be applied to an RPC object
     * @throws Error if the filter string contains unsafe patterns
     */
    static parseFilterString(filterString: string): (rpc: any) => any {
        try {
            // Clean and validate the filter string
            const cleanedFilter = this.cleanFilterString(filterString)

            // Parse the filter chain
            const filterChain = this.parseFilterChain(cleanedFilter)

            // Build the safe filter function
            return this.buildFilterFunction(filterChain)
        } catch (error) {
            throw new Error(`Failed to parse Supabase filter: ${error.message}`)
        }
    }

    private static cleanFilterString(filter: string): string {
        // Remove comments and normalize whitespace
        filter = filter.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        filter = filter.replace(/\s+/g, ' ').trim()

        // Remove trailing semicolon if present
        if (filter.endsWith(';')) {
            filter = filter.slice(0, -1).trim()
        }

        return filter
    }

    private static parseFilterChain(filter: string): Array<{ method: string; args: any[] }> {
        const chain: Array<{ method: string; args: any[] }> = []

        // Split on method calls (e.g., .filter, .order, etc.)
        const methodPattern = /\.?(\w+)\s*\((.*?)\)(?=\s*(?:\.|$))/g
        let match

        while ((match = methodPattern.exec(filter)) !== null) {
            const method = match[1]
            const argsString = match[2]

            // Validate method name
            if (!this.ALLOWED_METHODS.includes(method)) {
                throw new Error(`Disallowed method: ${method}`)
            }

            // Parse arguments safely
            const args = this.parseArguments(argsString)

            // Additional validation for filter method
            if (method === 'filter' && args.length >= 2) {
                const operator = args[1]
                if (typeof operator === 'string' && !this.ALLOWED_OPERATORS.includes(operator)) {
                    throw new Error(`Disallowed filter operator: ${operator}`)
                }
            }

            chain.push({ method, args })
        }

        if (chain.length === 0) {
            throw new Error('No valid filter methods found')
        }

        return chain
    }

    private static parseArguments(argsString: string): any[] {
        if (!argsString.trim()) {
            return []
        }

        const args: any[] = []
        let current = ''
        let inString = false
        let stringChar = ''
        let depth = 0

        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i]

            if (!inString && (char === '"' || char === "'")) {
                inString = true
                stringChar = char
                current += char
            } else if (inString && char === stringChar && argsString[i - 1] !== '\\') {
                inString = false
                current += char
            } else if (!inString) {
                if (char === '(' || char === '[' || char === '{') {
                    depth++
                    current += char
                } else if (char === ')' || char === ']' || char === '}') {
                    depth--
                    current += char
                } else if (char === ',' && depth === 0) {
                    args.push(this.parseArgument(current.trim()))
                    current = ''
                    continue
                } else {
                    current += char
                }
            } else {
                current += char
            }
        }

        if (current.trim()) {
            args.push(this.parseArgument(current.trim()))
        }

        return args
    }

    private static parseArgument(arg: string): any {
        arg = arg.trim()

        // Handle strings
        if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
            return arg.slice(1, -1)
        }

        // Handle numbers
        if (arg.match(/^-?\d+(\.\d+)?$/)) {
            return parseFloat(arg)
        }

        // Handle booleans
        if (arg === 'true') return true
        if (arg === 'false') return false
        if (arg === 'null') return null

        // Handle arrays (basic support)
        if (arg.startsWith('[') && arg.endsWith(']')) {
            const arrayContent = arg.slice(1, -1).trim()
            if (!arrayContent) return []

            // Simple array parsing - just split by comma and parse each element
            return arrayContent.split(',').map((item) => this.parseArgument(item.trim()))
        }

        // For everything else, treat as string (but validate it doesn't contain dangerous characters)
        if (arg.includes('require') || arg.includes('process') || arg.includes('eval') || arg.includes('Function')) {
            throw new Error(`Potentially dangerous argument: ${arg}`)
        }

        return arg
    }

    private static buildFilterFunction(chain: Array<{ method: string; args: any[] }>): (rpc: any) => any {
        return (rpc: any) => {
            let result = rpc

            for (const { method, args } of chain) {
                if (typeof result[method] !== 'function') {
                    throw new Error(`Method ${method} is not available on the RPC object`)
                }

                try {
                    result = result[method](...args)
                } catch (error) {
                    throw new Error(`Failed to call ${method}: ${error.message}`)
                }
            }

            return result
        }
    }
}
