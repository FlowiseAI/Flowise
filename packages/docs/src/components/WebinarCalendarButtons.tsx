import styles from '../pages/index.module.css'
import { webinarConfig } from '@site/src/config/webinarContent'

const getCalendarStartEnd = () => {
    const start = new Date(webinarConfig.webinarDateTimeISO)
    if (Number.isNaN(start.getTime())) {
        return { startISO: '', endISO: '' }
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    return {
        startISO: format(start),
        endISO: format(end)
    }
}

export default function WebinarCalendarButtons(): JSX.Element | null {
    const { startISO, endISO } = getCalendarStartEnd()

    if (!startISO || !endISO) {
        return null
    }

    const title = encodeURIComponent('Enterprise AI Webinar: Deploy AI Agents in 4 Weeks')
    const details = encodeURIComponent(
        "Live 60-minute working session with Bradley Taylor & Adam Harris. You'll get the 4-week deployment playbook, ROI calculator, and security checklist."
    )
    const location = encodeURIComponent('Live Online Webinar')

    const googleLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}`
    const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&startdt=${startISO}&enddt=${endISO}&location=${location}`

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AnswerAI//Enterprise AI Webinar//EN\nBEGIN:VEVENT\nUID:${startISO}@theanswer.ai\nDTSTAMP:${startISO}\nDTSTART:${startISO}\nDTEND:${endISO}\nSUMMARY:Enterprise AI Webinar: Deploy AI Agents in 4 Weeks\nDESCRIPTION:Live 60-minute working session with Bradley Taylor & Adam Harris.\nLOCATION:Live Online Webinar\nEND:VEVENT\nEND:VCALENDAR`
    const icsLink = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`

    return (
        <div className={styles.calendarButtons}>
            <a href={googleLink} target='_blank' rel='noreferrer' className={styles.calendarButton}>
                Add to Google
            </a>
            <a href={outlookLink} target='_blank' rel='noreferrer' className={styles.calendarButton}>
                Add to Outlook
            </a>
            <a href={icsLink} download='enterprise-ai-webinar.ics' className={styles.calendarButton}>
                Download ICS
            </a>
            <a
                href='mailto:hello@theanswer.ai?subject=Send%20me%20the%20webinar%20recording&body=Hi%20AnswerAI%20team%2C%0A%0APlease%20email%20me%20the%20Enterprise%20AI%20webinar%20replay%20and%20updates.%0A%0AThank%20you!'
                className={styles.calendarButton}
            >
                Just send me reminders
            </a>
        </div>
    )
}
