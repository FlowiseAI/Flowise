export class Permissions {
    private categories: PermissionCategory[] = []
    constructor() {
        // const auditCategory = new PermissionCategory('audit')
        // auditCategory.addPermission(new Permission('auditLogs:view', 'View Audit Logs'))
        // this.categories.push(auditCategory)

        const chatflowsCategory = new PermissionCategory('chatflows')
        chatflowsCategory.addPermission(new Permission('chatflows:view', 'View'))
        chatflowsCategory.addPermission(new Permission('chatflows:create', 'Create'))
        chatflowsCategory.addPermission(new Permission('chatflows:update', 'Update'))
        chatflowsCategory.addPermission(new Permission('chatflows:duplicate', 'Duplicate'))
        chatflowsCategory.addPermission(new Permission('chatflows:delete', 'Delete'))
        chatflowsCategory.addPermission(new Permission('chatflows:export', 'Export'))
        chatflowsCategory.addPermission(new Permission('chatflows:import', 'Import'))
        chatflowsCategory.addPermission(new Permission('chatflows:config', 'Edit Configuration'))
        chatflowsCategory.addPermission(new Permission('chatflows:domains', 'Allowed Domains'))
        this.categories.push(chatflowsCategory)

        const agentflowsCategory = new PermissionCategory('agentflows')
        agentflowsCategory.addPermission(new Permission('agentflows:view', 'View'))
        agentflowsCategory.addPermission(new Permission('agentflows:create', 'Create'))
        agentflowsCategory.addPermission(new Permission('agentflows:update', 'Update'))
        agentflowsCategory.addPermission(new Permission('agentflows:duplicate', 'Duplicate'))
        agentflowsCategory.addPermission(new Permission('agentflows:delete', 'Delete'))
        agentflowsCategory.addPermission(new Permission('agentflows:export', 'Export'))
        agentflowsCategory.addPermission(new Permission('agentflows:import', 'Import'))
        agentflowsCategory.addPermission(new Permission('agentflows:config', 'Edit Configuration'))
        agentflowsCategory.addPermission(new Permission('agentflows:domains', 'Allowed Domains'))
        this.categories.push(agentflowsCategory)

        const toolsCategory = new PermissionCategory('tools')
        toolsCategory.addPermission(new Permission('tools:view', 'View'))
        toolsCategory.addPermission(new Permission('tools:create', 'Create'))
        toolsCategory.addPermission(new Permission('tools:update', 'Update'))
        toolsCategory.addPermission(new Permission('tools:delete', 'Delete'))
        toolsCategory.addPermission(new Permission('tools:export', 'Export'))
        this.categories.push(toolsCategory)

        const assistantsCategory = new PermissionCategory('assistants')
        assistantsCategory.addPermission(new Permission('assistants:view', 'View'))
        assistantsCategory.addPermission(new Permission('assistants:create', 'Create'))
        assistantsCategory.addPermission(new Permission('assistants:update', 'Update'))
        assistantsCategory.addPermission(new Permission('assistants:delete', 'Delete'))
        this.categories.push(assistantsCategory)

        const credentialsCategory = new PermissionCategory('credentials')
        credentialsCategory.addPermission(new Permission('credentials:view', 'View'))
        credentialsCategory.addPermission(new Permission('credentials:create', 'Create'))
        credentialsCategory.addPermission(new Permission('credentials:update', 'Update'))
        credentialsCategory.addPermission(new Permission('credentials:delete', 'Delete'))
        credentialsCategory.addPermission(new Permission('credentials:share', 'Share'))
        this.categories.push(credentialsCategory)

        const variablesCategory = new PermissionCategory('variables')
        variablesCategory.addPermission(new Permission('variables:view', 'View'))
        variablesCategory.addPermission(new Permission('variables:create', 'Create'))
        variablesCategory.addPermission(new Permission('variables:update', 'Update'))
        variablesCategory.addPermission(new Permission('variables:delete', 'Delete'))
        this.categories.push(variablesCategory)

        const apikeysCategory = new PermissionCategory('apikeys')
        apikeysCategory.addPermission(new Permission('apikeys:view', 'View'))
        apikeysCategory.addPermission(new Permission('apikeys:create', 'Create'))
        apikeysCategory.addPermission(new Permission('apikeys:update', 'Update'))
        apikeysCategory.addPermission(new Permission('apikeys:delete', 'Delete'))
        apikeysCategory.addPermission(new Permission('apikeys:import', 'Import'))
        this.categories.push(apikeysCategory)

        const documentStoresCategory = new PermissionCategory('documentStores')
        documentStoresCategory.addPermission(new Permission('documentStores:view', 'View'))
        documentStoresCategory.addPermission(new Permission('documentStores:create', 'Create'))
        documentStoresCategory.addPermission(new Permission('documentStores:update', 'Update'))
        documentStoresCategory.addPermission(new Permission('documentStores:delete', 'Delete Document Store'))
        documentStoresCategory.addPermission(new Permission('documentStores:add-loader', 'Add Document Loader'))
        documentStoresCategory.addPermission(new Permission('documentStores:delete-loader', 'Delete Document Loader'))
        documentStoresCategory.addPermission(new Permission('documentStores:preview-process', 'Preview & Process Document Chunks'))
        documentStoresCategory.addPermission(new Permission('documentStores:upsert-config', 'Upsert Config'))
        this.categories.push(documentStoresCategory)

        const datasetsCategory = new PermissionCategory('datasets')
        datasetsCategory.addPermission(new Permission('datasets:view', 'View'))
        datasetsCategory.addPermission(new Permission('datasets:create', 'Create'))
        datasetsCategory.addPermission(new Permission('datasets:update', 'Update'))
        datasetsCategory.addPermission(new Permission('datasets:delete', 'Delete'))
        this.categories.push(datasetsCategory)

        const executionsCategory = new PermissionCategory('executions')
        executionsCategory.addPermission(new Permission('executions:view', 'View'))
        executionsCategory.addPermission(new Permission('executions:delete', 'Delete'))
        this.categories.push(executionsCategory)

        const evaluatorsCategory = new PermissionCategory('evaluators')
        evaluatorsCategory.addPermission(new Permission('evaluators:view', 'View'))
        evaluatorsCategory.addPermission(new Permission('evaluators:create', 'Create'))
        evaluatorsCategory.addPermission(new Permission('evaluators:update', 'Update'))
        evaluatorsCategory.addPermission(new Permission('evaluators:delete', 'Delete'))
        this.categories.push(evaluatorsCategory)

        const evaluationsCategory = new PermissionCategory('evaluations')
        evaluationsCategory.addPermission(new Permission('evaluations:view', 'View'))
        evaluationsCategory.addPermission(new Permission('evaluations:create', 'Create'))
        evaluationsCategory.addPermission(new Permission('evaluations:update', 'Update'))
        evaluationsCategory.addPermission(new Permission('evaluations:delete', 'Delete'))
        evaluationsCategory.addPermission(new Permission('evaluations:run', 'Run Again'))
        this.categories.push(evaluationsCategory)

        const templatesCategory = new PermissionCategory('templates')
        templatesCategory.addPermission(new Permission('templates:marketplace', 'View Marketplace Templates'))
        templatesCategory.addPermission(new Permission('templates:custom', 'View Custom Templates'))
        templatesCategory.addPermission(new Permission('templates:custom-delete', 'Delete Custom Template'))
        templatesCategory.addPermission(new Permission('templates:toolexport', 'Export Tool as Template'))
        templatesCategory.addPermission(new Permission('templates:flowexport', 'Export Flow as Template'))
        templatesCategory.addPermission(new Permission('templates:custom-share', 'Share Custom Templates'))
        this.categories.push(templatesCategory)

        const workspaceCategory = new PermissionCategory('workspace')
        workspaceCategory.addPermission(new Permission('workspace:view', 'View'))
        workspaceCategory.addPermission(new Permission('workspace:create', 'Create'))
        workspaceCategory.addPermission(new Permission('workspace:update', 'Update'))
        workspaceCategory.addPermission(new Permission('workspace:add-user', 'Add User'))
        workspaceCategory.addPermission(new Permission('workspace:unlink-user', 'Remove User'))
        workspaceCategory.addPermission(new Permission('workspace:delete', 'Delete'))
        workspaceCategory.addPermission(new Permission('workspace:export', 'Export Data within Workspace'))
        workspaceCategory.addPermission(new Permission('workspace:import', 'Import Data within Workspace'))
        this.categories.push(workspaceCategory)

        const adminCategory = new PermissionCategory('admin')
        adminCategory.addPermission(new Permission('users:manage', 'Manage Users'))
        adminCategory.addPermission(new Permission('roles:manage', 'Manage Roles'))
        adminCategory.addPermission(new Permission('sso:manage', 'Manage SSO'))
        this.categories.push(adminCategory)

        const logsCategory = new PermissionCategory('logs')
        logsCategory.addPermission(new Permission('logs:view', 'View Logs', true))
        this.categories.push(logsCategory)

        const loginActivityCategory = new PermissionCategory('loginActivity')
        loginActivityCategory.addPermission(new Permission('loginActivity:view', 'View Login Activity', true))
        loginActivityCategory.addPermission(new Permission('loginActivity:delete', 'Delete Login Activity', true))
        this.categories.push(loginActivityCategory)
    }

    public toJSON(): { [key: string]: { key: string; value: string }[] } {
        return this.categories.reduce((acc, category) => {
            return {
                ...acc,
                ...category.toJSON()
            }
        }, {})
    }
}

export class PermissionCategory {
    public permissions: any[] = []

    constructor(public category: string) {}

    addPermission(permission: Permission) {
        this.permissions.push(permission)
    }
    public toJSON() {
        return {
            [this.category]: [...this.permissions.map((permission) => permission.toJSON())]
        }
    }
}

export class Permission {
    constructor(public name: string, public description: string, public isEnterprise: boolean = false) {}

    public toJSON() {
        return {
            key: this.name,
            value: this.description,
            isEnterprise: this.isEnterprise
        }
    }
}
