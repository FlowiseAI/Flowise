---
description: Load and process documents from Google Drive in AnswerAgentAI
---

# Google Drive Document Loader

## Overview

The Google Drive Document Loader allows you to extract and process content from files stored in your Google Drive. This versatile integration supports multiple file formats and provides flexible processing options, making it ideal for knowledge base creation, document analysis, and content management workflows.

## Key Benefits

-   Support for multiple file formats (Google Docs, PDFs, Spreadsheets, plain text)
-   Selective file processing with file picker interface
-   Automatic format conversion for Google Workspace files
-   Configurable PDF processing options
-   Rich metadata extraction including file properties

## Supported File Types

| File Type         | Description              | Processing Method                  |
| ----------------- | ------------------------ | ---------------------------------- |
| **Google Docs**   | Native Google documents  | Converted to plain text            |
| **Google Sheets** | Spreadsheets and data    | Converted to CSV format            |
| **PDF Files**     | Portable Document Format | PDF parsing with page/file options |
| **Text Files**    | Plain text documents     | Direct text extraction             |
| **Other Formats** | Various document types   | Best-effort text extraction        |

## Prerequisites

Before using the Google Drive Document Loader, ensure you have:

1. **Google OAuth Configured** - Follow the [Google OAuth Setup Guide](../../../developers/authorization/google-oauth.md)
2. **Required Scopes** - Your OAuth application must include:
    - `https://www.googleapis.com/auth/drive.readonly`
    - `https://www.googleapis.com/auth/drive.file` (for app-created files)

## How to Use

### Step 1: Add Google Drive Document Loader

1. **Locate the Node**

    - Navigate to the Document Loaders section in the node library
    - Find and drag the "Google Drive" node onto your canvas

2. **Connect Credential**
    - In the node configuration, click "Connect Credential"
    - Select your existing Google OAuth credential or create a new one
    - If creating new, you'll be redirected to Google for authorization

### Step 2: Select Files

1. **File Selection Interface**

    - Once your credential is connected, a file picker will appear
    - Browse your Google Drive folders and files
    - The interface shows:
        - File names and types
        - File icons for easy identification
        - Folder navigation
        - Recent files access

2. **Choose Files**

    - Select individual files or multiple files
    - You can choose files from different folders
    - Selected files will be listed with their paths

3. **File Management**
    - Remove files from selection if needed
    - Verify file access permissions
    - Check file sizes for processing planning

### Step 3: Configure Processing Options

#### PDF Usage Options

For PDF files, choose how to process the content:

-   **One document per page** (Default)

    -   Each PDF page becomes a separate document
    -   Better for: Page-specific content, citations, detailed analysis
    -   Use when: You need to reference specific pages

-   **One document per file**
    -   Entire PDF becomes a single document
    -   Better for: Overall document understanding, summarization
    -   Use when: PDF pages are part of a cohesive document

#### Text Splitter (Optional)

-   **Purpose:** Breaks large documents into smaller, manageable chunks
-   **Recommended for:**
    -   Large Google Docs or PDFs
    -   Spreadsheets with extensive data
    -   Better vector search performance
-   **Types:** Choose based on your content type (character, token, or semantic splitting)

### Step 4: Advanced Configuration

#### Additional Metadata

Add custom metadata to enhance document organization:

```json
{
    "department": "marketing",
    "project": "q4-campaign",
    "processed_date": "2024-01-15",
    "priority": "high"
}
```

#### Omit Metadata Keys

Control which metadata fields to include:

-   **Available metadata fields:**

    -   `source`: Google Drive URL reference
    -   `fileId`: Unique Google Drive file ID
    -   `fileName`: Original file name
    -   `iconUrl`: File type icon URL
    -   `mimeType`: File MIME type
    -   `lastModified`: Last modification timestamp (sync mode)

-   **Options:**
    -   Comma-separated list: `fileId,iconUrl`
    -   Use `*` to omit all metadata except Additional Metadata

## File Processing Details

### Google Docs Processing

-   **Conversion:** Google Docs are exported as plain text
-   **Formatting:** Basic text formatting is preserved
-   **Images:** Text descriptions are included where available
-   **Links:** Link text is preserved, URLs may be included

### Google Sheets Processing

-   **Format:** Converted to CSV format for processing
-   **Structure:** Row and column data maintained
-   **Multiple Sheets:** Each sheet processed separately
-   **Data Types:** Numbers, text, and formulas included

### PDF Processing

-   **Text Extraction:** Uses advanced PDF parsing
-   **Images:** Text within images not extracted (OCR not included)
-   **Layout:** Attempts to preserve document structure
-   **Pages:** Page boundaries maintained in page-per-document mode

### Other File Types

-   **Best Effort:** AnswerAgentAI attempts to extract readable text
-   **Encoding:** UTF-8 encoding assumed
-   **Binary Files:** May not process correctly if containing binary data

## Use Cases

### Knowledge Base Creation

```yaml
Configuration:
    Files: ['Company Handbook.pdf', 'Process Documents/', 'FAQ.docx']
    PDF Usage: 'One document per page'
    Text Splitter: Enabled
    Additional Metadata: { 'category': 'knowledge_base' }

Purpose: Build searchable knowledge base from company documents
```

