import { z } from 'zod'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'

export const desc = `Use this when you want to access Jira API for managing issues, comments, and users`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    headers?: Headers
    body?: Body
    url?: string
    description?: string
    maxOutputLength?: number
    name?: string
    actions?: string[]
    username?: string
    accessToken?: string
    jiraHost?: string
    defaultParams?: any
}

// Define schemas for different Jira operations

// Issue Schemas
const ListIssuesSchema = z.object({
    projectKey: z.string().optional().describe('Project key to filter issues'),
    jql: z.string().optional().describe('JQL query for filtering issues'),
    maxResults: z.number().optional().default(50).describe('Maximum number of results to return'),
    startAt: z.number().optional().default(0).describe('Index of the first result to return')
})

const CreateIssueSchema = z.object({
    projectKey: z.string().describe('Project key where the issue will be created'),
    issueType: z.string().describe('Type of issue (Bug, Task, Story, etc.)'),
    summary: z.string().describe('Issue summary/title'),
    description: z.string().optional().describe('Issue description'),
    priority: z.string().optional().describe('Issue priority (Highest, High, Medium, Low, Lowest)'),
    assigneeAccountId: z.string().optional().describe('Account ID of the assignee'),
    labels: z.array(z.string()).optional().describe('Labels to add to the issue')
})

const GetIssueSchema = z.object({
    issueKey: z.string().describe('Issue key (e.g., PROJ-123)')
})

const UpdateIssueSchema = z.object({
    issueKey: z.string().describe('Issue key (e.g., PROJ-123)'),
    summary: z.string().optional().describe('Updated issue summary/title'),
    description: z.string().optional().describe('Updated issue description'),
    priority: z.string().optional().describe('Updated issue priority'),
    assigneeAccountId: z.string().optional().describe('Account ID of the new assignee')
})

const AssignIssueSchema = z.object({
    issueKey: z.string().describe('Issue key (e.g., PROJ-123)'),
    assigneeAccountId: z.string().describe('Account ID of the user to assign')
})

const TransitionIssueSchema = z.object({
    issueKey: z.string().describe('Issue key (e.g., PROJ-123)'),
    transitionId: z.string().describe('ID of the transition to execute')
})

// Comment Schemas
const ListCommentsSchema = z.object({
    issueKey: z.string().describe('Issue key to get comments for'),
    maxResults: z.number().optional().default(50).describe('Maximum number of results to return'),
    startAt: z.number().optional().default(0).describe('Index of the first result to return')
})

const CreateCommentSchema = z.object({
    issueKey: z.string().describe('Issue key to add comment to'),
    text: z.string().describe('Comment text content'),
    visibility: z
        .object({
            type: z.string().optional(),
            value: z.string().optional()
        })
        .optional()
        .describe('Comment visibility settings')
})

const GetCommentSchema = z.object({
    issueKey: z.string().describe('Issue key'),
    commentId: z.string().describe('Comment ID')
})

const UpdateCommentSchema = z.object({
    issueKey: z.string().describe('Issue key'),
    commentId: z.string().describe('Comment ID'),
    text: z.string().describe('Updated comment text')
})

const DeleteCommentSchema = z.object({
    issueKey: z.string().describe('Issue key'),
    commentId: z.string().describe('Comment ID to delete')
})

// User Schemas
const SearchUsersSchema = z.object({
    query: z.string().describe('Query string for user search'),
    maxResults: z.number().optional().default(50).describe('Maximum number of results to return'),
    startAt: z.number().optional().default(0).describe('Index of the first result to return')
})

const GetUserSchema = z.object({
    accountId: z.string().describe('Account ID of the user')
})

const CreateUserSchema = z.object({
    emailAddress: z.string().describe('Email address of the user'),
    displayName: z.string().describe('Display name of the user'),
    username: z.string().optional().describe('Username (deprecated in newer versions)')
})

const UpdateUserSchema = z.object({
    accountId: z.string().describe('Account ID of the user'),
    emailAddress: z.string().optional().describe('Updated email address'),
    displayName: z.string().optional().describe('Updated display name')
})

const DeleteUserSchema = z.object({
    accountId: z.string().describe('Account ID of the user to delete')
})

class BaseJiraTool extends DynamicStructuredTool {
    protected username: string = ''
    protected accessToken: string = ''
    protected jiraHost: string = ''

    constructor(args: any) {
        super(args)
        this.username = args.username ?? ''
        this.accessToken = args.accessToken ?? ''
        this.jiraHost = args.jiraHost ?? ''
    }

    async makeJiraRequest({
        endpoint,
        method = 'GET',
        body,
        params
    }: {
        endpoint: string
        method?: string
        body?: any
        params?: any
    }): Promise<string> {
        const url = `${this.jiraHost}/rest/api/3/${endpoint}`
        const auth = Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')

        const headers = {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.headers
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Jira API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }
}

// Issue Tools
class ListIssuesTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_issues',
            description: 'List issues from Jira using JQL query',
            schema: ListIssuesSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        let jql = params.jql || ''
        if (params.projectKey && !jql.includes('project')) {
            jql = jql ? `project = ${params.projectKey} AND (${jql})` : `project = ${params.projectKey}`
        }

