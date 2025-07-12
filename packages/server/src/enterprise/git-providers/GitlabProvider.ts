import { IGitProvider, GitProviderConfig, CommitInfo, CommitResult } from './IGitProvider'

export class GitlabProvider implements IGitProvider {
    private config: GitProviderConfig
    private baseUrl: string

    getProviderName(): string {
        return 'GitLab'
    }

    constructor(config: GitProviderConfig) {
        this.config = config
        // GitLab API base URL - could be configurable for self-hosted instances
        this.baseUrl = 'gitlab.com'
    }

    async getFileSha(fileName: string, branch: string = 'main'): Promise<string | null> {
        // TODO: Implement GitLab API call to get file SHA
        // GitLab API: GET /projects/:id/repository/files/:file_path?ref=:branch
        throw new Error('GitLab provider not yet implemented')
    }

    async commitFlow(flowPath: string, flowContent: string, flowMessagesContent: string, commitMessage: string, branch: string = 'main'): Promise<CommitResult> {
        // TODO: Implement GitLab API call to commit flow files
        // GitLab API: PUT /projects/:id/repository/files/:file_path
        throw new Error('GitLab provider not yet implemented')
    }

    async getFlowHistory(flowPath: string, branch: string = 'main'): Promise<CommitInfo[]> {
        // TODO: Implement GitLab API call to get commit history
        // GitLab API: GET /projects/:id/repository/commits?path=:file_path&ref_name=:branch
        throw new Error('GitLab provider not yet implemented')
    }

    async getFileContent(fileName: string, commitId: string): Promise<string> {
        // TODO: Implement GitLab API call to get file content at specific commit
        // GitLab API: GET /projects/:id/repository/files/:file_path?ref=:commit_id
        throw new Error('GitLab provider not yet implemented')
    }

    async deleteFlow(flowPath: string, message: string, branch: string = 'main'): Promise<CommitResult> {
        // TODO: Implement GitLab API call to delete flow files
        // GitLab API: DELETE /projects/:id/repository/files/:file_path
        throw new Error('GitLab provider not yet implemented')
    }

    getRepositoryUrl(): string {
        return `https://gitlab.com/${this.config.username}/${this.config.repository}`
    }

    async getBranches(): Promise<string[]> {
        // TODO: Implement GitLab API call to get all branches
        // GitLab API: GET /projects/:id/repository/branches
        throw new Error('GitLab provider not yet implemented')
    }
} 