### Project Documentation

```yaml
Configuration:
    Files: ['Project Plans/', 'Meeting Notes/', 'Specifications.pdf']
    PDF Usage: 'One document per file'
    Text Splitter: Semantic splitting
    Additional Metadata: { 'project': 'alpha', 'team': 'engineering' }

Purpose: Create project-specific document repository
```

### Research Analysis

```yaml
Configuration:
    Files: ['Research Papers/', 'Data Sheets/']
    PDF Usage: 'One document per page'
    Text Splitter: Character splitting (1000 chars)
    Omit Metadata: 'iconUrl,mimeType'

Purpose: Analyze research documents with page-level granularity
```

## Tips and Best Practices

### File Organization

1. **Folder Structure**

    - Organize files logically in Google Drive before selection
    - Use descriptive folder names
    - Consider access permissions for shared folders

2. **File Naming**

    - Use clear, descriptive file names
    - Include version numbers if applicable
    - Avoid special characters that might cause issues

3. **File Selection Strategy**
    - Start with a small subset for testing
    - Group related files for batch processing
    - Consider file sizes and processing time

### Performance Optimization

1. **Large File Handling**

    - Enable text splitter for files larger than 100KB
    - Consider PDF page-level processing for large PDFs
    - Monitor processing time and memory usage

2. **Batch Processing**
    - Process related files together
    - Use consistent metadata for file groups
    - Consider file modification dates for updates

### Data Management

1. **Metadata Strategy**

    - Use additional metadata for categorization
    - Include project or department information
    - Add processing timestamps for tracking

2. **Version Control**
    - Track file modification dates
    - Re-process when source files change
    - Consider automated sync for frequently updated files

## Troubleshooting

### Common Issues

1. **"Failed to retrieve credentials"**

    - **Solution:** Reconnect your Google OAuth credential
    - **Check:** Ensure the credential has Drive API access
    - **Verify:** OAuth scopes include drive.readonly

2. **"File not found" or "Access denied"**

    - **Check:** File still exists in Google Drive
    - **Verify:** You have access permissions to the file
    - **Try:** Re-select the file in the file picker

3. **"Download failed" errors**

    - **Cause:** Large files or network issues
    - **Solution:** Try processing smaller files first
    - **Check:** Your internet connection stability

4. **"Unsupported file format"**

    - **Support:** Not all file types are supported
    - **Alternative:** Convert to supported format in Google Drive
    - **Workaround:** Export Google Workspace files as supported formats

5. **Empty or garbled content**
    - **PDF Issues:** Try different PDF usage options
    - **Encoding:** Ensure files use UTF-8 encoding
    - **Binary Files:** Verify files contain readable text

### Performance Issues

1. **Slow Processing**

    - Reduce number of files processed simultaneously
    - Use text splitter for very large documents
    - Check file sizes before processing

2. **Memory Issues**

    - Process files in smaller batches
    - Increase text splitter chunk size
    - Monitor system resources

3. **Rate Limiting**
    - Google Drive API has usage limits
    - Wait between large batch operations
    - Consider upgrading Google Cloud quotas if needed

## Integration Examples

### Document Search System

1. Google Drive Document Loader → Text Splitter → Vector Store → Retrieval QA
2. Use for: Searchable company document repository

### Content Analysis Pipeline

1. Google Drive Document Loader → Chat Model → Summary Generator
2. Use for: Automated document summarization and insights

### Knowledge Extraction

1. Google Drive Document Loader → Custom Processing → Knowledge Graph
2. Use for: Extracting structured information from documents

## Sync and Refresh Capabilities

The Google Drive Document Loader includes built-in sync capabilities:

-   **Automatic Detection:** Identifies when source files have been modified
-   **Incremental Updates:** Only processes changed files
-   **Metadata Tracking:** Maintains last modification timestamps
-   **Efficient Processing:** Avoids re-processing unchanged content

To enable sync:

1. Use the `syncAndRefresh` method instead of `init`
2. Metadata will include `lastModified` timestamps
3. Compare timestamps to determine if re-processing is needed

## Security and Privacy

### Access Control

-   **Credential Isolation:** Each user's credential only accesses their files
-   **Scope Limitation:** OAuth scopes limit access to necessary permissions
-   **File Permissions:** Respects Google Drive sharing and permission settings

### Data Privacy

-   **Local Processing:** File content processed locally in AnswerAgentAI
-   **No Storage:** Original files not permanently stored
-   **Metadata Only:** Only necessary metadata retained
-   **Compliance:** Follow your organization's data handling policies

## Next Steps

After setting up Google Drive document loading:

1. **Configure Vector Storage** - Store processed documents for search
2. **Set up Text Splitting** - Optimize for your document types
3. **Add Retrieval Systems** - Enable question-answering over documents
4. **Implement Sync** - Set up regular document updates

---

**Related Documentation:**

-   [Google OAuth Setup](../../../developers/authorization/google-oauth.md)
-   [Text Splitters](../text-splitters/README.md)
-   [Vector Stores](../vector-stores/README.md)
-   [PDF Document Loader](./pdf-file.md)
