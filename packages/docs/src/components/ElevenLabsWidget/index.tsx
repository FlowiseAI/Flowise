import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import styles from './styles.module.css'

interface ElevenLabsWidgetProps {
    variant?: 'primary' | 'secondary'
    size?: 'small' | 'medium' | 'large'
    text?: string
    disabled?: boolean
    agentId?: string
    onConversationStart?: () => void
    onConversationEnd?: () => void
}

const ElevenLabsWidget: React.FC<ElevenLabsWidgetProps> = ({
    variant = 'primary',
    size = 'large',
    text = 'Talk to an AI Agent',
    disabled = false,
    agentId = 'agent_01k03gnw7xe11btz2vprkf7ay5', // Default agent ID from the current implementation
    onConversationStart,
    onConversationEnd
}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [isActive, setIsActive] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)
    const widgetRef = useRef<HTMLDivElement>(null)

    // Load the ElevenLabs script
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
        script.async = true
        script.type = 'text/javascript'

        script.onload = () => {
            setScriptLoaded(true)
        }

        script.onerror = () => {
            setError('Failed to load ElevenLabs widget script')
        }

        // Check if script is already loaded
        const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]')
        if (existingScript) {
            setScriptLoaded(true)
        } else {
            document.head.appendChild(script)
        }

        return () => {
            // Don't remove the script on unmount as it might be used by other widgets
        }
    }, [])

    const createWidget = async () => {
        if (!scriptLoaded) {
            setError('Widget is still loading. Please try again.')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            // Create the ElevenLabs widget element
            const widgetElement = document.createElement('elevenlabs-convai')
            widgetElement.setAttribute('agent-id', agentId)

            // Customize the widget appearance
            widgetElement.setAttribute('action-text', 'Need AI workshop help?')
            widgetElement.setAttribute('start-call-text', 'Start conversation')
            widgetElement.setAttribute('end-call-text', 'End conversation')
            widgetElement.setAttribute('listening-text', 'Listening...')
            widgetElement.setAttribute('speaking-text', 'AI assistant speaking')

            // Add event listeners
            widgetElement.addEventListener('elevenlabs-convai:call', ((event: CustomEvent) => {
                console.log('ElevenLabs call started with event:', event.detail)
                setIsActive(true)
                onConversationStart?.()
            }) as EventListener)

            widgetElement.addEventListener('elevenlabs-convai:end', ((event: CustomEvent) => {
                console.log('ElevenLabs call ended with event:', event.detail)
                setIsActive(false)
                onConversationEnd?.()
            }) as EventListener)

            // Clear any existing widget and add the new one
            if (widgetRef.current) {
                widgetRef.current.innerHTML = ''
                widgetRef.current.appendChild(widgetElement)
            }

            setIsLoading(false)
        } catch (err) {
            console.error('Widget creation error:', err)
            setError('Failed to start conversation. Please try again.')
            setIsLoading(false)
        }
    }

    const endConversation = () => {
        // Find and trigger end on the widget
        const widget = widgetRef.current?.querySelector('elevenlabs-convai')
        if (widget) {
            // The widget should handle ending internally
            // This is mainly for UI state management
        }
        setIsActive(false)
        onConversationEnd?.()
    }

    useEffect(() => {
        if (!isActive && widgetRef.current) {
            widgetRef.current.innerHTML = ''
        }
    }, [isActive])

    if (error) {
        return (
            <div className={styles.widgetContainer}>
                <button
                    className={clsx(styles.widgetButton, styles[variant], styles[size], styles.error)}
                    onClick={createWidget}
                    disabled={disabled}
                >
                    <span className={styles.buttonIcon}>📞</span>
                    Try Again
                </button>
                <div className={styles.errorMessage}>{error}</div>
            </div>
        )
    }

    if (isActive) {
        return (
            <div className={styles.widgetContainer}>
                <button className={clsx(styles.widgetButton, styles.danger, styles[size])} onClick={endConversation}>
                    <span className={styles.buttonIcon}>📞</span>
                    End Call
                </button>
                <div ref={widgetRef} className={styles.widgetElement} />
            </div>
        )
    }

    return (
        <div className={styles.widgetContainer}>
            <button
                className={clsx(styles.widgetButton, styles[variant], styles[size], {
                    [styles.loading]: isLoading,
                    [styles.disabled]: disabled || !scriptLoaded
                })}
                onClick={createWidget}
                disabled={isLoading || !scriptLoaded || disabled}
            >
                <span className={styles.buttonIcon}>{isLoading ? '⏳' : '🤖'}</span>
                {isLoading ? 'Connecting...' : !scriptLoaded ? 'Loading Widget...' : text}
            </button>
            <div ref={widgetRef} className={styles.widgetElement} />
        </div>
    )
}

export default ElevenLabsWidget
