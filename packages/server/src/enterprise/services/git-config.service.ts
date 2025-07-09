import { DataSource } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { GitConfig } from '../database/entities/git-config.entity'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import * as https from 'https'
import { ChatFlow } from '../../database/entities/ChatFlow'

export class GitConfigService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    public async getAllGitConfigs(organizationId: string) {
        return await this.dataSource
            .getRepository(GitConfig)
            .createQueryBuilder('git_config')
            .where('git_config.organizationId = :organizationId', { organizationId })
            .getMany()
    }

    public async getGitConfigById(id: string, organizationId: string) {
        return await this.dataSource
            .getRepository(GitConfig)
            .createQueryBuilder('git_config')
            .where('git_config.id = :id', { id })
            .andWhere('git_config.organizationId = :organizationId', { organizationId })
            .getOne()
    }

    public async createGitConfig(data: Partial<GitConfig>) {
        const repo = this.dataSource.getRepository(GitConfig)
        const config = repo.create(data)
        return await repo.save(config)
    }

    public async updateGitConfig(id: string, data: Partial<GitConfig>) {
        const repo = this.dataSource.getRepository(GitConfig)
        const config = await repo.findOneBy({ id, organizationId: data.organizationId })
        if (!config) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Git config not found')
        const updated = repo.merge(config, data)
        return await repo.save(updated)
    }

    public async deleteGitConfig(id: string, organizationId: string) {
        const repo = this.dataSource.getRepository(GitConfig)
        const config = await repo.findOneBy({ id, organizationId })
        if (!config) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Git config not found')
        await repo.remove(config)
        return true
    }

    public async testGitConfig(data: Partial<GitConfig>): Promise<{ success: boolean; permissions?: any; error?: string }> {
        try {
            // Service layer assumes validation is done in controller
            // Test GitHub API credentials
            if (!data.username || !data.secret || !data.repository) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required credentials')
            }

            const permissions = await this.testGitHubCredentials(data.username, data.secret, data.repository)
            
            return {
                success: true,
                permissions
            }
        } catch (error) {
            if (error instanceof InternalFlowiseError) {
                throw error
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }

    private async testGitHubCredentials(username: string, token: string, repository: string): Promise<any> {
        return new Promise((resolve, reject) => {
            // Use username as owner, repository is the repo name
            const owner = username
            const repo = repository

            // Make request to GitHub API to test credentials and get permissions
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${owner}/${repo}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'FlowiseAI',
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }

            const req = https.request(options, (res) => {
                let data = ''

                res.on('data', (chunk) => {
                    data += chunk
                })

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const repoData = JSON.parse(data)
                            
                            // Extract permissions from the response
                            const permissions = {
                                admin: repoData.permissions?.admin || false,
                                push: repoData.permissions?.push || false,
                                pull: repoData.permissions?.pull || false,
                                maintain: repoData.permissions?.maintain || false,
                                triage: repoData.permissions?.triage || false
                            }

                            resolve({
                                repository: repoData.full_name,
                                description: repoData.description,
                                private: repoData.private,
                                permissions,
                                user: {
                                    login: repoData.owner?.login,
                                    type: repoData.owner?.type
                                }
                            })
                        } catch (parseError) {
                            reject(new Error('Failed to parse GitHub API response'))
                        }
                    } else if (res.statusCode === 401) {
                        reject(new Error('Invalid token or insufficient permissions'))
                    } else if (res.statusCode === 404) {
                        reject(new Error('Repository not found or access denied'))
                    } else {
                        try {
                            const errorData = JSON.parse(data)
                            reject(new Error(errorData.message || `GitHub API error: ${res.statusCode}`))
                        } catch {
                            reject(new Error(`GitHub API error: ${res.statusCode}`))
                        }
                    }
                })
            })

            req.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`))
            })

            req.setTimeout(10000, () => {
                req.destroy()
                reject(new Error('Request timeout'))
            })

            req.end()
        })
    }
} 