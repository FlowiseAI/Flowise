import { IChatMessage, IChatMessageFeedback } from "../../Interface";

export interface CommitInfo {
    commitId: string;
    date: string;
    message: string;
    filePath: string;
    external?: boolean;
}

export interface VersionInfo {
    provider: string; // github, gitlab, etc.
    repository: string; // e.g. https://github.com/flowiseai/flowise-chatflow-example
    branch: string; // e.g. main
    draft: boolean; // true if the flow is a draft
    filename: string; // e.g. flow.json
    commits: CommitInfo[];
}

export interface GitProviderConfig {
    username: string;
    repository: string;
    secret: string;
    branchName?: string;
}

export interface FileContent {
    content: string;
    sha?: string;
}

export type CommitResult = {
    success: true;
    url?: string;
    commitId?: string;
} | {
    success: false;
    error: string;
}

export interface FlowMessagesWithFeedback {
    messages: IChatMessage[];
    feedback: IChatMessageFeedback[];
}

export interface IGitProvider {
    /**
     * Gets the name of the provider
     */
    getProviderName(): string;

    /**
     * Gets the SHA of a file from the repository
     */
    getFileSha(fileName: string, branch?: string): Promise<string | null>;

    /**
     * Creates or updates a flow in the repository (handles multiple files like flow.json, messages.json)
     */
    commitFlow(flowPath: string, flowContent: string, flowMessagesContent: string, commitMessage: string, branch?: string): Promise<CommitResult>;

    /**
     * Gets the commit history for a flow
     */
    getFlowHistory(flowPath: string, branch?: string): Promise<CommitInfo[]>;

    /**
     * Gets the content of a file at a specific commit
     */
    getFileContent(fileName: string, commitId: string, branch?: string): Promise<string>;

    /**
     * Deletes a flow from the repository (deletes all associated files)
     */
    deleteFlow(flowPath: string, commitMessage: string, branch?: string): Promise<void>;

    /**
     * Gets the repository URL for display purposes
     */
    getRepositoryUrl(): string;

    /**
     * Gets all branches from the repository
     */
    getBranches(): Promise<string[]>;
} 