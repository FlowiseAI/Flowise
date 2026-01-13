/**
 * Unit & Integration Tests for JIRA Tool (Bearer Token + SSL Support)
 *
 * Test Coverage:
 * - Unit Tests: Authentication header generation, SSL configuration
 * - Integration Tests: Mock JIRA server with Bearer Token and SSL
 * - Regression Tests: Basic Auth backward compatibility
 */

import * as fs from 'fs'
import * as https from 'https'

// Mock node-fetch
jest.mock('node-fetch', () => {
    const mockFetch = jest.fn()
    return {
        __esModule: true,
        default: mockFetch,
        __mockFetch: mockFetch
    }
})

// Mock fs module for SSL certificate tests
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn()
}))

// Mock https module
jest.mock('https', () => ({
    Agent: jest.fn().mockImplementation((options) => ({
        options,
        _isHttpsAgent: true
    }))
}))

// Mock utility functions
jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Tool', 'StructuredTool', 'DynamicStructuredTool'])
}))

jest.mock('../../../src/agents', () => ({
    TOOL_ARGS_PREFIX: '\n---TOOL_ARGS---',
    formatToolError: jest.fn((error) => `Error: ${error}`)
}))

describe('JIRA Tool Authentication & SSL Tests', () => {
    let mockFetch: jest.Mock
    let mockReadFileSync: jest.Mock
    let mockHttpsAgent: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()

        // Get mock functions
        const fetchModule = require('node-fetch')
        mockFetch = fetchModule.__mockFetch

        mockReadFileSync = fs.readFileSync as jest.Mock
        mockHttpsAgent = https.Agent as jest.Mock

        // Default successful response
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            text: () => Promise.resolve(JSON.stringify({ id: 'PROJ-123', key: 'PROJ-123' }))
        })
    })

    /**
     * ===========================================
     * UNIT TESTS: Authentication Header Generation
     * ===========================================
     */
    describe('Unit Tests: Authentication Headers', () => {
        describe('Bearer Token Authentication', () => {
            it('should set Authorization: Bearer <token> when bearerToken is provided', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'my-secret-bearer-token',
                    username: '',
                    accessToken: ''
                })

                // Find the getIssue tool and invoke it
                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                expect(getIssueTool).toBeDefined()

                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                // Verify fetch was called with Bearer token
                expect(mockFetch).toHaveBeenCalledTimes(1)
                const [url, options] = mockFetch.mock.calls[0]

                expect(url).toBe('https://jira.example.com/rest/api/3/issue/PROJ-123')
                expect(options.headers).toBeDefined()
                expect(options.headers.Authorization).toBe('Bearer my-secret-bearer-token')
            })

            it('should use Bearer token even when email/apiToken are also provided', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'my-bearer-token',
                    username: 'user@example.com',
                    accessToken: 'api-token-should-be-ignored'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const [, options] = mockFetch.mock.calls[0]
                expect(options.headers.Authorization).toBe('Bearer my-bearer-token')
                expect(options.headers.Authorization).not.toContain('Basic')
            })

            it('should handle empty bearer token gracefully', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: '',
                    username: '',
                    accessToken: ''
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const [, options] = mockFetch.mock.calls[0]
                // Empty bearer token should still create Bearer header (server will reject)
                expect(options.headers.Authorization).toBe('Bearer ')
            })
        })

        describe('Basic Authentication', () => {
            it('should set Authorization: Basic <encoded> when email + apiToken are provided', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'basicAuth',
                    username: 'user@example.com',
                    accessToken: 'my-api-token',
                    bearerToken: ''
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const [, options] = mockFetch.mock.calls[0]

                // Calculate expected Basic auth header
                const expectedAuth = Buffer.from('user@example.com:my-api-token').toString('base64')
                expect(options.headers.Authorization).toBe(`Basic ${expectedAuth}`)
            })

            it('should use Basic auth when authType is not specified (default)', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    username: 'user@example.com',
                    accessToken: 'my-api-token'
                    // authType not specified - should default to basicAuth
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const [, options] = mockFetch.mock.calls[0]
                expect(options.headers.Authorization).toContain('Basic ')
            })

            it('should handle special characters in username and password', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'basicAuth',
                    username: 'user+special@example.com',
                    accessToken: 'token:with:colons!@#$'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const [, options] = mockFetch.mock.calls[0]
                const expectedAuth = Buffer.from('user+special@example.com:token:with:colons!@#$').toString('base64')
                expect(options.headers.Authorization).toBe(`Basic ${expectedAuth}`)
            })
        })

        describe('Required Headers', () => {
            it('should always include Content-Type and Accept headers', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token'
                })

                const createIssueTool = tools.find((t) => t.name === 'jira_create_issue')
                await createIssueTool!.invoke({
                    projectKey: 'PROJ',
                    issueType: 'Bug',
                    summary: 'Test issue'
                })

                const [, options] = mockFetch.mock.calls[0]
                expect(options.headers['Content-Type']).toBe('application/json')
                expect(options.headers.Accept).toBe('application/json')
            })
        })
    })

    /**
     * ===========================================
     * UNIT TESTS: SSL Certificate Configuration
     * ===========================================
     */
    describe('Unit Tests: SSL Certificate Configuration', () => {
        describe('Client Certificate and Key', () => {
            it('should configure HTTPS agent with certificate and key when both are provided', async () => {
                mockReadFileSync
                    .mockReturnValueOnce('-----BEGIN CERTIFICATE-----\nCERTIFICATE_DATA\n-----END CERTIFICATE-----')
                    .mockReturnValueOnce('-----BEGIN PRIVATE KEY-----\nKEY_DATA\n-----END PRIVATE KEY-----')

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    sslCertPath: '/path/to/cert.pem',
                    sslKeyPath: '/path/to/key.pem',
                    verifySslCerts: true
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                // Verify fs.readFileSync was called for both cert and key
                expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/cert.pem', 'utf-8')
                expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/key.pem', 'utf-8')

                // Verify HTTPS Agent was created with correct options
                expect(mockHttpsAgent).toHaveBeenCalled()
                const agentOptions = mockHttpsAgent.mock.calls[0][0]
                expect(agentOptions.cert).toContain('CERTIFICATE_DATA')
                expect(agentOptions.key).toContain('KEY_DATA')
                expect(agentOptions.rejectUnauthorized).toBe(true)
            })
        })

        describe('CA Certificate Only', () => {
            it('should configure HTTPS agent with CA certificate when only sslCertPath is provided', async () => {
                mockReadFileSync.mockReturnValueOnce('-----BEGIN CERTIFICATE-----\nCA_CERT_DATA\n-----END CERTIFICATE-----')

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    sslCertPath: '/path/to/ca-cert.pem',
                    // sslKeyPath not provided - indicates CA cert only
                    verifySslCerts: true
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/ca-cert.pem', 'utf-8')

                const agentOptions = mockHttpsAgent.mock.calls[0][0]
                expect(agentOptions.ca).toContain('CA_CERT_DATA')
                expect(agentOptions.cert).toBeUndefined()
                expect(agentOptions.key).toBeUndefined()
            })
        })

        describe('SSL Verification Settings', () => {
            it('should disable SSL verification when verifySslCerts is false', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    verifySslCerts: false
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const agentOptions = mockHttpsAgent.mock.calls[0][0]
                expect(agentOptions.rejectUnauthorized).toBe(false)
            })

            it('should enable SSL verification by default', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token'
                    // verifySslCerts not specified
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                const agentOptions = mockHttpsAgent.mock.calls[0][0]
                expect(agentOptions.rejectUnauthorized).toBe(true)
            })
        })

        describe('SSL Error Handling', () => {
            it('should return descriptive error when certificate file cannot be read', async () => {
                mockReadFileSync.mockImplementation(() => {
                    throw new Error('ENOENT: no such file or directory')
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    sslCertPath: '/nonexistent/cert.pem',
                    sslKeyPath: '/nonexistent/key.pem'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                    .resolves.toContain('Failed to load SSL certificate')
            })
        })

        describe('HTTP vs HTTPS', () => {
            it('should not create HTTPS agent for HTTP connections', async () => {
                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'http://jira.example.com', // HTTP, not HTTPS
                    authType: 'basicAuth',
                    username: 'user@example.com',
                    accessToken: 'token'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                // HTTPS Agent should NOT be created for HTTP connections
                expect(mockHttpsAgent).not.toHaveBeenCalled()
            })
        })
    })

    /**
     * ===========================================
     * INTEGRATION TESTS: Mock JIRA Server
     * ===========================================
     */
    describe('Integration Tests: Mock JIRA Server', () => {
        describe('Bearer Token Authentication Flow', () => {
            it('should successfully authenticate with Bearer token', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: () =>
                        Promise.resolve(
                            JSON.stringify({
                                id: '10001',
                                key: 'PROJ-123',
                                fields: {
                                    summary: 'Test Issue',
                                    status: { name: 'Open' }
                                }
                            })
                        )
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'valid-bearer-token'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                const result = await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                expect(result).toContain('PROJ-123')
                expect(result).toContain('Test Issue')
            })

            it('should fail with 401 when Bearer token is invalid', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    text: () => Promise.resolve('{"errorMessages":["Client must be authenticated to access this resource."]}')
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'invalid-token'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                    .resolves.toContain('Jira API Error 401')
            })

            it('should fail with 403 when Bearer token lacks permissions', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    status: 403,
                    statusText: 'Forbidden',
                    text: () => Promise.resolve('{"errorMessages":["You do not have permission to view this issue."]}')
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'limited-token'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                    .resolves.toContain('Jira API Error 403')
            })
        })

        describe('SSL Certificate Validation Flow', () => {
            it('should succeed when correct SSL certificates are provided', async () => {
                mockReadFileSync
                    .mockReturnValueOnce('-----BEGIN CERTIFICATE-----\nVALID_CERT\n-----END CERTIFICATE-----')
                    .mockReturnValueOnce('-----BEGIN PRIVATE KEY-----\nVALID_KEY\n-----END PRIVATE KEY-----')

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: () => Promise.resolve(JSON.stringify({ id: '10001', key: 'PROJ-123' }))
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://secure-jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    sslCertPath: '/path/to/valid-cert.pem',
                    sslKeyPath: '/path/to/valid-key.pem'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                const result = await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                expect(result).toContain('PROJ-123')
                expect(mockHttpsAgent).toHaveBeenCalled()
            })

            it('should handle SSL certificate expiration errors', async () => {
                mockReadFileSync
                    .mockReturnValueOnce('-----BEGIN CERTIFICATE-----\nEXPIRED_CERT\n-----END CERTIFICATE-----')
                    .mockReturnValueOnce('-----BEGIN PRIVATE KEY-----\nVALID_KEY\n-----END PRIVATE KEY-----')

                mockFetch.mockRejectedValueOnce(new Error('CERT_HAS_EXPIRED'))

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://secure-jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    sslCertPath: '/path/to/expired-cert.pem',
                    sslKeyPath: '/path/to/key.pem'
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                    .resolves.toContain('CERT_HAS_EXPIRED')
            })

            it('should handle self-signed certificate with verifySslCerts disabled', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    text: () => Promise.resolve(JSON.stringify({ id: '10001', key: 'PROJ-123' }))
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://self-signed-jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'token',
                    verifySslCerts: false
                })

                const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
                const result = await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

                expect(result).toContain('PROJ-123')

                const agentOptions = mockHttpsAgent.mock.calls[0][0]
                expect(agentOptions.rejectUnauthorized).toBe(false)
            })
        })

        describe('Full CRUD Operations', () => {
            it('should create issue with Bearer token', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 201,
                    statusText: 'Created',
                    text: () =>
                        Promise.resolve(
                            JSON.stringify({
                                id: '10002',
                                key: 'PROJ-124',
                                self: 'https://jira.example.com/rest/api/3/issue/10002'
                            })
                        )
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'create-token'
                })

                const createIssueTool = tools.find((t) => t.name === 'jira_create_issue')
                const result = await createIssueTool!.invoke({
                    projectKey: 'PROJ',
                    issueType: 'Bug',
                    summary: 'New Bug Report',
                    description: 'This is a bug description'
                })

                expect(result).toContain('PROJ-124')

                // Verify the request body
                const [, options] = mockFetch.mock.calls[0]
                expect(options.method).toBe('POST')
                const body = JSON.parse(options.body)
                expect(body.fields.summary).toBe('New Bug Report')
            })

            it('should update issue with Bearer token', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 204,
                    statusText: 'No Content',
                    text: () => Promise.resolve('')
                })

                const { createJiraTools } = await import('./core')

                const tools = createJiraTools({
                    jiraHost: 'https://jira.example.com',
                    authType: 'bearerToken',
                    bearerToken: 'update-token'
                })

                const updateIssueTool = tools.find((t) => t.name === 'jira_update_issue')
                await updateIssueTool!.invoke({
                    issueKey: 'PROJ-123',
                    summary: 'Updated Summary'
                })

                const [url, options] = mockFetch.mock.calls[0]
                expect(url).toBe('https://jira.example.com/rest/api/3/issue/PROJ-123')
                expect(options.method).toBe('PUT')
            })
        })
    })

    /**
     * ===========================================
     * REGRESSION TESTS: Basic Auth Backward Compatibility
     * ===========================================
     */
    describe('Regression Tests: Basic Auth Backward Compatibility', () => {
        it('should continue to work with Basic Auth exactly as before', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                text: () =>
                    Promise.resolve(
                        JSON.stringify({
                            issues: [
                                { key: 'PROJ-1', fields: { summary: 'Issue 1' } },
                                { key: 'PROJ-2', fields: { summary: 'Issue 2' } }
                            ],
                            total: 2
                        })
                    )
            })

            const { createJiraTools } = await import('./core')

            // Original Basic Auth configuration
            const tools = createJiraTools({
                jiraHost: 'https://company.atlassian.net',
                authType: 'basicAuth',
                username: 'admin@company.com',
                accessToken: 'atlassian-api-token-123'
            })

            const listIssuesTool = tools.find((t) => t.name === 'jira_list_issues')
            const result = await listIssuesTool!.invoke({ projectKey: 'PROJ' })

            expect(result).toContain('PROJ-1')
            expect(result).toContain('PROJ-2')

            // Verify Basic auth header format
            const [, options] = mockFetch.mock.calls[0]
            expect(options.headers.Authorization).toMatch(/^Basic [A-Za-z0-9+/=]+$/)

            // Decode and verify credentials
            const authHeader = options.headers.Authorization
            const base64 = authHeader.replace('Basic ', '')
            const decoded = Buffer.from(base64, 'base64').toString('utf-8')
            expect(decoded).toBe('admin@company.com:atlassian-api-token-123')
        })

        it('should handle all existing issue operations with Basic Auth', async () => {
            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://company.atlassian.net',
                authType: 'basicAuth',
                username: 'user@company.com',
                accessToken: 'api-token'
            })

            // Verify all expected tools are created
            const expectedTools = [
                'jira_list_issues',
                'jira_create_issue',
                'jira_get_issue',
                'jira_update_issue',
                'jira_assign_issue',
                'jira_transition_issue',
                'jira_list_comments',
                'jira_create_comment',
                'jira_get_comment',
                'jira_update_comment',
                'jira_delete_comment',
                'jira_search_users',
                'jira_get_user',
                'jira_create_user'
            ]

            for (const toolName of expectedTools) {
                const tool = tools.find((t) => t.name === toolName)
                expect(tool).toBeDefined()
            }
        })

        it('should fetch single issue with Basic Auth (regression)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                text: () =>
                    Promise.resolve(
                        JSON.stringify({
                            id: '10001',
                            key: 'PROJ-123',
                            fields: {
                                summary: 'Original Issue',
                                description: 'Original description',
                                status: { name: 'To Do' },
                                priority: { name: 'Medium' }
                            }
                        })
                    )
            })

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://company.atlassian.net',
                authType: 'basicAuth',
                username: 'user@company.com',
                accessToken: 'api-token'
            })

            const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
            const result = await getIssueTool!.invoke({ issueKey: 'PROJ-123' })

            expect(result).toContain('PROJ-123')
            expect(result).toContain('Original Issue')

            // Verify correct endpoint was called
            const [url] = mockFetch.mock.calls[0]
            expect(url).toBe('https://company.atlassian.net/rest/api/3/issue/PROJ-123')
        })

        it('should add comment with Basic Auth (regression)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                statusText: 'Created',
                text: () =>
                    Promise.resolve(
                        JSON.stringify({
                            id: '10001',
                            body: {
                                type: 'doc',
                                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test comment' }] }]
                            }
                        })
                    )
            })

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://company.atlassian.net',
                authType: 'basicAuth',
                username: 'user@company.com',
                accessToken: 'api-token'
            })

            const createCommentTool = tools.find((t) => t.name === 'jira_create_comment')
            await createCommentTool!.invoke({
                issueKey: 'PROJ-123',
                text: 'Test comment'
            })

            const [url, options] = mockFetch.mock.calls[0]
            expect(url).toBe('https://company.atlassian.net/rest/api/3/issue/PROJ-123/comment')
            expect(options.method).toBe('POST')
        })

        it('should search users with Basic Auth (regression)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                text: () =>
                    Promise.resolve(
                        JSON.stringify([
                            { accountId: '123', displayName: 'John Doe', emailAddress: 'john@company.com' },
                            { accountId: '456', displayName: 'Jane Doe', emailAddress: 'jane@company.com' }
                        ])
                    )
            })

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://company.atlassian.net',
                authType: 'basicAuth',
                username: 'admin@company.com',
                accessToken: 'api-token'
            })

            const searchUsersTool = tools.find((t) => t.name === 'jira_search_users')
            const result = await searchUsersTool!.invoke({ query: 'doe' })

            expect(result).toContain('John Doe')
            expect(result).toContain('Jane Doe')
        })
    })

    /**
     * ===========================================
     * ERROR HANDLING TESTS
     * ===========================================
     */
    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://jira.example.com',
                authType: 'bearerToken',
                bearerToken: 'token'
            })

            const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
            await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                .resolves.toContain('Failed to connect to Jira')
        })

        it('should handle timeout errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'))

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://jira.example.com',
                authType: 'bearerToken',
                bearerToken: 'token'
            })

            const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
            await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                .resolves.toContain('ETIMEDOUT')
        })

        it('should handle DNS resolution errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('ENOTFOUND'))

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://nonexistent-jira.example.com',
                authType: 'bearerToken',
                bearerToken: 'token'
            })

            const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
            await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                .resolves.toContain('ENOTFOUND')
        })

        it('should handle rate limiting (429) errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                text: () => Promise.resolve('{"errorMessages":["Rate limit exceeded. Please retry later."]}')
            })

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://jira.example.com',
                authType: 'bearerToken',
                bearerToken: 'token'
            })

            const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
            await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                .resolves.toContain('Jira API Error 429')
        })

        it('should handle server errors (500)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('Internal server error occurred')
            })

            const { createJiraTools } = await import('./core')

            const tools = createJiraTools({
                jiraHost: 'https://jira.example.com',
                authType: 'bearerToken',
                bearerToken: 'token'
            })

            const getIssueTool = tools.find((t) => t.name === 'jira_get_issue')
            await expect(getIssueTool!.invoke({ issueKey: 'PROJ-123' }))
                .resolves.toContain('Jira API Error 500')
        })
    })
})
