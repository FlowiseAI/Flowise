import { Entitlement, Entitlements } from './Entitlements'

export class Permissions {
    private categories: PermissionCategory[] = []
    constructor() {
        // const auditCategory = new PermissionCategory('audit')
        // auditCategory.addPermission(new Permission('auditLogs:view', 'View Audit Logs'))
        // this.categories.push(auditCategory)

        const chatflowsCategory = new PermissionCategory('chatflows')
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.view, 'View'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.create, 'Create'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.update, 'Update'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.duplicate, 'Duplicate'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.delete, 'Delete'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.export, 'Export'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.import, 'Import'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.config, 'Edit Configuration'))
        chatflowsCategory.addPermission(new Permission(Entitlements.chatflows.domains, 'Allowed Domains'))
        this.categories.push(chatflowsCategory)

        const agentflowsCategory = new PermissionCategory('agentflows')
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.view, 'View'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.create, 'Create'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.update, 'Update'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.duplicate, 'Duplicate'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.delete, 'Delete'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.export, 'Export'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.import, 'Import'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.config, 'Edit Configuration'))
        agentflowsCategory.addPermission(new Permission(Entitlements.agentflows.domains, 'Allowed Domains'))
        this.categories.push(agentflowsCategory)

        const toolsCategory = new PermissionCategory('tools')
        toolsCategory.addPermission(new Permission(Entitlements.tools.view, 'View'))
        toolsCategory.addPermission(new Permission(Entitlements.tools.create, 'Create'))
        toolsCategory.addPermission(new Permission(Entitlements.tools.update, 'Update'))
        toolsCategory.addPermission(new Permission(Entitlements.tools.delete, 'Delete'))
        toolsCategory.addPermission(new Permission(Entitlements.tools.export, 'Export'))
        this.categories.push(toolsCategory)

        const assistantsCategory = new PermissionCategory('assistants')
        assistantsCategory.addPermission(new Permission(Entitlements.assistants.view, 'View'))
        assistantsCategory.addPermission(new Permission(Entitlements.assistants.create, 'Create'))
        assistantsCategory.addPermission(new Permission(Entitlements.assistants.update, 'Update'))
        assistantsCategory.addPermission(new Permission(Entitlements.assistants.delete, 'Delete'))
        this.categories.push(assistantsCategory)

        const credentialsCategory = new PermissionCategory('credentials')
        credentialsCategory.addPermission(new Permission(Entitlements.credentials.view, 'View'))
        credentialsCategory.addPermission(new Permission(Entitlements.credentials.create, 'Create'))
        credentialsCategory.addPermission(new Permission(Entitlements.credentials.update, 'Update'))
        credentialsCategory.addPermission(new Permission(Entitlements.credentials.delete, 'Delete'))
        credentialsCategory.addPermission(new Permission(Entitlements.credentials.share, 'Share'))
        this.categories.push(credentialsCategory)

        const variablesCategory = new PermissionCategory('variables')
        variablesCategory.addPermission(new Permission(Entitlements.variables.view, 'View'))
        variablesCategory.addPermission(new Permission(Entitlements.variables.create, 'Create'))
        variablesCategory.addPermission(new Permission(Entitlements.variables.update, 'Update'))
        variablesCategory.addPermission(new Permission(Entitlements.variables.delete, 'Delete'))
        this.categories.push(variablesCategory)

        const apikeysCategory = new PermissionCategory('apikeys')
        apikeysCategory.addPermission(new Permission(Entitlements.apikeys.view, 'View'))
        apikeysCategory.addPermission(new Permission(Entitlements.apikeys.create, 'Create'))
        apikeysCategory.addPermission(new Permission(Entitlements.apikeys.update, 'Update'))
        apikeysCategory.addPermission(new Permission(Entitlements.apikeys.delete, 'Delete'))
        apikeysCategory.addPermission(new Permission(Entitlements.apikeys.import, 'Import'))
        this.categories.push(apikeysCategory)

        const documentStoresCategory = new PermissionCategory('documentStores')
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.view, 'View'))
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.create, 'Create'))
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.update, 'Update'))
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.delete, 'Delete Document Store'))
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.addLoader, 'Add Document Loader'))
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.deleteLoader, 'Delete Document Loader'))
        documentStoresCategory.addPermission(
            new Permission(Entitlements.documentStores.previewProcess, 'Preview & Process Document Chunks')
        )
        documentStoresCategory.addPermission(new Permission(Entitlements.documentStores.upsertConfig, 'Upsert Config'))
        this.categories.push(documentStoresCategory)

        const datasetsCategory = new PermissionCategory('datasets')
        datasetsCategory.addPermission(new Permission(Entitlements.datasets.view, 'View'))
        datasetsCategory.addPermission(new Permission(Entitlements.datasets.create, 'Create'))
        datasetsCategory.addPermission(new Permission(Entitlements.datasets.update, 'Update'))
        datasetsCategory.addPermission(new Permission(Entitlements.datasets.delete, 'Delete'))
        this.categories.push(datasetsCategory)

        const executionsCategory = new PermissionCategory('executions')
        executionsCategory.addPermission(new Permission(Entitlements.executions.view, 'View'))
        executionsCategory.addPermission(new Permission(Entitlements.executions.delete, 'Delete'))
        this.categories.push(executionsCategory)

        const evaluatorsCategory = new PermissionCategory('evaluators')
        evaluatorsCategory.addPermission(new Permission(Entitlements.evaluators.view, 'View'))
        evaluatorsCategory.addPermission(new Permission(Entitlements.evaluators.create, 'Create'))
        evaluatorsCategory.addPermission(new Permission(Entitlements.evaluators.update, 'Update'))
        evaluatorsCategory.addPermission(new Permission(Entitlements.evaluators.delete, 'Delete'))
        this.categories.push(evaluatorsCategory)

        const evaluationsCategory = new PermissionCategory('evaluations')
        evaluationsCategory.addPermission(new Permission(Entitlements.evaluations.view, 'View'))
        evaluationsCategory.addPermission(new Permission(Entitlements.evaluations.create, 'Create'))
        evaluationsCategory.addPermission(new Permission(Entitlements.evaluations.update, 'Update'))
        evaluationsCategory.addPermission(new Permission(Entitlements.evaluations.delete, 'Delete'))
        evaluationsCategory.addPermission(new Permission(Entitlements.evaluations.run, 'Run Again'))
        this.categories.push(evaluationsCategory)

        const templatesCategory = new PermissionCategory('templates')
        templatesCategory.addPermission(new Permission(Entitlements.templates.marketplace, 'View Marketplace Templates'))
        templatesCategory.addPermission(new Permission(Entitlements.templates.custom, 'View Custom Templates'))
        templatesCategory.addPermission(new Permission(Entitlements.templates.customDelete, 'Delete Custom Template'))
        templatesCategory.addPermission(new Permission(Entitlements.templates.toolexport, 'Export Tool as Template'))
        templatesCategory.addPermission(new Permission(Entitlements.templates.flowexport, 'Export Flow as Template'))
        templatesCategory.addPermission(new Permission(Entitlements.templates.customShare, 'Share Custom Templates'))
        this.categories.push(templatesCategory)

        const workspaceCategory = new PermissionCategory('workspace')
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.view, 'View'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.create, 'Create'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.update, 'Update'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.addUser, 'Add User'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.unlinkUser, 'Remove User'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.delete, 'Delete'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.export, 'Export Data within Workspace'))
        workspaceCategory.addPermission(new Permission(Entitlements.workspace.import, 'Import Data within Workspace'))
        this.categories.push(workspaceCategory)

        const adminCategory = new PermissionCategory('admin')
        adminCategory.addPermission(new Permission(Entitlements.users.manage, 'Manage Users'))
        adminCategory.addPermission(new Permission(Entitlements.roles.manage, 'Manage Roles'))
        adminCategory.addPermission(new Permission(Entitlements.sso.manage, 'Manage SSO'))
        this.categories.push(adminCategory)

        const logsCategory = new PermissionCategory('logs')
        logsCategory.addPermission(new Permission(Entitlements.logs.view, 'View Logs', true))
        this.categories.push(logsCategory)

        const loginActivityCategory = new PermissionCategory('loginActivity')
        loginActivityCategory.addPermission(new Permission(Entitlements.loginActivity.view, 'View Login Activity', true))
        loginActivityCategory.addPermission(new Permission(Entitlements.loginActivity.delete, 'Delete Login Activity', true))
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
    constructor(public entitlement: Entitlement, public description: string, public isEnterprise: boolean = false) {}

    public toJSON() {
        return {
            key: this.entitlement,
            value: this.description,
            isEnterprise: this.isEnterprise
        }
    }
}
