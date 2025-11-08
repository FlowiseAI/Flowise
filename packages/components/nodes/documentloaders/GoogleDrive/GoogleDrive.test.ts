import { GoogleDrive_DocumentLoaders } from './GoogleDrive'
import { getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src'
import { INodeData, ICommonObject } from '../../../src/Interface'

jest.mock('../../../src', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    refreshOAuth2Token: jest.fn(),
    convertMultiOptionsToStringArray: jest.fn((val) => (Array.isArray(val) ? val : val ? [val] : [])),
    handleEscapeCharacters: jest.fn((val) => val)
}))

jest.mock('googleapis', () => ({
    google: {
        auth: {
            GoogleAuth: jest.fn().mockImplementation(() => ({
                getClient: jest.fn()
            }))
        },
        drive: jest.fn(() => ({
            files: {
                list: jest.fn(),
                get: jest.fn(),
                export: jest.fn()
            }
        }))
    }
}))

function createNodeData(id: string, inputs: any, credential?: string): INodeData {
    return {
        id,
        name: 'googleDrive',
        type: 'Document',
        label: 'Google Drive',
        inputs,
        credential: credential || '',
        outputs: {
            output: 'document'
        }
    }
}

describe('GoogleDrive', () => {
    let nodeClass: GoogleDrive_DocumentLoaders

    beforeEach(() => {
        nodeClass = new GoogleDrive_DocumentLoaders()
        jest.clearAllMocks()

        // Default credential mocks
        ;(getCredentialData as jest.Mock).mockResolvedValue({})
        ;(getCredentialParam as jest.Mock).mockReturnValue(undefined)
        ;(refreshOAuth2Token as jest.Mock).mockImplementation((_, data) => Promise.resolve(data))
    })

    describe('Configuration', () => {
        it('should support both OAuth2 and service account credentials', () => {
            expect(nodeClass.credential.credentialNames).toContain('googleDriveOAuth2')
            expect(nodeClass.credential.credentialNames).toContain('googleVertexAuth')
        })

        it('should have sharedDriveId input field', () => {
            const sharedDriveIdInput = nodeClass.inputs.find((input) => input.name === 'sharedDriveId')
            expect(sharedDriveIdInput).toBeDefined()
            expect(sharedDriveIdInput?.label).toBe('Shared Drive ID')
        })
    })

    describe('Authentication Detection', () => {
        it('should detect OAuth2 when access_token is present', async () => {
            ;(getCredentialData as jest.Mock).mockResolvedValue({
                access_token: 'test-token'
            })

            const nodeData = createNodeData('test-1', {
                folderId: 'test-folder'
            })

            // Access private method for testing
            const authMethod = await (nodeClass as any).getAuthMethod({
                access_token: 'test-token'
            })

            expect(authMethod).toBe('oauth2')
        })

        it('should detect service account when googleApplicationCredential is present', async () => {
            const authMethod = await (nodeClass as any).getAuthMethod({
                googleApplicationCredential: '{"type":"service_account"}'
            })

            expect(authMethod).toBe('serviceAccount')
        })

        it('should detect service account when googleApplicationCredentialFilePath is present', async () => {
            const authMethod = await (nodeClass as any).getAuthMethod({
                googleApplicationCredentialFilePath: '/path/to/credentials.json'
            })

            expect(authMethod).toBe('serviceAccount')
        })

        it('should throw error when unable to determine auth method', async () => {
            await expect((nodeClass as any).getAuthMethod({})).rejects.toThrow(
                'Unable to determine authentication method'
            )
        })
    })

    describe('Service Account Validation', () => {
        it('should require sharedDriveId and folderId for service account', async () => {
            ;(getCredentialData as jest.Mock).mockResolvedValue({
                googleApplicationCredential: '{"type":"service_account"}'
            })

            const nodeData = createNodeData('test-1', {
                folderId: 'test-folder'
                // Missing sharedDriveId
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow('Shared Drive ID is required')
        })

        it('should require folderId for service account', async () => {
            ;(getCredentialData as jest.Mock).mockResolvedValue({
                googleApplicationCredential: '{"type":"service_account"}'
            })

            const nodeData = createNodeData('test-1', {
                sharedDriveId: 'test-drive'
                // Missing folderId
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow('Folder ID is required')
        })
    })

    describe('OAuth2 Validation', () => {
        it('should require either selectedFiles or folderId for OAuth2', async () => {
            ;(getCredentialData as jest.Mock).mockResolvedValue({
                access_token: 'test-token'
            })
            ;(getCredentialParam as jest.Mock).mockImplementation((param: string) => {
                if (param === 'access_token') return 'test-token'
                return undefined
            })

            const nodeData = createNodeData('test-1', {
                // Missing both selectedFiles and folderId
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow('Either selected files or Folder ID is required')
        })
    })
})

