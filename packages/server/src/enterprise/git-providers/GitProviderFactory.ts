import { IGitProvider, GitProviderConfig } from './IGitProvider'
import { GithubProvider } from './GithubProvider'
import { GitlabProvider } from './GitlabProvider'
import { GitConfig } from '../database/entities/git-config.entity'

export enum GitProviderType {
    GITHUB = 'github',
    GITLAB = 'gitlab',
    // Add more providers as needed
}

export class GitProviderFactory {
    static createProvider(type: GitProviderType, config: GitProviderConfig): IGitProvider {
        switch (type) {
            case GitProviderType.GITHUB:
                return new GithubProvider(config)
            case GitProviderType.GITLAB:
                throw new Error('GitLab provider is not yet supported.');
            default:
                throw new Error(`Unsupported git provider type: ${type}`)
        }
    }

    static createProviderFromConfig(config: GitConfig): IGitProvider {
        // Map the provider string to the enum, default to GITHUB if unknown
        let providerType: GitProviderType
        switch ((config.provider || '').toLowerCase()) {
            case 'github':
                providerType = GitProviderType.GITHUB
                break
            default:
                throw new Error('Unsupported git provider type: ' + config.provider);
        }
        const gitConfig: GitProviderConfig = {
            username: config.username,
            repository: config.repository,
            secret: config.secret,
            branchName: config.branchName
        }
        return this.createProvider(providerType, gitConfig)
    }
} 