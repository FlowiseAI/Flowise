# Git Provider Abstraction

This directory contains the git provider abstraction for the FlowVersionService. The system is designed to be pluggable, allowing different git providers (GitHub, GitLab, etc.) to be used interchangeably.

## Architecture

### Core Components

1. **IGitProvider** - The main interface that all git providers must implement
2. **GitProviderFactory** - Factory class for creating provider instances
3. **GithubProvider** - Concrete implementation for GitHub
4. **GitlabProvider** - Placeholder implementation for GitLab (to be completed)

### Interface Methods

The `IGitProvider` interface defines the following methods:

- `getFileSha(fileName, branch)` - Get the SHA of a file
- `commitFile(fileName, content, message, branch)` - Create or update a file
- `getFileHistory(fileName, branch)` - Get commit history for a file
- `getFileContent(fileName, commitId)` - Get file content at a specific commit
- `deleteFile(fileName, message, branch)` - Delete a file
- `getRepositoryUrl()` - Get the repository URL for display

## Usage

The `FlowVersionService` now uses the git provider abstraction:

```typescript
// Get the git provider for the active config
const gitProvider = await this.getGitProvider()

// Use the provider to perform operations
const result = await gitProvider.commitFile(fileName, content, message)
```

## Adding a New Git Provider

To add support for a new git provider (e.g., Bitbucket, Azure DevOps):

1. **Create a new provider class** that implements `IGitProvider`:

```typescript
export class BitbucketProvider implements IGitProvider {
    // Implement all interface methods
}
```

2. **Add the provider type** to the `GitProviderType` enum in `GitProviderFactory.ts`:

```typescript
export enum GitProviderType {
    GITHUB = 'github',
    GITLAB = 'gitlab',
    BITBUCKET = 'bitbucket', // Add new type
}
```

3. **Update the factory** to handle the new provider type:

```typescript
case GitProviderType.BITBUCKET:
    return new BitbucketProvider(config)
```

4. **Export the new provider** in `index.ts`:

```typescript
export * from './BitbucketProvider'
```

## Configuration

The `GitProviderConfig` interface defines the common configuration needed for all providers:

```typescript
interface GitProviderConfig {
    username: string;
    repository: string;
    secret: string;
    branchName?: string;
}
```

Provider-specific configuration can be added by extending this interface or adding provider-specific fields.

## Error Handling

All providers should handle errors gracefully and return appropriate error messages. The `CommitResult` type uses discriminated unions to ensure type safety:

```typescript
type CommitResult = {
    success: true;
    url?: string;
    commitId?: string;
} | {
    success: false;
    error: string;
}
```

## Testing

When implementing a new provider, ensure to:

1. Test all interface methods
2. Handle API rate limits and errors
3. Test with different repository configurations
4. Verify error messages are user-friendly

## Future Enhancements

- Add support for self-hosted git instances
- Implement caching for API responses
- Add provider-specific features (e.g., GitHub's pull requests)
- Support for different authentication methods 