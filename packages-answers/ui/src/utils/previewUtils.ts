export const isFullHTML = (code: string) => {
    return code.trim().toLowerCase().startsWith('<!doctype html>') || code.trim().toLowerCase().startsWith('<html')
}

export const isReactComponent = (code: string) => {
    return (
        code.includes('import') ||
        code.includes('export default') ||
        code.includes('React.') ||
        (code.includes('function') && code.includes('return'))
    )
}

// Helper to process React code
export const processReactCode = (code: string) => {
    // Common React imports to include automatically
    const defaultImports = `
        const React = window.React;
        const { useState, useEffect, useRef, useMemo, useCallback } = React;
    `

    // Remove import statements
    const codeWithoutImports = code
        .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '') // Remove import statements
        .replace(/import\s+{[^}]+}\s+from\s+['"].*['"];?/g, '') // Remove named imports
        .replace(/import\s+['"].*['"];?/g, '') // Remove side-effect imports
        .trim()

    // Extract the component name
    const componentMatch =
        codeWithoutImports.match(/export\s+default\s+(?:function\s+)?(\w+)/) ||
        codeWithoutImports.match(/function\s+(\w+)/) ||
        codeWithoutImports.match(/const\s+(\w+)\s*=/)
    const componentName = componentMatch ? componentMatch[1] : 'App'

    // Remove export statements
    const cleanedCode = codeWithoutImports
        .replace(/export\s+default\s+/, '')
        .replace(/export\s+/, '')
        .trim()

    return {
        componentName,
        processedCode: `
            ${defaultImports}

            // Component code
            ${cleanedCode}
        `
    }
}

export const getHTMLPreview = (code: string): string => {
    return `
        <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <script>
                    tailwind.config = {
                        darkMode: 'class',
                        theme: {
                            extend: {}
                        }
                    }
                </script>
                <style>
                    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
                </style>
                <script>
                    window.addEventListener('error', function(event) {
                        event.preventDefault();
                        window.parent.postMessage({
                            type: 'preview-error',
                            message: event.message
                        }, '*');
                        document.body.innerHTML = '<pre style="color: red; margin: 8px;">' + event.message + '</pre>';
                        return false;
                    });
                </script>
            </head>
            <body>
                ${code}
                <script>
                    // Handle any inline scripts
                    Array.from(document.getElementsByTagName('script')).forEach(script => {
                        if (!script.src && script !== document.currentScript) {
                            try {
                                eval(script.innerHTML);
                            } catch (error) {
                                window.parent.postMessage({
                                    type: 'preview-error',
                                    message: error.message
                                }, '*');
                                throw error;
                            }
                        }
                    });
                </script>
            </body>
        </html>
    `
}

export const getReactPreview = (code: string): string => {
    const { componentName, processedCode } = processReactCode(code)

    return `
        <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <script>
                    tailwind.config = {
                        darkMode: 'class',
                        theme: {
                            extend: {}
                        }
                    }
                </script>
                <style>
                    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
                </style>
                <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
                <script src="https://unpkg.com/@mui/material@5/umd/material-ui.development.js"></script>
                <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" rel="stylesheet" />
                <script>
                    window.addEventListener('error', function(event) {
                        event.preventDefault();
                        window.parent.postMessage({
                            type: 'preview-error',
                            message: event.message
                        }, '*');
                        document.body.innerHTML = '<pre style="color: red; margin: 8px;">' + event.message + '</pre>';
                        return false;
                    });
                </script>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    try {
                        // Setup global MUI components
                        const { 
                            Button, Box, Typography, TextField, Paper,
                            Container, Grid, Card, CardContent
                        } = window.MaterialUI;

                        // React error boundary
                        class ErrorBoundary extends React.Component {
                            constructor(props) {
                                super(props);
                                this.state = { hasError: false, error: null };
                            }

                            static getDerivedStateFromError(error) {
                                return { hasError: true, error };
                            }

                            componentDidCatch(error, errorInfo) {
                                window.parent.postMessage({
                                    type: 'preview-error',
                                    message: error.message
                                }, '*');
                            }

                            render() {
                                if (this.state.hasError) {
                                    return (
                                        <div className="p-4 text-red-500 bg-red-50 rounded">
                                            <strong> Error:</strong> {this.state.error.message}
                                        </div>
                                    );
                                }
                                return this.props.children;
                            }
                        }

                        ${processedCode}

                        ReactDOM.render(
                            <ErrorBoundary>
                                <${componentName} />
                            </ErrorBoundary>,
                            document.getElementById('root')
                        );
                    } catch (error) {
                        window.parent.postMessage({
                            type: 'preview-error',
                            message: error.message
                        }, '*');
                        throw error;
                    }
                </script>
            </body>
        </html>
    `
}
