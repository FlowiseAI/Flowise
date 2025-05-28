---
sidebar_position: 6
title: GitHub MCP
description: Use GitHub MCP to manage repositories, issues, and pull requests
---

# GitHub MCP for Answer Agent

## Introduction

GitHub MCP (Model Context Protocol) Server is a powerful integration that provides AI systems with the ability to interact with GitHub repositories and data. It enables features like file operations, repository management, search functionality, issue tracking, and pull request management through a clean API interface.

> **Used MCP**: Development for this project is on the Github repo [https://github.com/github/github-mcp-server](https://github.com/github/github-mcp-server) repo.

## Setup Instructions

Before using the GitHub MCP tools, you need to set up your credentials:

### Obtaining a Personal Access Token

1. **Generate a GitHub Personal Access Token**:
    - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
    - Click "Generate new token" (classic)
    - Select which repositories you'd like this token to have access to (Public, All, or Select)
    - Create a token with the appropriate scopes:
        - For full access: `repo` scope ("Full control of private repositories")
        - For public repositories only: `public_repo` scope
    - Give your token a descriptive name
    - Click "Generate token"
    - Copy the token immediately (it will only be shown once)

### Configuring Answer Agent

Configure your credentials in Answer Agent by setting this environment variable:

```
GITHUB_TOKEN=your_token_here
```

## Key Features

-   **Automatic Branch Creation**: When creating/updating files or pushing changes, branches are automatically created if they don't exist
-   **Comprehensive Error Handling**: Clear error messages for common issues
-   **Git History Preservation**: Operations maintain proper Git history without force pushing
-   **Batch Operations**: Support for both single-file and multi-file operations
-   **Advanced Search**: Support for searching code, issues/PRs, and users

## Available Tools

### create_or_update_file

Create or update a single file in a repository.

**Schema**:

```typescript
{
  owner: string, // Repository owner (username or organization)
  repo: string, // Repository name
  path: string, // Path where to create/update the file
  content: string, // Content of the file
  message: string, // Commit message
  branch: string, // Branch to create/update the file in
  sha?: string // SHA of file being replaced (for updates)
}
```

**Use cases**:

-   Add new documentation files
-   Update configuration files
-   Create new source code files

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "path": "docs/README.md",
    "content": "# Hello World\n\nThis is a sample repository.",
    "message": "Add README documentation",
    "branch": "main"
}
```

### push_files

Push multiple files in a single commit.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  branch: string, // Branch to push to
  files: { // Files to push
    path: string,
    content: string
  }[],
  message: string // Commit message
}
```

**Use cases**:

-   Create multiple related files at once
-   Update several configuration files together
-   Make changes across multiple project files

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "branch": "feature/new-module",
    "files": [
        {
            "path": "src/module.js",
            "content": "export function hello() { return 'Hello world'; }"
        },
        {
            "path": "test/module.test.js",
            "content": "import { hello } from '../src/module';\n\ntest('hello returns greeting', () => {\n  expect(hello()).toBe('Hello world');\n});"
        }
    ],
    "message": "Add new module with tests"
}
```

### search_repositories

Search for GitHub repositories.

**Schema**:

```typescript
{
  query: string, // Search query
  page?: number, // Page number for pagination
  perPage?: number // Results per page (max 100)
}
```

**Use cases**:

-   Find repositories by topic
-   Search for repositories with specific languages
-   Discover popular repositories in a domain

**Example**:

```json
{
    "query": "machine learning language:python stars:>1000",
    "page": 1,
    "perPage": 30
}
```

### create_repository

Create a new GitHub repository.

**Schema**:

```typescript
{
  name: string, // Repository name
  description?: string, // Repository description
  private?: boolean, // Whether repo should be private
  autoInit?: boolean // Initialize with README
}
```

**Use cases**:

-   Start a new project
-   Create a repository for documentation
-   Set up a template repository

**Example**:

```json
{
    "name": "awesome-project",
    "description": "A repository for my awesome project",
    "private": false,
    "autoInit": true
}
```

### get_file_contents

Get contents of a file or directory.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  path: string, // Path to file/directory
  branch?: string // Branch to get contents from
}
```

**Use cases**:

-   Read configuration files
-   Check current content before updates
-   List directory contents

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "path": "src",
    "branch": "main"
}
```

### create_issue

Create a new issue.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  title: string, // Issue title
  body?: string, // Issue description
  assignees?: string[], // Usernames to assign
  labels?: string[], // Labels to add
  milestone?: number // Milestone number
}
```

**Use cases**:

-   Report bugs
-   Request new features
-   Create tasks for contributors

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Fix rendering bug in mobile view",
    "body": "When viewing on mobile devices smaller than 320px, the navigation menu overflows the screen.",
    "assignees": ["developer1"],
    "labels": ["bug", "priority:high"]
}
```

### create_pull_request

Create a new pull request.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  title: string, // PR title
  body?: string, // PR description
  head: string, // Branch containing changes
  base: string, // Branch to merge into
  draft?: boolean, // Create as draft PR
  maintainer_can_modify?: boolean // Allow maintainer edits
}
```

