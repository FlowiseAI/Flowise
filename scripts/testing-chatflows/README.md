# AnswerAI Chatflow Testing

Test your AnswerAI chatflows with multi-turn conversations and file uploads.

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create `.env` file in project root:

    ```bash
    TESTING_CHATFLOWS_API_URL=https://prod.studio.theanswer.ai/
    TESTING_CHATFLOWS_AUTH_TOKEN=your_jwt_token
    TESTING_CHATFLOWS_REQUEST_DELAY_MS=50
    ```

3. Run tests:
    ```bash
    npm test
    ```

## Usage

```bash
# Interactive selection (default)
node testingChatflows.js

# Run all chatflows
node testingChatflows.js --all

# Run specific chatflows by ID/name
node testingChatflows.js --ids "uuid1,My Test Name,uuid3"

# With options
node testingChatflows.js --verbose --output results.json
node testingChatflows.js --file my-tests.js --no-delay
```

## Interactive Selection

By default, the script shows an interactive menu with three options:

1. **🚀 Run all chatflows** - Executes every chatflow in your file
2. **🎯 Select specific chatflows** - Multi-select with checkboxes (use Space to select, Enter to confirm)
3. **📝 Run a single chatflow** - Choose one from a list

After selecting chatflows, you'll choose the output verbosity:

-   **📋 Summary mode** - Clean, minimal output showing just success/failure status and timing
-   **🔍 Verbose mode** - Detailed responses, session IDs, full error information, and complete logs

Use arrow keys to navigate, Space to select (for multi-select), and Enter to confirm.

**Options:**

-   `--file, -f`: Test file path (default: `./chatflows.js`)
-   `--all, -a`: Run all chatflows without interactive selection
-   `--ids, -i`: Comma-separated list of chatflow IDs/names to run
-   `--verbose, -v`: Detailed logging
-   `--output, -o`: Save JSON results
-   `--no-delay`: Skip request delays
-   `--retries, -r`: Retry attempts (default: 2)
-   `--timeout, -t`: Request timeout ms (default: 30000)

## Test Format

```javascript
// chatflows.js
module.exports = [
    {
        id: 'your-chatflow-uuid',
        internalName: 'My Test',
        conversation: [
            {
                input: 'Hello!',
                files: []
            },
            {
                input: 'Analyze this image',
                files: [{ path: './assets/image.png', type: 'image/png' }]
            }
        ]
    }
]
```

**Properties:**

-   `id`: Chatflow UUID (required)
-   `internalName`: Display name for selection menu
-   `conversation`: Array of turns (required)
-   `input`: Message to send in each turn
-   `files`: Files to upload (path relative to project root)

**Note:** The `enabled` property is no longer used. Use the interactive selection menu or CLI flags to choose which chatflows to run.

## Common Issues

-   **Missing env vars**: Create `.env` with required variables
-   **404 errors**: Check chatflow UUID and ensure it's published
-   **401 errors**: Verify auth token is valid
-   **File errors**: Check file paths are correct and files exist
-   **Rate limits**: Increase `TESTING_CHATFLOWS_REQUEST_DELAY_MS`
