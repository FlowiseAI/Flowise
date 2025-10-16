import { useMemo } from 'react'
import OriginalLayout from '@theme-original/Layout'
import { useLocation } from '@docusaurus/router'
import styles from './styles.module.css'

export default function Layout(props) {
    const location = useLocation()

    // Don't show banner on webinar pages
    const isWebinarPage = location.pathname.includes('webinar')

    // Calculate next Thursday dynamically
    const nextThursdayText = useMemo(() => {
        const now = new Date()
        const result = new Date(now)

        // Get day of week (0 = Sunday, 4 = Thursday)
        const currentDay = result.getDay()
        const daysUntilThursday = (4 - currentDay + 7) % 7 || 7

        // Set to next Thursday
        result.setDate(result.getDate() + daysUntilThursday)
        result.setHours(11, 0, 0, 0) // 11am local time for display

        // If we're past 11am PT on Thursday, move to next week
        if (daysUntilThursday === 0 && now > result) {
            result.setDate(result.getDate() + 7)
        }

        // Format as "Thursday, Oct 10th"
        const month = result.toLocaleDateString('en-US', { month: 'short' })
        const day = result.getDate()
        const dayWithSuffix =
            day + (day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th')

        return `Thursday, ${month} ${dayWithSuffix}`
    }, [])

    return (
        <div className={isWebinarPage ? styles.webinarPage : styles.normalPage}>
            {!isWebinarPage && (
                <div className={styles.webinarBanner}>
                    <div className={styles.webinarContent}>
                        <span className={styles.webinarBadge}>🚀 Live Weekly</span>
                        <span className={styles.webinarText}>Deploy Enterprise AI in weeks - Workshop {nextThursdayText} at 11am PT</span>
                        <a href='/webinar-enterprise-ai' className={styles.webinarCta}>
                            Register Free →
                        </a>
                    </div>
                </div>
            )}
            <OriginalLayout {...props} />
        </div>
    )
}