**Use cases**:

-   Submit code changes for review
-   Propose documentation updates
-   Merge feature branches

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "title": "Add user authentication module",
    "body": "This PR implements user authentication with JWT tokens.",
    "head": "feature/user-auth",
    "base": "main",
    "draft": false
}
```

### fork_repository

Fork a repository.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  organization?: string // Organization to fork to
}
```

**Use cases**:

-   Fork repositories to contribute
-   Clone repositories for customization
-   Copy templates for new projects

**Example**:

```json
{
    "owner": "facebook",
    "repo": "react",
    "organization": "my-organization"
}
```

### create_branch

Create a new branch.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  branch: string, // Name for new branch
  from_branch?: string // Source branch (defaults to repo default)
}
```

**Use cases**:

-   Create feature branches
-   Set up release branches
-   Create branches for testing

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "branch": "feature/user-profile",
    "from_branch": "main"
}
```

### list_issues

List and filter repository issues.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  state?: string, // Filter by state ('open', 'closed', 'all')
  labels?: string[], // Filter by labels
  sort?: string, // Sort by ('created', 'updated', 'comments')
  direction?: string, // Sort direction ('asc', 'desc')
  since?: string, // Filter by date (ISO 8601 timestamp)
  page?: number, // Page number
  per_page?: number // Results per page
}
```

**Use cases**:

-   Review open issues
-   Find recently updated issues
-   Get issues with specific labels

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "state": "open",
    "labels": ["bug"],
    "sort": "updated",
    "direction": "desc",
    "page": 1,
    "per_page": 30
}
```

### update_issue

Update an existing issue.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  issue_number: number, // Issue number to update
  title?: string, // New title
  body?: string, // New description
  state?: string, // New state ('open' or 'closed')
  labels?: string[], // New labels
  assignees?: string[], // New assignees
  milestone?: number // New milestone number
}
```

**Use cases**:

-   Change issue status
-   Reassign issues
-   Update issue descriptions with new information

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "issue_number": 42,
    "state": "closed",
    "labels": ["fixed"]
}
```

### add_issue_comment

Add a comment to an issue.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  issue_number: number, // Issue number to comment on
  body: string // Comment text
}
```

**Use cases**:

-   Add progress updates
-   Provide additional information
-   Ask questions about the issue

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "issue_number": 42,
    "body": "I've investigated this issue and found that it's related to the recent database migration."
}
```

### search_code

Search for code across GitHub repositories.

**Schema**:

```typescript
{
  q: string, // Search query using GitHub code search syntax
  sort?: string, // Sort field ('indexed' only)
  order?: string, // Sort order ('asc' or 'desc')
  per_page?: number, // Results per page (max 100)
  page?: number // Page number
}
```

**Use cases**:

-   Find code implementations
-   Search for usage examples
-   Look for specific patterns in code

**Example**:

```json
{
    "q": "language:javascript express app.use repo:expressjs/express",
    "per_page": 30
}
```

### search_issues

Search for issues and pull requests.

**Schema**:

```typescript
{
  q: string, // Search query using GitHub issues search syntax
  sort?: string, // Sort field (comments, reactions, created, etc.)
  order?: string, // Sort order ('asc' or 'desc')
  per_page?: number, // Results per page (max 100)
  page?: number // Page number
}
```

**Use cases**:

-   Find issues across repositories
-   Search for PRs with specific criteria
-   Track issues mentioned in discussions

**Example**:

```json
{
    "q": "is:open is:issue label:bug language:python",
    "sort": "created",
    "order": "desc",
    "per_page": 50
}
```

### search_users

Search for GitHub users.

**Schema**:

```typescript
{
  q: string, // Search query using GitHub users search syntax
  sort?: string, // Sort field (followers, repositories, joined)
  order?: string, // Sort order ('asc' or 'desc')
  per_page?: number, // Results per page (max 100)
  page?: number // Page number
}
```

**Use cases**:

-   Find potential collaborators
-   Search for users by location or company
-   Discover users with specific expertise

**Example**:

```json
{
    "q": "language:rust followers:>500",
    "sort": "followers",
    "order": "desc",
    "per_page": 20
}
```

### list_commits

Gets commits of a branch in a repository.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  page?: string, // Page number
  per_page?: string, // Number of records per page
  sha?: string // Branch name
}
```

**Use cases**:

-   Review recent changes
-   Check commit history
-   Identify contributors

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "sha": "feature-branch",
    "per_page": "10"
}
```

### get_issue

Gets the contents of an issue within a repository.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  issue_number: number // Issue number to retrieve
}
```

**Use cases**:

-   Get detailed issue information
-   Read issue discussions
-   Check issue status

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "issue_number": 42
}
```

### get_pull_request

Get details of a specific pull request.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  pull_number: number // Pull request number
}
```

**Use cases**:

-   Review PR changes
-   Check PR status
-   View PR discussions

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "pull_number": 101
}
```

