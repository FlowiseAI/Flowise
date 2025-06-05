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

        // Prepare default parameters for each action
        const defaultParams: ICommonObject = {}

        // Issue parameters
        const projectKey = nodeData.inputs?.projectKey
        const issueType = nodeData.inputs?.issueType
        const issueSummary = nodeData.inputs?.issueSummary
        const issueDescription = nodeData.inputs?.issueDescription
        const issuePriority = nodeData.inputs?.issuePriority
        const issueKey = nodeData.inputs?.issueKey
        const assigneeAccountId = nodeData.inputs?.assigneeAccountId
        const transitionId = nodeData.inputs?.transitionId
        const jqlQuery = nodeData.inputs?.jqlQuery
        const issueMaxResults = nodeData.inputs?.issueMaxResults

        // Comment parameters
        const commentIssueKey = nodeData.inputs?.commentIssueKey
        const commentText = nodeData.inputs?.commentText
        const commentId = nodeData.inputs?.commentId

        // User parameters
        const userQuery = nodeData.inputs?.userQuery
        const userAccountId = nodeData.inputs?.userAccountId
        const userEmail = nodeData.inputs?.userEmail
        const userDisplayName = nodeData.inputs?.userDisplayName
        const userMaxResults = nodeData.inputs?.userMaxResults

        // Set default parameters based on actions
        actions.forEach((action) => {
            const params: ICommonObject = {}

            // Issue action parameters
            if (action === 'listIssues') {
                if (projectKey) params.projectKey = projectKey
                if (jqlQuery) params.jql = jqlQuery
                if (issueMaxResults) params.maxResults = issueMaxResults
            }
            if (action === 'createIssue') {
                if (projectKey) params.projectKey = projectKey
                if (issueType) params.issueType = issueType
                if (issueSummary) params.summary = issueSummary
                if (issueDescription) params.description = issueDescription
                if (issuePriority) params.priority = issuePriority
                if (assigneeAccountId) params.assigneeAccountId = assigneeAccountId
            }
            if (['getIssue', 'updateIssue', 'deleteIssue', 'assignIssue', 'transitionIssue'].includes(action)) {
                if (issueKey) params.issueKey = issueKey
            }
            if (action === 'updateIssue') {
                if (issueSummary) params.summary = issueSummary
                if (issueDescription) params.description = issueDescription
                if (issuePriority) params.priority = issuePriority
                if (assigneeAccountId) params.assigneeAccountId = assigneeAccountId
            }
            if (action === 'assignIssue') {
                if (assigneeAccountId) params.assigneeAccountId = assigneeAccountId
            }
            if (action === 'transitionIssue') {
                if (transitionId) params.transitionId = transitionId
            }

            // Comment action parameters
            if (['listComments', 'createComment'].includes(action) && commentIssueKey) {
                params.issueKey = commentIssueKey
            }
            if (['createComment', 'updateComment'].includes(action) && commentText) {
                params.text = commentText
            }
            if (['getComment', 'updateComment', 'deleteComment'].includes(action) && commentId) {
                params.commentId = commentId
            }

            // User action parameters
            if (action === 'searchUsers') {
                if (userQuery) params.query = userQuery
                if (userMaxResults) params.maxResults = userMaxResults
            }
            if (['getUser', 'updateUser', 'deleteUser'].includes(action) && userAccountId) {
                params.accountId = userAccountId
            }
            if (['createUser', 'updateUser'].includes(action)) {
                if (userEmail) params.emailAddress = userEmail
                if (userDisplayName) params.displayName = userDisplayName
            }

            defaultParams[action] = params
        })

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
}

module.exports = { nodeClass: Jira_Tools }
