---
description: Load and process emails from Gmail in AnswerAgentAI
---

# Gmail Document Loader

## Overview

The Gmail Document Loader enables you to extract and process email content from your Gmail account. This powerful integration allows you to bring email data into your AnswerAgentAI workflows, making it ideal for customer support analysis, email processing automation, and knowledge base creation from email conversations.

## Key Benefits

-   Access emails from specific Gmail labels/folders
-   Process email threads with complete conversation history
-   Extract email metadata (sender, subject, date, etc.)
-   Handle both HTML and plain text email content
-   Configurable message limits and filtering options

## Prerequisites

Before using the Gmail Document Loader, ensure you have:

1. **Google OAuth Configured** - Follow the [Google OAuth Setup Guide](../../../developers/authorization/google-oauth.md)
2. **Required Scopes** - Your OAuth application must include:
    - `https://www.googleapis.com/auth/gmail.readonly`
    - `https://www.googleapis.com/auth/gmail.modify` (if you need to mark emails as read)

## How to Use

### Step 1: Add Gmail Document Loader

1. **Locate the Node**

    - Navigate to the Document Loaders section in the node library
    - Find and drag the "Gmail" node onto your canvas

2. **Connect Credential**
    - In the node configuration, click "Connect Credential"
    - Select your existing Google OAuth credential or create a new one
    - If creating new, you'll be redirected to Google for authorization

### Step 2: Select Gmail Labels

1. **Label Selection Interface**

    - Once your credential is connected, the label picker will load
    - You'll see all available Gmail labels including:
        - System labels (Inbox, Sent, Drafts, etc.)
        - Custom labels you've created
        - Labels with visual indicators showing label type

2. **Refresh Labels**

    - Use the "Refresh Labels" button to reload available labels
    - This is helpful if you've recently created new labels in Gmail

3. **Choose Labels**
    - Select one or multiple labels to process
    - Each selected label will be processed separately
    - Popular choices include "Inbox", "Sent", or custom project labels

### Step 3: Configure Processing Options

#### Max Messages

-   **Purpose:** Limits the number of messages retrieved per label
-   **Default:** 100 messages
-   **Recommendation:** Start with a smaller number (10-50) for testing

#### Include Threads

-   **Purpose:** Includes entire conversation threads for each email
-   **Default:** false (disabled)
-   **When to use:** Enable for customer support scenarios where context matters
-   **Note:** This significantly increases the amount of data processed

#### Text Splitter (Optional)

-   **Purpose:** Breaks large email content into smaller, manageable chunks
-   **When to use:**
    -   Processing long email conversations
    -   Improving vector search performance
    -   Working with large email volumes

### Step 4: Advanced Configuration

#### Additional Metadata

-   Add custom metadata fields to your email documents
-   Useful for categorization and filtering
-   Example:
    ```json
    {
        "department": "support",
        "priority": "high",
        "processed_date": "2024-01-15"
    }
    ```

#### Omit Metadata Keys

-   **Purpose:** Exclude specific metadata fields from the final documents
-   **Options:**
    -   Comma-separated list: `threadId,labelId`
    -   Use `*` to omit all metadata except Additional Metadata
-   **Available metadata fields:**
    -   `source`: Gmail URL reference
    -   `messageId`: Unique Gmail message ID
    -   `threadId`: Gmail thread ID
    -   `labelId`: Label ID where message was found
    -   `labelName`: Human-readable label name
    -   `subject`: Email subject line
    -   `from`: Sender information
    -   `to`: Recipient information
    -   `date`: Email timestamp

## Understanding Email Processing

### Content Formatting

The Gmail loader formats email content in a readable structure:

```
Subject: [Email Subject]
From: [Sender Name] <sender@email.com>
To: [Recipient Name] <recipient@email.com>
Date: [Email Date]

[Email Body Content]

--- THREAD --- (if Include Threads is enabled)

From: [Previous Sender]
Date: [Previous Date]
[Previous Email Content]
```

### Thread Processing

When "Include Threads" is enabled:

-   The primary email content appears first
-   Thread messages are appended with clear separators
-   Each thread message includes sender and date information
-   Chronological order is maintained

## Use Cases

### Customer Support Analysis

