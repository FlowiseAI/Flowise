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

    private makeRequest(path: string, method: string = 'GET', body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: method,
                headers: {
                    'User-Agent': 'FlowiseAI',
                    'Authorization': `token ${this.config.secret}`,
                    'Accept': 'application/vnd.github.v3+json',
                    ...(body && { 'Content-Type': 'application/json' })
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
            
            if (body) {
                req.write(JSON.stringify(body))
            }
            req.end()
        })
    }

    async getFileSha(fileName: string, branch: string = 'main'): Promise<string | null> {
        try {
            const branchToUse = branch || this.config.branchName || 'main'
            const path = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(fileName)}?ref=${branchToUse}`
            const response = await this.makeRequest(path)
            return response.sha || null
        } catch (error) {
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
            const flowResponse = await this.makeRequest(flowPath_, 'PUT', flowBody)

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
            const messagesResponse = await this.makeRequest(messagesPath_, 'PUT', messagesBody)

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
            const commits = await this.makeRequest(path)

            return Array.isArray(commits)
                ? commits.map((c: any) => ({
                    commitId: c.sha,
                    date: c.commit?.committer?.date,
                    message: c.commit?.message,
                    filePath: `https://github.com/${this.config.username}/${this.config.repository}/blob/${c.sha}/${flowFileName}`
                }))
                : []
        } catch (error) {
            return []
        }
    }

    async getFileContent(fileName: string, commitId: string): Promise<string> {
        const path = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(fileName)}?ref=${commitId}`
        const fileData = await this.makeRequest(path)
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
        return content
    }

    async deleteFlow(flowPath: string, commitMessage: string, branch: string = 'main'): Promise<void> {
        const branchToUse = branch || this.config.branchName || 'main'
        
        // Delete flow.json
        const flowFileName = `${flowPath}/flow.json`
        const flowSha = await this.getFileSha(flowFileName, branchToUse)
        
        if (flowSha) {
            const flowBody = {
                message: commitMessage,
                sha: flowSha
            }
            const flowPath_ = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(flowFileName)}`
            await this.makeRequest(flowPath_, 'DELETE', flowBody)
        }

        // Delete messages.json
        const messagesFileName = `${flowPath}/messages.json`
        const messagesSha = await this.getFileSha(messagesFileName, branchToUse)
        
        if (messagesSha) {
            const messagesBody = {
                message: commitMessage,
                sha: messagesSha
            }
            const messagesPath_ = `/repos/${this.config.username}/${this.config.repository}/contents/${encodeURIComponent(messagesFileName)}`
            await this.makeRequest(messagesPath_, 'DELETE', messagesBody)
        }
    }

    getRepositoryUrl(): string {
        return `https://github.com/${this.config.username}/${this.config.repository}`
    }
} 