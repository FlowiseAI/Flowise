import React, { useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import clsx from 'clsx'
import styles from './styles.module.css'

interface ElevenLabsInlineWidgetProps {
    agentId: string
    text?: string
    variant?: 'cta' | 'outline' | 'chip'
    emoji?: string
    buttonClassName?: string // For hero CTA style override
    wrapperClassName?: string // For controlling outer spacing
    inline?: boolean // Whether to use inline layout (no column wrapper)
    showStatus?: boolean // Whether to show status messages
    onConversationStart?: () => void
    onConversationEnd?: () => void
}

const ElevenLabsInlineWidget: React.FC<ElevenLabsInlineWidgetProps> = ({
    agentId,
    text = 'Start Voice Call',
    variant = 'cta',
    emoji,
    buttonClassName,
    wrapperClassName,
    inline = false,
    showStatus = true,
    onConversationStart,
    onConversationEnd
}) => {
    const [error, setError] = useState<string | null>(null)
    const [hasStarted, setHasStarted] = useState(false)
    const [hasEnded, setHasEnded] = useState(false)
    const conversation = useConversation({
        onConnect: () => {
            setHasStarted(true)
            setHasEnded(false)
            onConversationStart?.()
        },
        onDisconnect: () => {
            if (hasStarted) setHasEnded(true)
            onConversationEnd?.()
        },
        onError: (err: any) => setError(err?.message || String(err) || 'Unknown error')
    })

    const startCall = async () => {
        setError(null)
        setHasEnded(false)
        try {
            await conversation.startSession({
                agentId,
                connectionType: 'webrtc'
            })
        } catch (err: any) {
            setError(err?.message || String(err) || 'Failed to start call')
        }
    }

    const endCall = async () => {
        try {
            await conversation.endSession()
        } catch (err: any) {
            setError(err?.message || String(err) || 'Failed to end call')
        }
    }

    React.useEffect(() => {
        if (conversation.status === 'connecting' || conversation.status === 'connected') {
            setHasEnded(false)
        }
    }, [conversation.status])

    // Button style selection
    const buttonClass =
        variant === 'cta' && buttonClassName
            ? buttonClassName
            : clsx(
                  styles.widgetButton,
                  variant === 'cta' && styles.cta,
                  variant === 'outline' && styles.outline,
                  variant === 'chip' && styles.chip,
                  conversation.status === 'connecting' && styles.loading
              )

    if (inline) {
        return (
            <>
                {conversation.status !== 'connected' ? (
                    <button onClick={startCall} disabled={conversation.status === 'connecting'} className={buttonClass}>
                        {variant === 'chip' && emoji && <span className={styles.chipEmoji}>{emoji}</span>}
                        {conversation.status === 'connecting' ? 'Connecting...' : text}
                    </button>
                ) : (
                    <button onClick={endCall} className={clsx(styles.widgetButton, styles.danger)}>
                        End Call
                    </button>
                )}
                {showStatus && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -24,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            whiteSpace: 'nowrap',
                            fontSize: '0.875rem'
                        }}
                    >
                        {conversation.status === 'connected' && <span>Call in progress...</span>}
                        {error && <span style={{ color: '#ef4444' }}>{error}</span>}
                        {hasStarted && hasEnded && conversation.status !== 'connected' && !error && <span>Call ended.</span>}
                    </div>
                )}
            </>
        )
    }

    return (
        <div className={wrapperClassName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {conversation.status !== 'connected' ? (
                <button onClick={startCall} disabled={conversation.status === 'connecting'} className={buttonClass}>
                    {variant === 'chip' && emoji && <span className={styles.chipEmoji}>{emoji}</span>}
                    {conversation.status === 'connecting' ? 'Connecting...' : text}
                </button>
            ) : (
                <button onClick={endCall} className={clsx(styles.widgetButton, styles.danger)}>
                    End Call
                </button>
            )}
            {showStatus && (
                <div style={{ marginTop: 8, minHeight: 24 }}>
                    {conversation.status === 'connected' && <span>Call in progress...</span>}
                    {error && <span style={{ color: '#ef4444' }}>{error}</span>}
                    {hasStarted && hasEnded && conversation.status !== 'connected' && !error && <span>Call ended.</span>}
                </div>
            )}
        </div>
    )
}

export default ElevenLabsInlineWidget
