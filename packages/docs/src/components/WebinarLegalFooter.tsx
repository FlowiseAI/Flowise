import styles from '../pages/index.module.css'

export default function WebinarLegalFooter(): JSX.Element {
    const currentYear = new Date().getFullYear()

    return (
        <footer className={styles.legalFooter}>
            <div className='container'>
                <div>© {currentYear} AnswerAI. All rights reserved.</div>
                <div className={styles.legalLinks}>
                    <a href='/privacy-policy'>Privacy Policy</a>
                    <span aria-hidden='true'>•</span>
                    <a href='/terms-of-service'>Terms of Service</a>
                    <span aria-hidden='true'>•</span>
                    <a href='mailto:legal@theanswer.ai'>Contact Legal</a>
                </div>
            </div>
        </footer>
    )
}
