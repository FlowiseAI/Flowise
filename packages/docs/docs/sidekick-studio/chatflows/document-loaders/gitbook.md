---
description: Load and process documentation from GitBook
---

# GitBook Document Loader

## Overview

The GitBook Document Loader is a powerful feature in AnswerAI that allows you to import and process documentation from GitBook websites. This tool is particularly useful for organizations that use GitBook for their documentation and want to integrate it into their AnswerAI workflows.

## Key Benefits

-   Easily import documentation from GitBook websites
-   Option to load content from a single page or an entire GitBook site
-   Customize metadata and content processing for your specific needs

## How to Use

1. In the AnswerAI interface, locate and select the "GitBook" option from the Document Loaders category.

<!-- TODO: Screenshot of the GitBook loader in the AnswerAI interface -->
<figure><img src="/.gitbook/assets/screenshots/gitbookloader.png" alt="" /><figcaption><p> Gitbook Loader &#x26; Drop UI</p></figcaption></figure>

2. Configure the GitBook loader with the following settings:

    a. **Web Path**: Enter the URL of the GitBook page or site you want to load. For example:

    - To load a single page: `https://docs.gitbook.com/product-tour/navigation`
    - To load an entire site: `https://docs.gitbook.com/`

    b. **Should Load All Paths**: Toggle this option on if you want to load content from all pages in the GitBook site. Leave it off to load only the specified page.

    c. **Text Splitter** (optional): Select a text splitter if you want to break down the loaded content into smaller chunks.

    d. **Additional Metadata** (optional): Add any custom metadata as a JSON object to be included with the loaded documents.

    e. **Omit Metadata Keys** (optional): Specify any default metadata keys you want to exclude from the loaded documents.

3. Click "Run" or "Save" to execute the GitBook loader with your specified settings.

<!-- TODO: Screenshot of the configured GitBook loader settings -->
<figure><img src="/.gitbook/assets/screenshots/gitbookloaderinaworkflow.png" alt="" /><figcaption><p> Gitbook Loader Configuration &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. When loading an entire GitBook site, be mindful of the amount of content you're importing. Large sites may take longer to process.

2. Use the Text Splitter option if you plan to use the loaded content with AI models that have token limits.

3. Leverage the Additional Metadata feature to add relevant information to your documents, such as author, date, or category.

4. Use the Omit Metadata Keys option to remove any sensitive or unnecessary information from the imported documents.

## Troubleshooting

1. **Issue**: The loader fails to import content
   **Solution**: Double-check the Web Path URL and ensure you have internet access. Verify that the GitBook site is publicly accessible.

2. **Issue**: Loading takes too long
   **Solution**: If you're loading an entire site, try loading specific pages instead. You can also use the Text Splitter to process content in smaller chunks.

3. **Issue**: Imported content is missing expected metadata
   **Solution**: Review your Omit Metadata Keys settings to ensure you haven't accidentally excluded important metadata fields.

By using the GitBook Document Loader, you can easily integrate your existing GitBook documentation into AnswerAI, enhancing your ability to process and analyze your content effectively.