        if (jql) queryParams.append('jql', jql)
        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.startAt) queryParams.append('startAt', params.startAt.toString())

        const endpoint = `search?${queryParams.toString()}`

        try {
            const response = await this.makeJiraRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error listing issues: ${error}`, params)
        }
    }
}

class CreateIssueTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_issue',
            description: 'Create a new issue in Jira',
            schema: CreateIssueSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const issueData: any = {
                fields: {
                    project: {
                        key: params.projectKey
                    },
                    issuetype: {
                        name: params.issueType
                    },
                    summary: params.summary
                }
            }

            if (params.description) {
                issueData.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: params.description
                                }
                            ]
                        }
                    ]
                }
            }

            if (params.priority) {
                issueData.fields.priority = {
                    name: params.priority
                }
            }

            if (params.assigneeAccountId) {
                issueData.fields.assignee = {
                    accountId: params.assigneeAccountId
                }
            }

            if (params.labels) {
                issueData.fields.labels = params.labels
            }

            const response = await this.makeJiraRequest({ endpoint: 'issue', method: 'POST', body: issueData, params })
            return response
        } catch (error) {
            return formatToolError(`Error creating issue: ${error}`, params)
        }
    }
}

class GetIssueTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_issue',
            description: 'Get a specific issue from Jira',
            schema: GetIssueSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `issue/${params.issueKey}`
            const response = await this.makeJiraRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting issue: ${error}`, params)
        }
    }
}

class UpdateIssueTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_issue',
            description: 'Update an existing issue in Jira',
            schema: UpdateIssueSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const updateData: any = {
                fields: {}
            }

            if (params.summary) updateData.fields.summary = params.summary
            if (params.description) {
                updateData.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: params.description
                                }
                            ]
                        }
                    ]
                }
            }
            if (params.priority) {
                updateData.fields.priority = {
                    name: params.priority
                }
            }
            if (params.assigneeAccountId) {
                updateData.fields.assignee = {
                    accountId: params.assigneeAccountId
                }
            }

            const endpoint = `issue/${params.issueKey}`
            const response = await this.makeJiraRequest({ endpoint, method: 'PUT', body: updateData, params })
            return response || 'Issue updated successfully'
        } catch (error) {
            return formatToolError(`Error updating issue: ${error}`, params)
        }
    }
}

class DeleteIssueTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_issue',
            description: 'Delete an issue from Jira',
            schema: GetIssueSchema,
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `issue/${params.issueKey}`
            const response = await this.makeJiraRequest({ endpoint, method: 'DELETE', params })
            return response || 'Issue deleted successfully'
        } catch (error) {
            return formatToolError(`Error deleting issue: ${error}`, params)
        }
    }
}

class AssignIssueTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'assign_issue',
            description: 'Assign an issue to a user in Jira',
            schema: AssignIssueSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const assignData = {
                accountId: params.assigneeAccountId
            }

            const endpoint = `issue/${params.issueKey}/assignee`
            const response = await this.makeJiraRequest({ endpoint, method: 'PUT', body: assignData, params })
            return response || 'Issue assigned successfully'
        } catch (error) {
            return formatToolError(`Error assigning issue: ${error}`, params)
        }
    }
}

class TransitionIssueTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'transition_issue',
            description: 'Transition an issue to a different status in Jira',
            schema: TransitionIssueSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const transitionData = {
                transition: {
                    id: params.transitionId
                }
            }

            const endpoint = `issue/${params.issueKey}/transitions`
            const response = await this.makeJiraRequest({ endpoint, method: 'POST', body: transitionData, params })
            return response || 'Issue transitioned successfully'
        } catch (error) {
            return formatToolError(`Error transitioning issue: ${error}`, params)
        }
    }
}

// Comment Tools
class ListCommentsTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_comments',
            description: 'List comments for a Jira issue',
            schema: ListCommentsSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.startAt) queryParams.append('startAt', params.startAt.toString())

        const endpoint = `issue/${params.issueKey}/comment?${queryParams.toString()}`

        try {
            const response = await this.makeJiraRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error listing comments: ${error}`, params)
        }
    }
}

class CreateCommentTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_comment',
            description: 'Create a comment on a Jira issue',
            schema: CreateCommentSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const commentData: any = {
                body: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: params.text
                                }
                            ]
                        }
                    ]
                }
            }

            if (params.visibility) {
                commentData.visibility = params.visibility
            }

            const endpoint = `issue/${params.issueKey}/comment`
            const response = await this.makeJiraRequest({ endpoint, method: 'POST', body: commentData, params })
            return response
        } catch (error) {
            return formatToolError(`Error creating comment: ${error}`, params)
        }
    }
}

class GetCommentTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_comment',
            description: 'Get a specific comment from a Jira issue',
            schema: GetCommentSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `issue/${params.issueKey}/comment/${params.commentId}`
            const response = await this.makeJiraRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting comment: ${error}`, params)
        }
    }
}

class UpdateCommentTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_comment',
            description: 'Update a comment on a Jira issue',
            schema: UpdateCommentSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const commentData = {
                body: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: params.text
                                }
                            ]
                        }
                    ]
                }
            }

            const endpoint = `issue/${params.issueKey}/comment/${params.commentId}`
            const response = await this.makeJiraRequest({ endpoint, method: 'PUT', body: commentData, params })
            return response || 'Comment updated successfully'
        } catch (error) {
            return formatToolError(`Error updating comment: ${error}`, params)
        }
    }
}

class DeleteCommentTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_comment',
            description: 'Delete a comment from a Jira issue',
            schema: DeleteCommentSchema,
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `issue/${params.issueKey}/comment/${params.commentId}`
            const response = await this.makeJiraRequest({ endpoint, method: 'DELETE', params })
            return response || 'Comment deleted successfully'
        } catch (error) {
            return formatToolError(`Error deleting comment: ${error}`, params)
        }
    }
}

// User Tools
class SearchUsersTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'search_users',
            description: 'Search for users in Jira',
            schema: SearchUsersSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.query) queryParams.append('query', params.query)
        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.startAt) queryParams.append('startAt', params.startAt.toString())

        const endpoint = `user/search?${queryParams.toString()}`

        try {
            const response = await this.makeJiraRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error searching users: ${error}`, params)
        }
    }
}

class GetUserTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_user',
            description: 'Get a specific user from Jira',
            schema: GetUserSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        queryParams.append('accountId', params.accountId)

        const endpoint = `user?${queryParams.toString()}`

        try {
            const response = await this.makeJiraRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting user: ${error}`, params)
        }
    }
}

class CreateUserTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_user',
            description: 'Create a new user in Jira',
            schema: CreateUserSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const userData: any = {
                emailAddress: params.emailAddress,
                displayName: params.displayName
            }

            if (params.username) {
                userData.username = params.username
            }

            const endpoint = 'user'
            const response = await this.makeJiraRequest({ endpoint, method: 'POST', body: userData, params })
            return response
        } catch (error) {
            return formatToolError(`Error creating user: ${error}`, params)
        }
    }
}

class UpdateUserTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_user',
            description: 'Update an existing user in Jira',
            schema: UpdateUserSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const userData: any = {}

            if (params.emailAddress) userData.emailAddress = params.emailAddress
            if (params.displayName) userData.displayName = params.displayName

            const queryParams = new URLSearchParams()
            queryParams.append('accountId', params.accountId)

            const endpoint = `user?${queryParams.toString()}`
            const response = await this.makeJiraRequest({ endpoint, method: 'PUT', body: userData, params })
            return response || 'User updated successfully'
        } catch (error) {
            return formatToolError(`Error updating user: ${error}`, params)
        }
    }
}

class DeleteUserTool extends BaseJiraTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_user',
            description: 'Delete a user from Jira',
            schema: DeleteUserSchema,
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            username: args.username,
            accessToken: args.accessToken,
            jiraHost: args.jiraHost,
            maxOutputLength: args.maxOutputLength
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            queryParams.append('accountId', params.accountId)

            const endpoint = `user?${queryParams.toString()}`
            const response = await this.makeJiraRequest({ endpoint, method: 'DELETE', params })
            return response || 'User deleted successfully'
        } catch (error) {
            return formatToolError(`Error deleting user: ${error}`, params)
        }
    }
}

export const createJiraTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const tools: DynamicStructuredTool[] = []
    const actions = args?.actions || []
    const username = args?.username || ''
    const accessToken = args?.accessToken || ''
    const jiraHost = args?.jiraHost || ''
    const maxOutputLength = args?.maxOutputLength || Infinity
    const defaultParams = args?.defaultParams || {}

    // Issue tools
    if (actions.includes('listIssues')) {
        tools.push(
            new ListIssuesTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('createIssue')) {
        tools.push(
            new CreateIssueTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('getIssue')) {
        tools.push(
            new GetIssueTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('updateIssue')) {
        tools.push(
            new UpdateIssueTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('deleteIssue')) {
        tools.push(
            new DeleteIssueTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('assignIssue')) {
        tools.push(
            new AssignIssueTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('transitionIssue')) {
        tools.push(
            new TransitionIssueTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    // Comment tools
    if (actions.includes('listComments')) {
        tools.push(
            new ListCommentsTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('createComment')) {
        tools.push(
            new CreateCommentTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('getComment')) {
        tools.push(
            new GetCommentTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('updateComment')) {
        tools.push(
            new UpdateCommentTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('deleteComment')) {
        tools.push(
            new DeleteCommentTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    // User tools
    if (actions.includes('searchUsers')) {
        tools.push(
            new SearchUsersTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('getUser')) {
        tools.push(
            new GetUserTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('createUser')) {
        tools.push(
            new CreateUserTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('updateUser')) {
        tools.push(
            new UpdateUserTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    if (actions.includes('deleteUser')) {
        tools.push(
            new DeleteUserTool({
                username,
                accessToken,
                jiraHost,
                maxOutputLength,
                defaultParams
            })
        )
    }

    return tools
}
