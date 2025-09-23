import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { webinarConfig } from '@site/src/config/webinarContent'

import styles from '../pages/index.module.css'

interface TimeLeft {
    days: number
    hours: number
    minutes: number
    seconds: number
}

interface WebinarCountdownProps {
    className?: string
    showSeconds?: boolean
    compact?: boolean
}

export default function WebinarCountdown({ className, showSeconds = true, compact = false }: WebinarCountdownProps): JSX.Element {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    const [isExpired, setIsExpired] = useState(false)

    // Parse webinar date/time
    const getWebinarDate = () => {
        if (webinarConfig.webinarDateTimeISO) {
            const parsed = new Date(webinarConfig.webinarDateTimeISO)
            if (!Number.isNaN(parsed.getTime())) {
                return parsed
            }
        }

        // Fallback for legacy config without ISO date
        const dateStr = `${webinarConfig.webinarDate} ${webinarConfig.webinarTime}`
        const fallback = new Date(dateStr)
        return Number.isNaN(fallback.getTime()) ? new Date() : fallback
    }

    const calculateTimeLeft = (): TimeLeft => {
        const webinarDate = getWebinarDate()
        const now = new Date()
        const difference = webinarDate.getTime() - now.getTime()

        if (difference <= 0) {
            setIsExpired(true)
            return { days: 0, hours: 0, minutes: 0, seconds: 0 }
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        return { days, hours, minutes, seconds }
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        // Initial calculation
        setTimeLeft(calculateTimeLeft())

        return () => clearInterval(timer)
    }, [])

    if (isExpired) {
        return (
            <div
                className={clsx(className, styles.countdownContainer)}
                style={{
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    border: '2px solid #ff4444',
                    padding: compact ? '0.5rem' : '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}
            >
                <div style={{ fontSize: compact ? '1rem' : '1.2rem', fontWeight: 'bold', color: '#ff4444' }}>🔴 Webinar has started!</div>
                {!compact && <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>Join now or catch the replay</div>}
            </div>
        )
    }

    const formatNumber = (num: number): string => num.toString().padStart(2, '0')

    return (
        <div
            className={clsx(className, styles.countdownContainer)}
            style={{
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                border: '2px solid #00ffff',
                padding: compact ? '0.5rem' : '1rem',
                borderRadius: '8px',
                textAlign: 'center'
            }}
        >
            {!compact && <div style={{ fontSize: '1rem', marginBottom: '0.5rem', opacity: 0.9 }}>⏰ Webinar starts in:</div>}

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: compact ? '0.5rem' : '1rem',
                    flexWrap: 'wrap'
                }}
            >
                {timeLeft.days > 0 && (
                    <div className={styles.countdownUnit}>
                        <div
                            style={{
                                fontSize: compact ? '1.5rem' : '2rem',
                                fontWeight: 'bold',
                                color: '#00ffff',
                                lineHeight: 1
                            }}
                        >
                            {formatNumber(timeLeft.days)}
                        </div>
                        <div style={{ fontSize: compact ? '0.7rem' : '0.8rem', opacity: 0.8 }}>{timeLeft.days === 1 ? 'day' : 'days'}</div>
                    </div>
                )}

                <div className={styles.countdownUnit}>
                    <div
                        style={{
                            fontSize: compact ? '1.5rem' : '2rem',
                            fontWeight: 'bold',
                            color: '#00ffff',
                            lineHeight: 1
                        }}
                    >
                        {formatNumber(timeLeft.hours)}
                    </div>
                    <div style={{ fontSize: compact ? '0.7rem' : '0.8rem', opacity: 0.8 }}>{timeLeft.hours === 1 ? 'hour' : 'hours'}</div>
                </div>

                <div className={styles.countdownUnit}>
                    <div
                        style={{
                            fontSize: compact ? '1.5rem' : '2rem',
                            fontWeight: 'bold',
                            color: '#00ffff',
                            lineHeight: 1
                        }}
                    >
                        {formatNumber(timeLeft.minutes)}
                    </div>
                    <div style={{ fontSize: compact ? '0.7rem' : '0.8rem', opacity: 0.8 }}>{timeLeft.minutes === 1 ? 'min' : 'mins'}</div>
                </div>

                {showSeconds && (
                    <div className={styles.countdownUnit}>
                        <div
                            style={{
                                fontSize: compact ? '1.5rem' : '2rem',
                                fontWeight: 'bold',
                                color: '#00ffff',
                                lineHeight: 1
                            }}
                        >
                            {formatNumber(timeLeft.seconds)}
                        </div>
                        <div style={{ fontSize: compact ? '0.7rem' : '0.8rem', opacity: 0.8 }}>
                            {timeLeft.seconds === 1 ? 'sec' : 'secs'}
                        </div>
                    </div>
                )}
            </div>

            {!compact && (
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                    {webinarConfig.webinarDate} at {webinarConfig.webinarTime}
                </div>
            )}
        </div>
    )
}
