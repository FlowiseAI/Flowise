import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'

import styles from '../index.module.css'

function ScheduledHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <div className={styles.confirmationIcon}>✅</div>
                <h1 className={styles.heroTitle}>Workshop Consultation Scheduled!</h1>
                <p className={styles.heroSubtitle}>
                    Thank you for scheduling your AI workshop consultation. We&apos;re excited to help transform your team with cutting-edge
                    AI training.
                </p>
                <div className={styles.confirmationDetails}>
                    <div className={styles.confirmationCard}>
                        <h3>What Happens Next?</h3>
                        <div className={styles.nextSteps}>
                            <div className={styles.nextStep}>
                                <span className={styles.stepNumber}>1</span>
                                <div>
                                    <strong>Confirmation Email</strong>
                                    <p>You&apos;ll receive a confirmation email with meeting details and a calendar invite.</p>
                                </div>
                            </div>
                            <div className={styles.nextStep}>
                                <span className={styles.stepNumber}>2</span>
                                <div>
                                    <strong>Pre-Meeting Preparation</strong>
                                    <p>We&apos;ll send you a brief questionnaire to understand your team&apos;s specific needs.</p>
                                </div>
                            </div>
                            <div className={styles.nextStep}>
                                <span className={styles.stepNumber}>3</span>
                                <div>
                                    <strong>Consultation Call</strong>
                                    <p>We&apos;ll discuss your requirements and create a customized workshop proposal.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.confirmationActions}>
                    <a href='/ai-workshops' className={clsx(styles.ctaButton, styles.ctaSecondary)}>
                        Back to Workshop Details
                    </a>
                    <a href='/developers' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Talk to AI Agent Now
                    </a>
                </div>
            </div>
        </header>
    )
}

function AdditionalResourcesSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <h2 className='text--center'>While You Wait, Explore Our Resources</h2>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>📚</div>
                            <div>
                                <h3>Answer Academy</h3>
                                <p>Get a preview of our training content with free access to select courses and resources.</p>
                                <a href='/developers' className={styles.resourceLink}>
                                    Explore Academy →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎯</div>
                            <div>
                                <h3>Use Cases</h3>
                                <p>See how other teams are using AI to transform their workflows and boost productivity.</p>
                                <a href='/docs/use-cases' className={styles.resourceLink}>
                                    View Use Cases →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🤖</div>
                            <div>
                                <h3>AI Agents</h3>
                                <p>Try our AI agents to get a taste of what your team will learn to build and deploy.</p>
                                <a href='/developers' className={styles.resourceLink}>
                                    Try AI Agents →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function AIWorkshopsScheduled(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='Workshop Consultation Scheduled - AI Workshops'
                description='Your AI workshop consultation has been scheduled. Learn what happens next and explore our resources while you wait.'
            >
                <ScheduledHero />
                <UsingAnswerAISubmenu />
                <main>
                    <AdditionalResourcesSection />
                </main>
            </Layout>
        </div>
    )
}
