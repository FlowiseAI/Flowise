// Types for entitlement structure
export type EntitlementValue = string | symbol
type EntitlementNode = EntitlementValue | { [key: string]: EntitlementNode }
type EntitlementStructure = { [key: string]: EntitlementNode }

// Helper function to create unique entitlement identifiers
const createEntitlementId = (path: string[]): string => {
    return path.join('.')
}

// Recursive function to build the entitlement tree with proper paths
const buildEntitlementTree = <T extends EntitlementStructure>(structure: T, parentPath: string[] = []): T => {
    const result: any = {}

    for (const [key, value] of Object.entries(structure)) {
        const currentPath = [...parentPath, key]

        if (value === undefined || typeof value === 'string' || typeof value === 'symbol') {
            // Leaf node - create entitlement identifier
            result[key] = createEntitlementId(currentPath)
        } else if (typeof value === 'object' && value !== null) {
            // Branch node - recurse
            result[key] = buildEntitlementTree(value as EntitlementStructure, currentPath)
        }
    }

    return result as T
}

// Factory function to create entitlements
const createEntitlements = <T extends EntitlementStructure>(structure: T): T => {
    return buildEntitlementTree(structure)
}

// Placeholder values for entitlement operations
const addUser = 'add-user'
const addLoader = 'add-loader'
const deleteLoader = 'delete-loader'
const config = 'config'
const create = 'create'
const custom = 'custom'
const customDelete = 'custom-delete'
const customShare = 'custom-share'
const del = 'delete' // 'delete' is a reserved word
const domains = 'domains'
const duplicate = 'duplicate'
const exp = 'export' // 'export' is a reserved word
const flowexport = 'flowexport'
const imp = 'import' // 'import' is a reserved word
const manage = 'manage'
const marketplace = 'marketplace'
const previewProcess = 'preview-process'
const run = 'run'
const share = 'share'
const toolexport = 'toolexport'
const unlinkUser = 'unlink-user'
const unspecified = 'unspecified'
const update = 'update'
const upsertConfig = 'upsert-config'
const view = 'view'

// The canonical list of entitlements
const entitlements = {
    agentflows: {
        view,
        create,
        update,
        duplicate,
        delete: del,
        export: exp,
        import: imp,
        config,
        domains
    },
    apikeys: {
        create,
        import: imp,
        view,
        update,
        delete: del
    },
    assistants: {
        create,
        delete: del,
        update,
        view
    },
    chatflows: {
        config,
        create,
        delete: del,
        domains,
        duplicate,
        export: exp,
        import: imp,
        update,
        view
    },
    credentials: {
        create,
        delete: del,
        update,
        share,
        view
    },
    datasets: {
        create,
        delete: del,
        update,
        view
    },
    documentStores: {
        addLoader: addLoader,
        create,
        deleteLoader: deleteLoader,
        delete: del,
        previewProcess: previewProcess,
        update,
        view,
        upsertConfig: upsertConfig
    },
    evaluations: {
        create,
        delete: del,
        run,
        update,
        view
    },
    evaluators: {
        create,
        delete: del,
        update,
        view
    },
    executions: {
        create,
        delete: del,
        view
    },
    loginActivity: {
        view,
        delete: del
    },
    logs: {
        view
    },
    roles: {
        manage
    },
    sso: {
        manage
    },
    templates: {
        marketplace,
        flowexport,
        toolexport,
        custom,
        customDelete,
        customShare
    },
    tools: {
        create,
        delete: del,
        export: exp,
        update,
        view
    },
    users: {
        manage
    },
    workspace: {
        addUser,
        create,
        delete: del,
        export: exp,
        import: imp,
        unlinkUser,
        update,
        view
    },
    unspecified,
    variables: {
        create,
        delete: del,
        update,
        view
    }
} as const // <-- crucial for type safety

// Create the Entitlements object
export const Entitlements = createEntitlements(entitlements)

// Type to recursively extract all leaf string values from a nested object
export type ExtractLeafStrings<T> = T extends string
    ? T
    : T extends Record<string, any>
    ? { [K in keyof T]: ExtractLeafStrings<T[K]> }[keyof T]
    : never

// Type union of all entitlement strings
export type Entitlement = ExtractLeafStrings<typeof Entitlements>