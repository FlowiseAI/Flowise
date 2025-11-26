import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam } from '../../../src/utils'
import { createJiraTools } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class Jira_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Jira'
        this.name = 'jiraTool'
        this.version = 1.0
        this.type = 'Jira'
        this.icon = 'jira.svg'
        this.category = 'Tools'
        this.description = 'Perform Jira operations for issues, comments, and users'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['jiraApi']
        }
        this.inputs = [
            {
                label: 'Host',
                name: 'jiraHost',
                type: 'string',
                placeholder: 'https://example.atlassian.net'
            },
            {
                label: 'Type',
                name: 'jiraType',
                type: 'options',
                options: [
                    {
                        label: 'Issues',
                        name: 'issues'
                    },
                    {
                        label: 'Issue Comments',
                        name: 'comments'
                    },
                    {
                        label: 'Users',
                        name: 'users'
                    }
                ]
            },
            // Issue Actions
            {
                label: 'Issue Actions',
                name: 'issueActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Issues',
                        name: 'listIssues'
                    },
                    {
                        label: 'Create Issue',
                        name: 'createIssue'
                    },
                    {
                        label: 'Get Issue',
                        name: 'getIssue'
                    },
                    {
                        label: 'Update Issue',
                        name: 'updateIssue'
                    },
                    {
                        label: 'Delete Issue',
                        name: 'deleteIssue'
                    },
                    {
                        label: 'Assign Issue',
                        name: 'assignIssue'
                    },
                    {
                        label: 'Transition Issue',
                        name: 'transitionIssue'
                    }
                ],
                show: {
                    jiraType: ['issues']
                }
            },
            // Comment Actions
            {
                label: 'Comment Actions',
                name: 'commentActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Comments',
                        name: 'listComments'
                    },
                    {
                        label: 'Create Comment',
                        name: 'createComment'
                    },
                    {
                        label: 'Get Comment',
                        name: 'getComment'
                    },
                    {
                        label: 'Update Comment',
                        name: 'updateComment'
                    },
                    {
                        label: 'Delete Comment',
                        name: 'deleteComment'
                    }
                ],
                show: {
                    jiraType: ['comments']
                }
            },
            // User Actions
            {
                label: 'User Actions',
                name: 'userActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'Search Users',
                        name: 'searchUsers'
                    },
                    {
                        label: 'Get User',
                        name: 'getUser'
                    },
                    {
                        label: 'Create User',
                        name: 'createUser'
                    },
                    {
                        label: 'Update User',
                        name: 'updateUser'
                    },
                    {
                        label: 'Delete User',
                        name: 'deleteUser'
                    }
                ],
                show: {
                    jiraType: ['users']
                }
            },
            // ISSUE PARAMETERS
            {
                label: 'Project Key',
                name: 'projectKey',
                type: 'string',
                placeholder: 'PROJ',
                description: 'Project key for the issue',
                show: {
                    issueActions: ['listIssues', 'createIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Issue Type',
                name: 'issueType',
                type: 'string',
                placeholder: 'Bug, Task, Story',
                description: 'Type of issue to create',
                show: {
                    issueActions: ['createIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Summary',
                name: 'issueSummary',
                type: 'string',
                description: 'Issue summary/title',
                show: {
                    issueActions: ['createIssue', 'updateIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description',
                name: 'issueDescription',
                type: 'string',
                description: 'Issue description',
                show: {
                    issueActions: ['createIssue', 'updateIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Priority',
                name: 'issuePriority',
                type: 'string',
                placeholder: 'Highest, High, Medium, Low, Lowest',
                description: 'Issue priority',
                show: {
                    issueActions: ['createIssue', 'updateIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Issue Key',
                name: 'issueKey',
                type: 'string',
                placeholder: 'PROJ-123',
                description: 'Issue key (e.g., PROJ-123)',
                show: {
                    issueActions: ['getIssue', 'updateIssue', 'deleteIssue', 'assignIssue', 'transitionIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Assignee Account ID',
                name: 'assigneeAccountId',
                type: 'string',
                description: 'Account ID of the user to assign',
                show: {
                    issueActions: ['assignIssue', 'createIssue', 'updateIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Transition ID',
                name: 'transitionId',
                type: 'string',
                description: 'ID of the transition to execute',
                show: {
                    issueActions: ['transitionIssue']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'JQL Query',
                name: 'jqlQuery',
                type: 'string',
                placeholder: 'project = PROJ AND status = "To Do"',
                description: 'JQL query for filtering issues',
                show: {
                    issueActions: ['listIssues']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results',
                name: 'issueMaxResults',
                type: 'number',
                default: 50,
                description: 'Maximum number of issues to return',
                show: {
                    issueActions: ['listIssues']
                },
                additionalParams: true,
                optional: true
            },
            // COMMENT PARAMETERS
            {
                label: 'Issue Key (for Comments)',
                name: 'commentIssueKey',
                type: 'string',
                placeholder: 'PROJ-123',
                description: 'Issue key for comment operations',
                show: {
                    commentActions: ['listComments', 'createComment']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Comment Text',
                name: 'commentText',
                type: 'string',
                description: 'Comment content',
                show: {
                    commentActions: ['createComment', 'updateComment']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Comment ID',
                name: 'commentId',
                type: 'string',
                description: 'ID of the comment',
                show: {
                    commentActions: ['getComment', 'updateComment', 'deleteComment']
                },
                additionalParams: true,
                optional: true
            },
            // USER PARAMETERS
            {
                label: 'Search Query',
                name: 'userQuery',
                type: 'string',
                placeholder: 'john.doe',
                description: 'Query string for user search',
                show: {
                    userActions: ['searchUsers']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Account ID',
                name: 'userAccountId',
                type: 'string',
                description: 'User account ID',
                show: {
                    userActions: ['getUser', 'updateUser', 'deleteUser']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Email Address',
                name: 'userEmail',
                type: 'string',
                placeholder: 'user@example.com',
                description: 'User email address',
                show: {
                    userActions: ['createUser', 'updateUser']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Display Name',
                name: 'userDisplayName',
                type: 'string',
                description: 'User display name',
                show: {
                    userActions: ['createUser', 'updateUser']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'User Max Results',
                name: 'userMaxResults',
                type: 'number',
                default: 50,
                description: 'Maximum number of users to return',
                show: {
                    userActions: ['searchUsers']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const username = getCredentialParam('username', credentialData, nodeData)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)
        const jiraHost = nodeData.inputs?.jiraHost as string

        if (!username) {
            throw new Error('No username found in credential')
        }

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        if (!jiraHost) {
            throw new Error('No Jira host provided')
        }

        // Get all actions based on type
        const jiraType = nodeData.inputs?.jiraType as string
        let actions: string[] = []

        if (jiraType === 'issues') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.issueActions)
        } else if (jiraType === 'comments') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.commentActions)
        } else if (jiraType === 'users') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.userActions)
        }

        const defaultParams = this.transformNodeInputsToToolArgs(nodeData)

        // Create and return tools based on selected actions
        const tools = createJiraTools({
            actions,
            username,
            accessToken,
            jiraHost,
            defaultParams
        })

        return tools
    }

    transformNodeInputsToToolArgs(nodeData: INodeData): Record<string, any> {
        // Collect default parameters from inputs
        const defaultParams: Record<string, any> = {}

        // Issue parameters
        if (nodeData.inputs?.projectKey) defaultParams.projectKey = nodeData.inputs.projectKey
        if (nodeData.inputs?.issueType) defaultParams.issueType = nodeData.inputs.issueType
        if (nodeData.inputs?.issueSummary) defaultParams.issueSummary = nodeData.inputs.issueSummary
        if (nodeData.inputs?.issueDescription) defaultParams.issueDescription = nodeData.inputs.issueDescription
        if (nodeData.inputs?.issuePriority) defaultParams.issuePriority = nodeData.inputs.issuePriority
        if (nodeData.inputs?.issueKey) defaultParams.issueKey = nodeData.inputs.issueKey
        if (nodeData.inputs?.assigneeAccountId) defaultParams.assigneeAccountId = nodeData.inputs.assigneeAccountId
        if (nodeData.inputs?.transitionId) defaultParams.transitionId = nodeData.inputs.transitionId
        if (nodeData.inputs?.jqlQuery) defaultParams.jqlQuery = nodeData.inputs.jqlQuery
        if (nodeData.inputs?.issueMaxResults) defaultParams.issueMaxResults = nodeData.inputs.issueMaxResults

        // Comment parameters
        if (nodeData.inputs?.commentIssueKey) defaultParams.commentIssueKey = nodeData.inputs.commentIssueKey
        if (nodeData.inputs?.commentText) defaultParams.commentText = nodeData.inputs.commentText
        if (nodeData.inputs?.commentId) defaultParams.commentId = nodeData.inputs.commentId

        // User parameters
        if (nodeData.inputs?.userQuery) defaultParams.userQuery = nodeData.inputs.userQuery
        if (nodeData.inputs?.userAccountId) defaultParams.userAccountId = nodeData.inputs.userAccountId
        if (nodeData.inputs?.userEmail) defaultParams.userEmail = nodeData.inputs.userEmail
        if (nodeData.inputs?.userDisplayName) defaultParams.userDisplayName = nodeData.inputs.userDisplayName
        if (nodeData.inputs?.userMaxResults) defaultParams.userMaxResults = nodeData.inputs.userMaxResults

        return defaultParams
    }
}

module.exports = { nodeClass: Jira_Tools }
