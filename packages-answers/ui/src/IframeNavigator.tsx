'use client'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

interface IframeNavigatorProps {
    src: string // Initial URL for the iframe
    allowedOrigins?: string[] // List of allowed origin patterns (wildcards supported)
    debug?: boolean // Enable debug logging
}

const IframeNavigator: React.FC<IframeNavigatorProps> = ({
    src,
    allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'],
    debug = true,

    ...other
}) => {
    const [loaded, setLoaded] = useState(false)
    const [iframeUrl, setIframeUrl] = useState<string>(src)
    const pathname = usePathname()
    useEffect(() => {
        const originPatterns = allowedOrigins.map(
            (pattern) =>
                // Convert wildcard patterns to regular expressions
                new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
        )

        const handleMessage = (event: MessageEvent) => {
            // Check the origin of the message against allowed patterns
            const isOriginAllowed = originPatterns.some((pattern) => pattern.test(event.origin))

            if (!isOriginAllowed) {
                debug && console.warn(`Received message from unauthorized origin: ${event.origin}`)
                return
            }

            // Validate the message data format (expecting a string URL)
            if (typeof event.data !== 'string') {
                debug && console.warn(`Received message with unexpected data type: ${typeof event.data}`)
                return
            }

            try {
                const newUrl = new URL(event.data)
                // The current iframepath is the pathname minus the first segment
                const currentIframePath = '/' + pathname?.split('/').slice(1).join('/')
                const newPathname = '/' + pathname?.split('/')[1] + newUrl.pathname

                // Update component state and browser's URL if the pathname has changed
                if (currentIframePath !== newPathname) {
                    // setIframeUrl(newUrl.pathname);
                    // Push the new pathname to the history
                    window.history.pushState({}, '', newPathname)

                    debug && console.log(`Updated pathname to ${newPathname}`)
                }
            } catch (error) {
                debug && console.error('Error processing received message:', error)
            }
        }

        // Listen for messages posted from the iframe
        window.addEventListener('message', handleMessage)

        // Cleanup the event listener when the component unmounts
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [pathname, allowedOrigins, debug]) // Dependencies: allowedOrigins and debug flag

    return (
        <iframe
            src={iframeUrl}
            style={{
                width: '100%',
                height: '100%',
                border: 0,
                opacity: loaded ? 1 : 0,
                transition: '.1s'
            }}
            title='Iframe Navigator'
            onLoad={() => setLoaded(true)}
            allowFullScreen
            {...other}
        />
    )
}

export default IframeNavigator