```yaml
Configuration:
    Labels: ['Support', 'Customer Service']
    Include Threads: true
    Max Messages: 200
    Text Splitter: Enabled (for long conversations)

Purpose: Analyze support conversations for common issues and response patterns
```

### Knowledge Base Creation

```yaml
Configuration:
    Labels: ['Important', 'Project Communications']
    Include Threads: false
    Max Messages: 500
    Additional Metadata: { 'category': 'knowledge_base' }

Purpose: Extract important information for documentation
```

### Email Analytics

```yaml
Configuration:
    Labels: ['Inbox']
    Include Threads: false
    Max Messages: 1000
    Omit Metadata: '*'

Purpose: Focus on email content analysis without metadata noise
```

## Tips and Best Practices

### Performance Optimization

1. **Start Small**

    - Begin with 10-50 messages for testing
    - Gradually increase based on processing time and needs

2. **Use Specific Labels**

    - Avoid processing entire "Inbox" unless necessary
    - Create specific labels for the content you need

3. **Text Splitter Usage**
    - Enable for email threads longer than 2000 characters
    - Use recursive character splitter for best results

### Data Management

1. **Metadata Strategy**

    - Keep relevant metadata for search and filtering
    - Use "Omit Metadata Keys" to reduce noise
    - Add custom metadata for better organization

2. **Regular Updates**
    - Re-run the loader periodically for new emails
    - Consider date-based filtering in future versions

### Security Considerations

1. **Credential Management**

    - Use separate credentials for different email accounts
    - Regularly review and rotate OAuth tokens
    - Monitor access logs in Google Console

2. **Data Privacy**
    - Be mindful of sensitive information in emails
    - Consider email content filtering before processing
    - Comply with data protection regulations

## Troubleshooting

### Common Issues

1. **"Google access token not found"**

    - **Solution:** Reconnect your Google OAuth credential
    - **Check:** Ensure the credential is properly selected in the node

2. **"Labels not loading"**

    - **Solution:** Click "Refresh Labels" button
    - **Check:** Verify your OAuth credential has the correct scopes
    - **Try:** Re-authorize the credential if refresh fails

3. **"No emails found"**

    - **Check:** Selected labels contain messages
    - **Verify:** Your Gmail account has access to the selected labels
    - **Consider:** Increasing the max messages limit

4. **"Rate limit exceeded"**

    - **Solution:** Reduce the number of messages being processed
    - **Wait:** Gmail API has rate limits; try again later
    - **Optimize:** Use more specific labels to reduce API calls

5. **"Token expired" errors**
    - **Solution:** AnswerAgentAI automatically refreshes tokens
    - **Manual fix:** Re-authorize the credential if automatic refresh fails
    - **Check:** Ensure your OAuth application is still active

### Performance Issues

1. **Slow Processing**

    - Reduce max messages limit
    - Disable thread processing if not needed
    - Use text splitter for very long emails

2. **Memory Issues**
    - Process emails in smaller batches
    - Increase text splitter chunk size
    - Monitor system resources during processing

## Integration Examples

### Basic Email Ingestion

1. Gmail Document Loader → Vector Store
2. Use for: Simple email search and retrieval

### Email Analysis Pipeline

1. Gmail Document Loader → Text Splitter → Vector Store → Retrieval QA
2. Use for: Answering questions about email content

### Support Ticket Analysis

1. Gmail Document Loader (Support label, threads enabled) → Chat Model
2. Use for: Analyzing support patterns and generating insights

## API Reference

The Gmail integration uses the Gmail API v1 with the following endpoints:

-   `users.labels.list` - Retrieve available labels
-   `users.messages.list` - Get message lists per label
-   `users.messages.get` - Retrieve individual message content
-   `users.threads.get` - Get conversation threads (when enabled)

## Next Steps

After setting up Gmail document loading:

1. **Configure Vector Storage** - Store processed emails for search
2. **Set up Retrieval** - Enable question-answering over email content
3. **Add Analysis Tools** - Use chat models to analyze email patterns
4. **Automate Processing** - Schedule regular email ingestion

---

**Related Documentation:**

-   [Google OAuth Setup](../../../developers/authorization/google-oauth.md)
-   [Text Splitters](../text-splitters/README.md)
-   [Vector Stores](../vector-stores/README.md)
