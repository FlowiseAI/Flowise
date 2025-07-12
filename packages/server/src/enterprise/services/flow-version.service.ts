import { DataSource } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { GitConfig } from '../database/entities/git-config.entity'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Workspace } from '../database/entities/workspace.entity'
import { IGitProvider, VersionInfo, GitProviderFactory, FlowMessagesWithFeedback } from '../git-providers'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'

export class FlowVersionService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    /**
     * Gets the git provider instance for the active git config
     */
    private async getGitProvider(): Promise<{provider: IGitProvider, config: GitConfig}> {
        const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
        if (!gitConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No active Git config found')
        }
        const provider = GitProviderFactory.createProviderFromConfig(gitConfig)
        return {provider, config: gitConfig}
    }

    /**
     * Constructs the file path for a chatflow based on workspace and chatflow information
     * @param chatflowId The ID of the chatflow
     * @returns Promise<string> The constructed file path
     */
    private async constructFlowPath(chatflowId: string): Promise<string> {
        // Get the chatflow to find workspaceId
        const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
        }

        if (!chatflow.workspaceId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Chatflow has no workspace assigned')
        }

        // Get the workspace to find workspace name
        const workspace = await this.dataSource.getRepository(Workspace).findOneBy({ id: chatflow.workspaceId })
        if (!workspace) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Workspace not found')
        }

        // Construct flow path: workspaceId_workspaceName/chatflowId
        const workspacePath = `${chatflow.workspaceId}_${workspace.name.replace(/[^a-zA-Z0-9-_]/g, '_')}`
        return `${workspacePath}/${chatflowId}`
    }

    /**
     * Publishes a chatflow as JSON files to the active git repository.
     * @param chatflowId The ID of the chatflow to publish
     */
    public async publishFlow(chatflowId: string, message?: string): Promise<{ success: true; url?: string; commitId?: string } | { success: false; error: string }> {
        try {
            // 1. Get the git provider
            const {provider: gitProvider, config: gitConfig} = await this.getGitProvider()

            // 2. Retrieve the chatflow
            const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
            if (!chatflow) {
                return { success: false, error: 'Chatflow not found' }
            }

            // 3. Prepare file content and construct flow path
            const flowPath = await this.constructFlowPath(chatflowId)
            const flowContent = JSON.stringify(chatflow, null, 2)
            const flowMessagesWithFeedback:FlowMessagesWithFeedback = {
                messages: [],
                feedback: []
            }

            // 4. Retrieve the chatflow messages and feedback
            const messages = await this.dataSource.getRepository(ChatMessage).findBy({ chatflowid: chatflowId })
            if (!messages) {
                return { success: false, error: 'Chatflow messages not found' }
            }
            flowMessagesWithFeedback.messages = messages
            const feedback = await this.dataSource.getRepository(ChatMessageFeedback).findBy({ chatflowid: chatflowId })
            if (!feedback) {
                return { success: false, error: 'Chatflow feedback not found' }
            }
            flowMessagesWithFeedback.feedback = feedback

            const messagesContent = JSON.stringify({ flowMessagesWithFeedback }) 
            const commitMessage = message || `Publish chatflow: ${chatflow.name}`

            // 5. Commit the flow using the git provider
            const result = await gitProvider.commitFlow(flowPath, flowContent, messagesContent, commitMessage, gitConfig.branchName)

            if (result.success) {
                // Update chatflow with Git information after successful publish
                await this.dataSource.getRepository(ChatFlow).update(
                    { id: chatflowId },
                    {
                        lastPublishedAt: new Date(),
                        lastPublishedCommit: result.commitId,
                        isDirty: false
                    }
                )
            }

            return result
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }
        }
    }

    /**
     * Returns the commit history for a chatflow in the active git repository.
     * @param chatflowId The ID of the chatflow
     */
    public async getVersions(chatflowId: string): Promise<VersionInfo> {
        try {
            // 1. Get the git provider
            const {provider: gitProvider, config: gitConfig} = await this.getGitProvider()

            // 2. Retrieve the chatflow
            const chatflow = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
            if (!chatflow) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
            }

            // 3. Prepare flow path
            const flowPath = await this.constructFlowPath(chatflowId)

            // 4. Get commit history using the git provider
            const commits = await gitProvider.getFlowHistory(flowPath, gitConfig.branchName)

            // 5. iterate over the commits and add the external property
            //    -- any commit that is after the lastPublishedCommit should be external
            const lastPublishedAt = chatflow.lastPublishedAt
            if (lastPublishedAt) {
                commits.forEach((commit) => {
                    commit.external = new Date(commit.date) > lastPublishedAt
                })
            }

            return {
                provider: gitProvider.getProviderName(),
                repository: gitProvider.getRepositoryUrl(),
                branch: gitConfig.branchName,
                filename: `${flowPath}/flow.json`,
                draft: chatflow.isDirty || false,
                commits: commits
            }
        } catch (error) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR, 
                error instanceof Error ? error.message : 'Failed to get versions'
            )
        }
    }

    /**
     * Fetches a specific version of a chatflow by commitId from the git repository.
     * @param chatflowId The ID of the chatflow
     * @param commitId The commit ID to fetch the version from
     */
    public async getChatflowByCommitId(chatflowId: string, commitId: string): Promise<ChatFlow> {
        try {
            // 1. Get the git provider
            const {provider: gitProvider, config: gitConfig} = await this.getGitProvider()

            // 2. Construct flow path
            const flowPath = await this.constructFlowPath(chatflowId)
            const flowFileName = `${flowPath}/flow.json`

            // 3. Get flow content using the git provider
            const content = await gitProvider.getFileContent(flowFileName, commitId, gitConfig.branchName)
            const chatflowData = JSON.parse(content)
            return chatflowData
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow version not found for the specified commit')
            }
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR, 
                error instanceof Error ? error.message : 'Failed to fetch chatflow version'
            )
        }
    }

    public async makeDraft(chatflowId: string, commitId: string): Promise<ChatFlow> {
        try {
            // 1. Retrieve the chatflow from the git repository
            const chatflow = await this.getChatflowByCommitId(chatflowId, commitId)
            if (!chatflow) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
            }

            // 2. fetch the currentchatflow from the database
            const chatflowFromDb = await this.dataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId })
            if (!chatflowFromDb) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Chatflow not found')
            }

            // 3. update the lastPublishedCommit and lastPublishedAt. 
            // This is needed as the draft can be from any previous commit.
            // we should never lose the last published commit and date. (most recent commit)
            chatflow.lastPublishedCommit = chatflowFromDb.lastPublishedCommit
            chatflow.lastPublishedAt = chatflowFromDb.lastPublishedAt
            chatflow.isDirty = true
            await this.dataSource.getRepository(ChatFlow).save(chatflow)
            return chatflow
        } catch (error) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR, 
                error instanceof Error ? error.message : 'Failed to make draft'
            )
        }
    }
    
    /**
     * Deletes a chatflow from the git repository by chatflowId
     * @param chatflowId The ID of the chatflow to delete
     */
    public async deleteChatflowById(chatflowId: string): Promise<void> {
        try {
            // 1. Get the git provider
            const {provider: gitProvider, config: gitConfig} = await this.getGitProvider()

            // 2. Construct flow path
            const flowPath = await this.constructFlowPath(chatflowId)

            // 3. Delete the flow using the git provider
            const result = await gitProvider.deleteFlow(flowPath, `Delete flow: ${chatflowId}`, gitConfig.branchName)
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete flow from git repository')
            }
        } catch (error) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR, 
                error instanceof Error ? error.message : 'Failed to delete chatflow from git repository'
            )
        }
    }

    /**
     * Checks if there is an active git config
     */
    public async check(): Promise<boolean> {
        try {
            const gitConfig = await this.dataSource.getRepository(GitConfig).findOneBy({ isActive: true })
            return gitConfig !== null
        } catch (error) {
            return false
        }
    }
} 