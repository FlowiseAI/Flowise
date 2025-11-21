/**
 * HTML Templates for OAuth2 Callback Pages
 *
 * This module contains reusable HTML templates for OAuth2 authorization responses.
 * The templates provide consistent styling and behavior for success and error pages.
 */

export interface OAuth2PageOptions {
    title: string
    statusIcon: string
    statusText: string
    statusColor: string
    message: string
    details?: string
    postMessageType: 'OAUTH2_SUCCESS' | 'OAUTH2_ERROR'
    postMessageData: any
    autoCloseDelay: number
}

export const generateOAuth2ResponsePage = (options: OAuth2PageOptions): string => {
    const { title, statusIcon, statusText, statusColor, message, details, postMessageType, postMessageData, autoCloseDelay } = options

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f5f5f5;
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    max-width: 500px;
                }
                .status {
                    color: ${statusColor};
                    font-size: 1.2rem;
                    margin-bottom: 1rem;
                }
                .message {
                    color: #666;
                    margin-bottom: 1rem;
                }
                .details {
                    background: #f9f9f9;
                    padding: 1rem;
                    border-radius: 4px;
                    font-size: 0.9rem;
                    color: #333;
                    text-align: left;
                    margin-top: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="status">${statusIcon} ${statusText}</div>
                <div class="message">${message}</div>
                ${details ? `<div class="details">${details}</div>` : ''}
            </div>
            <script>
                // Notify parent window
                try {
                    if (window.opener) {
                        window.opener.postMessage(${JSON.stringify({
                            type: postMessageType,
                            ...postMessageData
                        })}, '*');
                    }
                } catch (error) {
                    console.log('Could not notify parent window:', error);
                }
                
                // Close window after delay
                setTimeout(function() {
                    window.close();
                }, ${autoCloseDelay});
            </script>
        </body>
        </html>
    `
}

export const generateSuccessPage = (credentialId: string): string => {
    return generateOAuth2ResponsePage({
        title: 'OAuth2 Authorization Success',
        statusIcon: '✓',
        statusText: 'Authorization Successful',
        statusColor: '#4caf50',
        message: 'You can close this window now.',
        postMessageType: 'OAUTH2_SUCCESS',
        postMessageData: {
            credentialId,
            success: true,
            message: 'OAuth2 authorization completed successfully'
        },
        autoCloseDelay: 1000
    })
}

export const generateErrorPage = (error: string, message: string, details?: string): string => {
    return generateOAuth2ResponsePage({
        title: 'OAuth2 Authorization Error',
        statusIcon: '✗',
        statusText: 'Authorization Failed',
        statusColor: '#f44336',
        message,
        details,
        postMessageType: 'OAUTH2_ERROR',
        postMessageData: {
            success: false,
            message,
            error
        },
        autoCloseDelay: 3000
    })
}