### list_pull_requests

List and filter repository pull requests.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  state?: string, // Filter by state ('open', 'closed', 'all')
  head?: string, // Filter by head user/org and branch
  base?: string, // Filter by base branch
  sort?: string, // Sort by ('created', 'updated', 'popularity', 'long-running')
  direction?: string, // Sort direction ('asc', 'desc')
  per_page?: number, // Results per page (max 100)
  page?: number // Page number
}
```

**Use cases**:

-   Check open PRs for review
-   Monitor PRs to specific branches
-   Find oldest open PRs

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "state": "open",
    "base": "main",
    "sort": "updated",
    "direction": "desc"
}
```

### create_pull_request_review

Create a review on a pull request.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  pull_number: number, // Pull request number
  body: string, // Review comment text
  event: string, // Review action ('APPROVE', 'REQUEST_CHANGES', 'COMMENT')
  commit_id?: string, // SHA of commit to review
  comments?: { // Line-specific comments
    path: string, // File path
    position: number, // Line position in diff
    body: string // Comment text
  }[]
}
```

**Use cases**:

-   Approve pull requests
-   Request changes to PRs
-   Comment on specific code lines

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "pull_number": 101,
    "body": "The code looks good, but there are some performance concerns.",
    "event": "COMMENT",
    "comments": [
        {
            "path": "src/app.js",
            "position": 5,
            "body": "Consider using memoization here to improve performance."
        }
    ]
}
```

### merge_pull_request

Merge a pull request.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  pull_number: number, // Pull request number
  commit_title?: string, // Title for merge commit
  commit_message?: string, // Extra detail for merge commit
  merge_method?: string // Merge method ('merge', 'squash', 'rebase')
}
```

**Use cases**:

-   Complete code reviews
-   Integrate approved changes
-   Finalize feature development

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "pull_number": 101,
    "commit_title": "Merge: Add user authentication feature",
    "merge_method": "squash"
}
```

### get_pull_request_files

Get the list of files changed in a pull request.

**Schema**:

```typescript
{
  owner: string, // Repository owner
  repo: string, // Repository name
  pull_number: number // Pull request number
}
```

**Use cases**:

-   Review specific files in a PR
-   Check file changes before merging
-   Focus code review on critical files

**Example**:

```json
{
    "owner": "octocat",
    "repo": "hello-world",
    "pull_number": 101
}
```

## Search Query Syntax

GitHub MCP supports GitHub's advanced search syntax across different types of searches:

### Code Search

-   `language:javascript`: Search by programming language
-   `repo:owner/name`: Search in specific repository
-   `path:app/src`: Search in specific path
-   `extension:js`: Search by file extension

**Example**: `q: "import express" language:typescript path:src/`

### Issues Search

-   `is:issue` or `is:pr`: Filter by type
-   `is:open` or `is:closed`: Filter by state
-   `label:bug`: Search by label
-   `author:username`: Search by author

**Example**: `q: "memory leak" is:issue is:open label:bug`

### Users Search

-   `type:user` or `type:org`: Filter by account type
-   `followers:>1000`: Filter by followers
-   `location:London`: Search by location

**Example**: `q: "fullstack developer" location:London followers:>100`

For detailed search syntax, see [GitHub's searching documentation](https://docs.github.com/en/search-github/searching-on-github).

## Use Cases for Developers

### Repository Management

Use the GitHub MCP for common repository operations:

1. **Code Management**:

    - Create new repositories with `create_repository`
    - Push code changes with `push_files`
    - Create branches with `create_branch` for feature development

2. **Issue Tracking**:

    - Create issues with `create_issue` for bugs or features
    - Update issues with `update_issue` as work progresses
    - Add comments with `add_issue_comment` to provide updates

3. **Pull Request Workflow**:

    - Create PRs with `create_pull_request` for code reviews
    - Review PRs with `create_pull_request_review`
    - Merge approved changes with `merge_pull_request`

4. **Code Search and Discovery**:
    - Find code examples with `search_code`
    - Discover repositories with `search_repositories`
    - Find related issues with `search_issues`

### Integration Possibilities

-   Connect with CI/CD systems to automatically update PRs with build status
-   Link issues and PRs for automatic tracking of work
-   Create reports on repository activity and contributor statistics

## Advanced Features

The GitHub MCP server includes these powerful capabilities:

-   **Automatic Branch Creation**: Creates branches on-the-fly for operations that require them
-   **Batch Operations**: Supports multi-file operations in a single API call
-   **Cross-Repository Operations**: Works across multiple repositories for complex workflows
-   **Advanced Search**: Provides powerful search capabilities across code, issues, and users
-   **Complete PR Lifecycle**: Supports the entire PR workflow from creation to merge

## Limitations

-   API rate limits apply based on GitHub's rate limiting policies
-   Some operations require appropriate permissions in the personal access token
-   Search results are limited to GitHub's search API constraints
-   Large file operations may be subject to GitHub's file size limitations
