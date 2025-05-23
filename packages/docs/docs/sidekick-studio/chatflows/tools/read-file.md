---
description: Read files from disk using the Read File tool
---

# Read File Tool (Local Only)

## Overview

The Read File tool is a powerful feature in AnswerAI that allows you to read files directly from your computer's disk. This tool is particularly useful when you need to access and process local file contents within your workflows.

## Key Benefits

-   Easy access to local file contents
-   Seamless integration with other AnswerAI tools and workflows
-   Flexible file path configuration

## How to Use

1. Add the Read File tool to your canvas in the AnswerAI Studio.
2. Configure the tool's settings:
    - (Optional) Set the "Base Path" if you want to specify a default directory for file operations.
3. Connect the Read File tool to other nodes in your workflow.
4. When executing the workflow, provide the file path as input to the Read File tool.

<!-- TODO: Add a screenshot of the Read File tool node on the canvas -->
<figure><img src="/.gitbook/assets/screenshots/readfile.png" alt="" /><figcaption><p> Read File tool node   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

-   Always use forward slashes (/) in file paths, even on Windows systems, to ensure compatibility.
-   If you frequently access files from the same directory, set the "Base Path" to avoid repeating the full path for each file.
-   Ensure that the AnswerAI application has the necessary permissions to access the files you want to read.
-   Use relative paths when possible to make your workflows more portable across different systems.

## Troubleshooting

1. **File not found error**:

    - Double-check the file path and ensure it's correct.
    - Verify that the file exists in the specified location.
    - Check if the "Base Path" is set correctly (if used).

2. **Permission denied error**:

    - Ensure that the AnswerAI application has read permissions for the file and its parent directories.
    - Try running AnswerAI with elevated privileges if necessary.

3. **Unexpected file contents**:
    - Verify that the file is not open or locked by another application.
    - Check if the file is in the expected format (e.g., text file vs. binary file).

Remember that the Read File tool is designed to work with text-based files. For binary files or more complex file operations, you may need to use specialized tools or custom scripts within your AnswerAI workflow.
