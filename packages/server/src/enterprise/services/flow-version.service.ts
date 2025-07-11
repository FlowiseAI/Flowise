import { DataSource } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { GitConfig } from '../database/entities/git-config.entity'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import * as https from 'https'
import { ChatFlow } from '../../database/entities/ChatFlow'

interface CommitInfo {
    commitId: string;
    date: string;
    message: string;
    filePath: string;
}

interface VersionInfo {
    repository: string;
    branch: string;
    draft: boolean;
    filename: string;
    commits: CommitInfo[];
}


export class FlowVersionService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    /**
     * Publishes a chatflow as a JSON file to the active git repository.
     * @param chatflowId The ID of the chatflow to publish
     */
    public async publishFlow(chatflowId: string, message?: string): Promise<{ success: true; url?: string; commitId?: string } | { success: false; error: string }> {
        // 1. Retrieve the active GitConfig
        const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
        if (!gitConfig) {
            return { success: false, error: 'No active Git config found' }
        }

        // 2. Retrieve the chatflow
        const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
        if (!chatflow) {
            return { success: false, error: 'Chatflow not found' }
        }

        // 3. Prepare file content and name
        const fileName = `${chatflow.name}.json`
        const fileContent = JSON.stringify(chatflow, null, 2)
        const branch = gitConfig.branchName || 'main'
        const owner = gitConfig.username
        const repo = gitConfig.repository
        const token = gitConfig.secret

        // 4. Get the SHA of the file if it exists (for update)
        const getFileSha = async (): Promise<string | null> => {
            return new Promise((resolve) => {
                const options = {
                    hostname: 'api.github.com',
                    port: 443,
                    path: `/repos/${owner}/${repo}/contents/${encodeURIComponent(fileName)}?ref=${branch}`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'FlowiseAI',
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
                const req = https.request(options, (res) => {
                    let data = ''
                    res.on('data', (chunk) => { data += chunk })
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            try {
                                const json = JSON.parse(data)
                                resolve(json.sha)
                            } catch {
                                resolve(null)
                            }
                        } else {
                            resolve(null)
                        }
                    })
                })
                req.on('error', () => resolve(null))
                req.end()
            })
        }

        // 5. Commit the file (create or update)
        return new Promise((resolve) => {
            (async () => {
                const sha = await getFileSha()
                const body = {
                    message: message || `Publish chatflow: ${chatflow.name}`,
                    content: Buffer.from(fileContent).toString('base64'),
                    branch,
                    ...(sha ? { sha } : {})
                }
                const options = {
                    hostname: 'api.github.com',
                    port: 443,
                    path: `/repos/${owner}/${repo}/contents/${encodeURIComponent(fileName)}`,
                    method: 'PUT',
                    headers: {
                        'User-Agent': 'FlowiseAI',
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    }
                }
                const req = https.request(options, (res) => {
                    let data = ''
                    res.on('data', (chunk) => { data += chunk })
                    res.on('end', () => {
                        if (res.statusCode === 201 || res.statusCode === 200) {
                            try {
                                const json = JSON.parse(data)
                                // Update chatflow with Git information after successful publish
                                this.dataSource.getRepository(ChatFlow).update(
                                    { id: chatflowId },
                                    {
                                        lastPublishedAt: new Date(),
                                        lastPublishedCommit: json.commit?.sha,
                                        isDirty: false
                                    }
                                )
                                resolve({ success: true, url: json.content?.html_url, commitId: json.commit?.sha })
                            } catch {
                                resolve({ success: true })
                            }
                        } else {
                            try {
                                const json = JSON.parse(data)
                                resolve({ success: false, error: json.message })
                            } catch {
                                resolve({ success: false, error: 'Failed to commit file to GitHub' })
                            }
                        }
                    })
                })
                req.on('error', (err) => resolve({ success: false, error: err.message }))
                req.write(JSON.stringify(body))
                req.end()
            })()
        })
    }

    /**
     * Returns the commit history for a chatflow file in the active git repository.
     * @param chatflowId The ID of the chatflow
     */
    public async getVersions(chatflowId: string): Promise<VersionInfo> {
        // 1. Retrieve the active GitConfig
        const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
        if (!gitConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No active Git config found')
        }

        // 2. Retrieve the chatflow
        const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        }

        // 3. Prepare file name and repo info
        const fileName = `${chatflow.name}.json`
        const branch = gitConfig.branchName || 'main'
        const owner = gitConfig.username
        const repo = gitConfig.repository
        const token = gitConfig.secret

        // 4. Fetch commit history for the file from GitHub API
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${owner}/${repo}/commits?path=${encodeURIComponent(fileName)}&sha=${branch}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'FlowiseAI',
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
            const req = https.request(options, (res) => {
                let data = ''
                res.on('data', (chunk) => { data += chunk })
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const commits = JSON.parse(data)
                            const commitsArray = Array.isArray(commits)
                                ? commits.map((c: any) => ({
                                    commitId: c.sha,
                                    date: c.commit?.committer?.date,
                                    message: c.commit?.message,
                                    filePath: `https://github.com/${owner}/${repo}/blob/${c.sha}/${fileName}`
                                }))
                                : []
                            resolve({
                                repository: `${owner}/${repo}`,
                                branch,
                                filename: fileName,
                                draft: chatflow.isDirty || false,
                                commits: commitsArray
                            })
                        } catch {
                            resolve({
                                repository: `${owner}/${repo}`,
                                branch,
                                filename: fileName,
                                draft: false,
                                commits: []
                            })
                        }
                    } else {
                        resolve({
                            repository: `${owner}/${repo}`,
                            branch,
                            draft: false,
                            filename: fileName,
                            commits: []
                        })
                    }
                })
            })
            req.on('error', () => resolve({
                repository: `${owner}/${repo}`,
                branch,
                draft: false,
                filename: fileName,
                commits: []
            }))
            req.end()
        })
    }

    /**
     * Fetches a specific version of a chatflow by commitId from the git repository.
     * @param chatflowId The ID of the chatflow
     * @param commitId The commit ID to fetch the version from
     */
    public async getChatflowByCommitId(chatflowId: string, commitId: string): Promise<ChatFlow> {
        // 1. Retrieve the active GitConfig
        const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
        if (!gitConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No active Git config found')
        }

        // 2. Retrieve the chatflow to get the filename
        const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        }

        // 3. Prepare file name and repo info
        const fileName = `${chatflow.name}.json`
        const owner = gitConfig.username
        const repo = gitConfig.repository
        const token = gitConfig.secret

        // 4. Fetch the specific version of the file from GitHub API
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${owner}/${repo}/contents/${encodeURIComponent(fileName)}?ref=${commitId}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'FlowiseAI',
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
            const req = https.request(options, (res) => {
                let data = ''
                res.on('data', (chunk) => { data += chunk })
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const fileData = JSON.parse(data)
                            const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
                            const chatflowData = JSON.parse(content)
                            resolve(chatflowData)
                        } catch (error) {
                            reject(new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Failed to parse chatflow data from repository'))
                        }
                    } else {
                        reject(new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow version not found for the specified commit'))
                    }
                })
            })
            req.on('error', (error) => {
                reject(new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to fetch chatflow version: ${error.message}`))
            })
            req.end()
        })
    }

    public async makeDraft(chatflowId: string, commitId: string): Promise<ChatFlow> {
        // 1. Retrieve the active GitConfig
        const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
        if (!gitConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No active Git config found')
        }

        // 2. Retrieve the chatflow from the git repository
        const chatflow = await this.getChatflowByCommitId(chatflowId, commitId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        }

        // 3. fetch the currentchatflow from the database
        const chatflowFromDb = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
        if (!chatflowFromDb) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        }

        // 4. update the lastPublishedCommit and lastPublishedAt. 
        // This is needed as the draft can be from any previous commit.
        // we should never lose the last published commit and date. (most recent commit)
        chatflow.lastPublishedCommit = chatflowFromDb.lastPublishedCommit
        chatflow.lastPublishedAt = chatflowFromDb.lastPublishedAt
        chatflow.isDirty = true
        await this.dataSource.getRepository(ChatFlow).save(chatflow)
        return chatflow
    }

    public async deleteChatflow(chatflowId: string): Promise<void> {
        // 1. Retrieve the active GitConfig
        const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
        if (!gitConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No active Git config found')
        }

        // 2. Retrieve the chatflow from the git repository
        const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        }

        // 3. delete the chatflow from the git repository
        const fileName = `${chatflow.name}.json`
        const owner = gitConfig.username
        const repo = gitConfig.repository
        const token = gitConfig.secret

        // 4. delete the chatflow from the git repository
        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${owner}/${repo}/contents/${encodeURIComponent(fileName)}`,
            method: 'DELETE',
            headers: {
                'User-Agent': 'FlowiseAI',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
        const req = https.request(options, async (res) => {
            if (res.statusCode === 204) {
                // 5. delete the chatflow from the database
                await this.dataSource.getRepository(ChatFlow).delete(chatflowId)
            } else {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete chatflow from git repository')
            }
        })
        req.on('error', (error) => {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to delete chatflow from git repository: ${error.message}`)
        })
        req.end()
    }
} 