import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const callStartRef = useRef<number | null>(null)
    const timerRef = useRef<number | null>(null)
    const conversation = useConversation({
        onConnect: () => {
            setHasStarted(true)
            setHasEnded(false)
            callStartRef.current = Date.now()
            setElapsedSeconds(0)
            onConversationStart?.()
        },
        onDisconnect: () => {
            if (hasStarted) setHasEnded(true)
            if (timerRef.current) {
                window.clearInterval(timerRef.current)
                timerRef.current = null
            }
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

    useEffect(() => {
        if (conversation.status === 'connecting' || conversation.status === 'connected') {
            setHasEnded(false)
        }
    }, [conversation.status])

    useEffect(() => {
        if (conversation.status === 'connected') {
            if (!timerRef.current) {
                timerRef.current = window.setInterval(() => {
                    if (callStartRef.current) {
                        setElapsedSeconds(Math.floor((Date.now() - callStartRef.current) / 1000))
                    }
                }, 1000)
            }
        } else {
            if (timerRef.current) {
                window.clearInterval(timerRef.current)
                timerRef.current = null
            }
        }

        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [conversation.status])

    const [floatingContainer, setFloatingContainer] = useState<HTMLElement | null>(null)

    useEffect(() => {
        if (inline) {
            return
        }

        if (typeof document === 'undefined') {
            return
        }

        const node = document.createElement('div')
        node.className = styles.floatingRoot
        document.body.appendChild(node)
        setFloatingContainer(node)

        return () => {
            document.body.removeChild(node)
            setFloatingContainer(null)
        }
    }, [inline])

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

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

    const isConnected = conversation.status === 'connected'
    const isConnecting = conversation.status === 'connecting'

    const renderCallPanel = (inlineMode = false) => (
        <div
            className={clsx(styles.callPanel, inlineMode && styles.callPanelInline, variant === 'chip' && styles.callPanelChip)}
            role='status'
            aria-live='polite'
        >
            <div className={styles.callHeader}>
                <span className={styles.callDot} aria-hidden='true' />
                <span className={styles.callLabel}>Live with AnswerAgent</span>
                <span className={styles.callTimer}>{formatDuration(elapsedSeconds)}</span>
            </div>
            <div className={styles.callWave} aria-hidden='true'>
                <span />
                <span />
                <span />
            </div>
            <button onClick={endCall} className={clsx(styles.widgetButton, styles.danger, styles.callAction)}>
                End Call
            </button>
        </div>
    )

    const renderStatus = () => {
        if (!showStatus) {
            return null
        }

        if (isConnected) {
            return null
        }

        return (
            <div className={styles.statusArea} role='status' aria-live='polite'>
                {isConnecting && (
                    <div className={styles.connectingNotice}>
                        <span className={styles.connectingSpinner} aria-hidden='true' />
                        <span>Connecting to AnswerAgent…</span>
                    </div>
                )}
                {error && <div className={styles.errorText}>{error}</div>}
                {hasStarted && hasEnded && !error && <div className={styles.endedText}>Call ended. Restart anytime.</div>}
            </div>
        )
    }

    if (inline) {
        return isConnected ? (
            renderCallPanel(true)
        ) : (
            <div className={styles.inlineContainer}>
                <button onClick={startCall} disabled={isConnecting} className={buttonClass}>
                    {variant === 'chip' && emoji && <span className={styles.chipEmoji}>{emoji}</span>}
                    {isConnecting ? 'Connecting…' : text}
                </button>
                {renderStatus()}
            </div>
        )
    }

    const floatingPanel = isConnected && floatingContainer ? createPortal(renderCallPanel(), floatingContainer) : null

    return (
        <div className={clsx(styles.widgetWrapper, wrapperClassName)}>
            {floatingPanel}
            {isConnected ? (
                <div className={styles.floatingPlaceholder}>
                    <span role='status' aria-live='polite'>
                        Live call active — controls are docked bottom right.
                    </span>
                </div>
            ) : (
                <>
                    <button onClick={startCall} disabled={isConnecting} className={buttonClass}>
                        {variant === 'chip' && emoji && <span className={styles.chipEmoji}>{emoji}</span>}
                        {isConnecting ? 'Connecting…' : text}
                    </button>
                    {renderStatus()}
                </>
            )}
        </div>
    )
}

export default ElevenLabsInlineWidget
