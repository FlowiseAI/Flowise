---
sidebar_position: 3
title: Jira MCP
description: Use Jira MCP to work with Jira issues and projects
---

# JIRA MCP for Answer Agent

## Introduction

JIRA MCP (Model Context Protocol) Server is a powerful integration that provides AI systems with the ability to interact with JIRA data. It enables features like issue searching, epic management, comment handling, and relationship tracking through a clean API interface.

## Setup Instructions

Before using the JIRA MCP tools, you need to set up your credentials:

### Getting JIRA API Credentials

1. **Generate an API Token**:

    - Log in to your Atlassian account at [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
    - Click "Create API token"
    - Give your token a meaningful name (e.g., "Answer Agent Integration")
    - Copy the token value (you won't be able to see it again)

2. **Find Your JIRA Instance URL**:

    - This is the base URL you use to access JIRA (e.g., `https://your-company.atlassian.net`)

3. **Identify Your Email Address**:
    - Use the email associated with your Atlassian account

### Configuring Answer Agent

Configure your credentials in Answer Agent by setting these environment variables:

```
JIRA_API_TOKEN=your_api_token_here
JIRA_BASE_URL=your_jira_instance_url
JIRA_USER_EMAIL=your_email_address
```

## Available Tools

### search_issues

Search for JIRA issues using JQL (JIRA Query Language).

**Schema**:

```typescript
{
    searchString: string // JQL search string
}
```

**Use cases**:

-   Find all issues assigned to a specific user
-   Search for all open bugs in a project
-   Filter issues by priority, status, or creation date

**Example**:

```
project = "ENG" AND status = "In Progress" AND assignee = currentUser()
```

### get_epic_children

Retrieve all child issues within an epic, including their comments and relationships.

**Schema**:

```typescript
{
    epicKey: string // The key of the epic issue
}
```

**Use cases**:

-   Get all stories and tasks within a feature epic
-   Review progress of all work items in a release epic
-   Analyze comment history across an entire feature set

**Example**:

```
ENG-123
```

### get_issue

Retrieve detailed information about a specific JIRA issue including its comments, relationships, and links.

**Schema**:

```typescript
{
    issueId: string // The ID or key of the JIRA issue
}
```

**Use cases**:

-   Deep dive into a specific bug's details
-   Review the discussion history on a feature request
-   Check parent/child relationships for a work item

**Example**:

```
ENG-456
```

### create_issue

Create a new JIRA issue with specified parameters.

**Schema**:

```typescript
{
  projectKey: string, // The project key where the issue will be created
  issueType: string, // The type of issue (e.g., "Bug", "Story", "Task")
  summary: string, // The issue summary/title
  description?: string, // Optional issue description
  fields?: { // Optional additional fields
    [key: string]: any
  }
}
```

**Use cases**:

-   Create bug reports from support interactions
-   Generate new feature requests from user feedback
-   Create tasks for identified improvements

**Example**:

```json
{
    "projectKey": "ENG",
    "issueType": "Bug",
    "summary": "Application crashes when uploading large files",
    "description": "When attempting to upload files larger than 50MB, the application crashes with no error message."
}
```

### update_issue

Update the fields of an existing JIRA issue.

**Schema**:

```typescript
{
  issueKey: string, // The key of the issue to update
  fields: { // Fields to update
    [key: string]: any
  }
}
```

**Use cases**:

-   Update issue priority based on new information
-   Assign issues to appropriate team members
-   Add or update custom fields with new data

**Example**:

```json
{
    "issueKey": "ENG-789",
    "fields": {
        "priority": { "name": "High" },
        "assignee": { "name": "john.doe@example.com" }
    }
}
```

### get_transitions

Retrieve available status transitions for a JIRA issue.

**Schema**:

```typescript
{
    issueKey: string // The key of the issue to get transitions for
}
```

**Use cases**:

-   Determine valid status changes for an issue
-   Check if an issue can be moved to "Done"
-   Find the specific transition ID needed for automation

**Example**:

```
ENG-101
```

### transition_issue

Change the status of a JIRA issue by performing a transition.

**Schema**:

```typescript
{
  issueKey: string, // The key of the issue to transition
  transitionId: string, // The ID of the transition to perform
  comment?: string // Optional comment to add with the transition
}
```

**Use cases**:

-   Move issues from "In Progress" to "Done"
-   Send issues back to "To Do" with feedback
-   Mark issues as "Ready for Review" with comments

**Example**:

```json
{
    "issueKey": "ENG-101",
    "transitionId": "21",
    "comment": "This work has been completed and is ready for review."
}
```

### add_attachment

Add a file attachment to a JIRA issue.

**Schema**:

```typescript
{
  issueKey: string, // The key of the issue to add attachment to
  fileContent: string, // Base64 encoded content of the file
  filename: string // Name of the file to be attached
}
```

**Use cases**:

-   Attach screenshots of bugs
-   Add design documents to feature requests
-   Upload log files for troubleshooting

**Example**:

```json
{
    "issueKey": "ENG-202",
    "fileContent": "base64_encoded_file_content_here",
    "filename": "error_screenshot.png"
}
```

### add_comment

Add a comment to a JIRA issue.

**Schema**:

```typescript
{
  issueIdOrKey: string, // The ID or key of the issue to add the comment to
  body: string // The content of the comment (plain text)
}
```

**Use cases**:

-   Add progress updates to tracked work
-   Respond to questions on issues
-   Document implementation details or decisions

**Example**:

```json
{
    "issueIdOrKey": "ENG-303",
    "body": "I've investigated this issue and found that it's related to the recent database migration. We should revert the change to the connection pooling configuration."
}
```

## Use Cases for Developers

### Workflow Automation

Use the JIRA MCP to automate common development workflows:

1. **Issue Triage**:

    - Search for new bugs with `search_issues`
    - Update priority and assign them with `update_issue`
    - Add comments with initial analysis using `add_comment`

2. **Sprint Management**:

    - Get epic children with `get_epic_children` to track sprint progress
    - Transition completed issues with `transition_issue`
    - Create subtasks for complex stories with `create_issue`

3. **Code Review Process**:

    - Search for issues ready for review with `search_issues`
    - Add review comments with `add_comment`
    - Attach code snippets or screenshots with `add_attachment`

4. **Release Management**:
    - Track all issues in a release epic with `get_epic_children`
    - Update statuses in bulk as features are completed
    - Document release notes by aggregating issue data

### Integration Possibilities

-   Connect CI/CD pipelines to update issue status on build/deploy events
-   Link code commits to JIRA issues automatically
-   Generate daily/weekly status reports from issue data

## Use Cases for Publishers

### Content Management

1. **Editorial Workflow**:

    - Create content tasks with `create_issue`
    - Track editorial progress with custom JIRA workflows
    - Search for content ready for publication

2. **Review Cycles**:

    - Add feedback as comments with `add_comment`
    - Attach revised content with `add_attachment`
    - Transition content through editorial states

3. **Content Planning**:
    - Use epics for content themes or campaigns
    - Get all related content pieces with `get_epic_children`
    - Track dependencies between content items

### Analytics and Reporting

-   Create automated reports on content performance
-   Track publication metrics through custom fields
-   Generate executive summaries of content production

## Advanced Features

The JIRA MCP server includes these powerful capabilities:

-   **Relationship Tracking**: Automatically detects and tracks issue mentions and links
-   **ADF Conversion**: Transforms complex Atlassian Document Format into clean plain text
-   **Optimized Payloads**: Returns only the necessary data to maximize context efficiency
-   **Parent/Child Tracking**: Maintains issue hierarchy information
-   **Concurrent API Requests**: Fetches related data in parallel for performance

## Limitations

-   Search results are limited to 50 issues per request
-   Epic children are limited to 100 issues per request
-   Rate limiting may apply based on your JIRA instance configuration
