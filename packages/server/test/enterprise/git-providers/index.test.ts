import { GitProviderFactory, GitProviderType } from '../../../src/enterprise/git-providers/GitProviderFactory'
import { GithubProvider } from '../../../src/enterprise/git-providers/GithubProvider'
import { GitlabProvider } from '../../../src/enterprise/git-providers/GitlabProvider'

describe('GitProviderFactory', () => {
    const mockConfig = {
        username: 'testuser',
        repository: 'testrepo',
        secret: 'testsecret',
        branchName: 'main'
    }

    describe('createProvider', () => {
        it('should create GitHub provider', () => {
            const provider = GitProviderFactory.createProvider(GitProviderType.GITHUB, mockConfig)
            expect(provider).toBeInstanceOf(GithubProvider)
        })

        it('should throw error for GitLab provider', () => {
            expect(() => {
                GitProviderFactory.createProvider(GitProviderType.GITLAB, mockConfig)
            }).toThrow('GitLab provider is not yet supported.')
        })

        it('should throw error for unsupported provider', () => {
            expect(() => {
                GitProviderFactory.createProvider('unsupported' as GitProviderType, mockConfig)
            }).toThrow('Unsupported git provider type: unsupported')
        })
    })

    describe('createProviderFromConfig', () => {
        it('should create GitHub provider by default', () => {
            const provider = GitProviderFactory.createProviderFromConfig({
                ...mockConfig,
                provider: 'github'
            } as any)
            expect(provider).toBeInstanceOf(GithubProvider)
        })

        it('should throw error for GitLab provider', () => {
            expect(() => {
                GitProviderFactory.createProviderFromConfig({
                    ...mockConfig,
                    provider: 'gitlab'
                } as any)
            }).toThrow('Unsupported git provider type: gitlab')
        })
    })
})

describe('GithubProvider', () => {
    const mockConfig = {
        username: 'testuser',
        repository: 'testrepo',
        secret: 'testsecret',
        branchName: 'main'
    }

    let provider: GithubProvider

    beforeEach(() => {
        provider = new GithubProvider(mockConfig)
    })

    it('should return correct repository URL', () => {
        const url = provider.getRepositoryUrl()
        expect(url).toBe('https://github.com/testuser/testrepo')
    })

    // Note: These tests would require mocking the GitHub API calls
    // For now, we're just testing the basic structure
    it('should implement all required interface methods', () => {
        expect(typeof provider.getFileSha).toBe('function')
        expect(typeof provider.commitFlow).toBe('function')
        expect(typeof provider.getFlowHistory).toBe('function')
        expect(typeof provider.getFileContent).toBe('function')
        expect(typeof provider.deleteFlow).toBe('function')
        expect(typeof provider.getRepositoryUrl).toBe('function')
    })

    it('should return correct type for deleteFlow method', async () => {
        // Mock the githubApiRequest method to avoid actual API calls
        const originalGithubApiRequest = (provider as any).githubApiRequest
        ;(provider as any).githubApiRequest = jest.fn().mockResolvedValue({
            commit: { sha: 'test-commit-sha' },
            content: { html_url: 'https://github.com/testuser/testrepo/blob/main/test' }
        })

        try {
            const result = await provider.deleteFlow('test-flow', 'Test commit message')
            expect(result).toHaveProperty('success')
            expect(typeof result.success).toBe('boolean')
            
            if (result.success) {
                expect(result).toHaveProperty('url')
                if ('commitId' in result) {
                    expect(typeof result.commitId === 'undefined' || typeof result.commitId === 'string').toBe(true)
                }
            } else {
                expect(result).toHaveProperty('error')
                expect(typeof result.error).toBe('string')
            }
        } finally {
            // Restore original method
            ;(provider as any).githubApiRequest = originalGithubApiRequest
        }
    })
}) 