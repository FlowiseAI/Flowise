import * as https from 'https'
import { IGitProvider, GitProviderConfig, CommitInfo, CommitResult } from './IGitProvider'

export class GithubProvider implements IGitProvider {
    private config: GitProviderConfig
    private baseUrl = 'api.github.com'

    constructor(config: GitProviderConfig) {
        this.config = config
    }

    getProviderName(): string {
        return 'GitHub'
    }

    private githubApiRequest(path: string, method: string = 'GET', body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const bodyString = body ? JSON.stringify(body) : undefined
            
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: method,
                headers: {
                    'User-Agent': 'FlowiseAI',
                    'Authorization': `token ${this.config.secret}`,
                    'Accept': 'application/vnd.github.v3+json',
                    ...(body && { 
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(bodyString!)
                    })
                }
            }

            const req = https.request(options, (res) => {
                let data = ''
                res.on('data', (chunk) => { data += chunk })
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const json = JSON.parse(data)
                            resolve(json)
                        } catch {
                            resolve(data)
                        }
                    } else {
                        try {
                            const error = JSON.parse(data)
                            reject(new Error(error.message || `HTTP ${res.statusCode}`))
                        } catch {
                            reject(new Error(`HTTP ${res.statusCode}`))
                        }
                    }
                })
            })

            req.on('error', (err) => reject(err))
            
            if (bodyString) {
                req.write(bodyString)
            }
            req.end()
        })
    }

    async getFileSha(fileName: string, branch: string = 'main'): Promise<string | null> {
        try {
            const branchToUse = branch || this.config.branchName || 'main'
            const path = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(fileName)}?ref=${branchToUse}`
            const response = await this.githubApiRequest(path)
            
            // Validate that we got a valid SHA
            if (response && response.sha && typeof response.sha === 'string' && response.sha.trim() !== '') {
                return response.sha
            }
            
            return null
        } catch (error) {
            // File doesn't exist or other error - this is expected for files that don't exist
            return null
        }
    }

    async commitFlow(flowPath: string, flowContent: string, flowMessagesContent: string, commitMessage: string, branch: string = 'main'): Promise<CommitResult> {
        try {
            const branchToUse = branch || this.config.branchName || 'main'
            
            // Create flow.json file
            const flowFileName = `${flowPath}/flow.json`
            const flowSha = await this.getFileSha(flowFileName, branchToUse)
            
            const flowBody = {
                message: commitMessage,
                content: Buffer.from(flowContent).toString('base64'),
                branch: branchToUse,
                ...(flowSha ? { sha: flowSha } : {})
            }

            const flowPath_ = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(flowFileName)}`
            const flowResponse = await this.githubApiRequest(flowPath_, 'PUT', flowBody)

            // Create messages.json file
            const messagesFileName = `${flowPath}/messages.json`
            const messagesSha = await this.getFileSha(messagesFileName, branchToUse)
            
            const messagesBody = {
                message: commitMessage,
                content: Buffer.from(flowMessagesContent).toString('base64'),
                branch: branchToUse,
                ...(messagesSha ? { sha: messagesSha } : {})
            }

            const messagesPath_ = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(messagesFileName)}`
            const messagesResponse = await this.githubApiRequest(messagesPath_, 'PUT', messagesBody)

            return {
                success: true as const,
                url: flowResponse.content?.html_url,
                commitId: flowResponse.commit?.sha
            }
        } catch (error) {
            return {
                success: false as const,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getFlowHistory(flowPath: string, branch: string = 'main'): Promise<CommitInfo[]> {
        try {
            const branchToUse = branch || this.config.branchName || 'main'
            const flowFileName = `${flowPath}/flow.json`
            const path = `/repos/${this.config.username}/${this.config.repository}/commits?path=${encodeURIComponent(flowFileName)}&sha=${branchToUse}`
            const commits = await this.githubApiRequest(path)

            return Array.isArray(commits)
                ? commits.map((c: any) => ({
                    commitId: c.sha,
                    date: c.commit?.committer?.date,
                    message: c.commit?.message,
                    external: false,
                    filePath: `https://github.com/${this.config.username}/${this.config.repository}/blob/${c.sha}/${flowFileName}`
                }))
                : []
        } catch (error) {
            return []
        }
    }

    async getFileContent(fileName: string, commitId: string): Promise<string> {
        const path = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(fileName)}?ref=${commitId}`
        const fileData = await this.githubApiRequest(path)
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
        return content
    }

    async deleteFlow(flowPath: string, commitMessage: string, branch: string = 'main'): Promise<CommitResult> {
        // TODO: OPTIMIZATION - Delete both files in a single commit using GitHub's Git Data API
        // Current implementation uses separate DELETE requests for each file, which creates multiple commits.
        // To delete both files in one commit, implement using Git Data API:
        // 1. GET /repos/{owner}/{repo}/git/trees/{tree_sha} to get current tree
        // 2. POST /repos/{owner}/{repo}/git/trees to create new tree without the files
        // 3. POST /repos/{owner}/{repo}/git/commits to create commit with new tree
        // 4. PATCH /repos/{owner}/{repo}/git/refs/heads/{branch} to update branch reference
        // This would ensure both files are deleted atomically in a single commit.
        
        try {
            const branchToUse = branch || this.config.branchName || 'main'
            
            // Get SHAs for both files first
            const flowFileName = `${flowPath}/flow.json`
            const messagesFileName = `${flowPath}/messages.json`
            
            const flowSha = await this.getFileSha(flowFileName, branchToUse)
            const messagesSha = await this.getFileSha(messagesFileName, branchToUse)
            
            // If neither file exists, consider it a successful deletion
            if (!flowSha && !messagesSha) {
                return {
                    success: true as const,
                    url: this.getRepositoryUrl()
                }
            }
            
            // Delete both files - if one fails, we'll throw an error
            let lastCommitId: string | undefined
            let lastUrl: string | undefined
            
            // Delete flow.json if it exists and has a valid SHA
            if (flowSha && flowSha.trim() !== '') {
                const flowBody = {
                    message: commitMessage,
                    sha: flowSha
                }
                const flowPath_ = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(flowFileName)}`
                const flowResponse = await this.githubApiRequest(flowPath_, 'DELETE', flowBody)
                lastCommitId = flowResponse.commit?.sha
                lastUrl = flowResponse.content?.html_url
            }

            // Delete messages.json if it exists and has a valid SHA
            if (messagesSha && messagesSha.trim() !== '') {
                const messagesBody = {
                    message: commitMessage,
                    sha: messagesSha
                }
                const messagesPath_ = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(messagesFileName)}`
                const messagesResponse = await this.githubApiRequest(messagesPath_, 'DELETE', messagesBody)
                lastCommitId = messagesResponse.commit?.sha
                lastUrl = messagesResponse.content?.html_url
            }

            return {
                success: true as const,
                url: lastUrl,
                commitId: lastCommitId
            }
        } catch (error) {
            return {
                success: false as const,
                error: error instanceof Error ? error.message : 'Unknown error occurred while deleting flow'
            }
        }
    }

    getRepositoryUrl(): string {
        return `https://github.com/${this.config.username}/${this.config.repository}`
    }

    async getBranches(): Promise<string[]> {
        try {
            const path = `/repos/${this.config.username}/${this.config.repository}/branches`
            const branches = await this.githubApiRequest(path)
            
            return Array.isArray(branches) 
                ? branches.map((branch: any) => branch.name)
                : []
        } catch (error) {
            return []
        }
    }
} 