import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'

import styles from './index.module.css'

function CreatorsHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Your Art Matters. Your Voice Matters. Your Choice Matters.</h1>
                <p className={styles.heroSubtitle}>
                    A Call to Creators for Ethical AI. Help us build the world&apos;s first 100% ethically curated models that respect your
                    work and pay you fairly.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='#join-waitlist' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Join the Creator Alliance
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#the-problem' className={styles.secondaryLink}>
                            🎨 The Problem
                        </a>
                        <a href='#our-solution' className={styles.secondaryLink}>
                            ✨ Our Solution
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function OpeningHook() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)} id='the-problem'>
            <div className='container'>
                <div className='row'>
                    <div className='col col--12'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)} style={{ textAlign: 'center' }}>
                            <div className={styles.comingSoonIcon}>💔</div>
                            <div className={styles.commandmentText}>
                                <h2 style={{ color: '#ff00ff', marginBottom: '1.5rem' }}>You Didn&apos;t Choose This.</h2>
                                <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                                    Your work was taken without permission. Your style was copied without credit. Your livelihood was
                                    threatened by models trained on stolen creativity.
                                </p>
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                                    <strong style={{ color: '#00ffff' }}>
                                        You want to use AI ethically, we want to as well, but the choices are few.
                                    </strong>{' '}
                                    You&apos;re forced to choose between falling behind or compromising your values.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function OriginalSinSection() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>AI's Original Sin</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    The foundation was built on theft—but it doesn't have to stay that way
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.comingSoonIcon}>⚖️</div>
                            <h3>The Current Reality</h3>
                            <p>
                                Major AI companies built their models by scraping billions of creative works without consent, compensation,
                                or credit. Artists discovered their life's work powering systems that could replace them.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🚫 No consent required</span>
                                <span>💸 Zero compensation</span>
                                <span>🔍 No transparency</span>
                                <span>❌ No artist control</span>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.comingSoonIcon}>✨</div>
                            <h3>What We're Building</h3>
                            <p>
                                The first AI platform where every image, video, and audio sample is ethically sourced. Where creators are
                                compensated fairly. Where you control how your work is used.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>✅ Full consent required</span>
                                <span>💰 Fair compensation</span>
                                <span>🔬 Complete transparency</span>
                                <span>🎯 Creator control</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='text--center' style={{ marginTop: '3rem' }}>
                    <a
                        href='/blog/original-sin'
                        className={clsx(styles.ctaButton, styles.secondaryLink)}
                        style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
                    >
                        📖 Read &quot;Original Sin&quot; - The Full Story
                    </a>
                </div>
            </div>
        </section>
    )
}

function OurSolution() {
    return (
        <section className={styles.featuresSection} id='our-solution'>
            <div className='container'>
                <h2 className='text--center'>A Different Path Forward</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Three pillars of ethical AI that puts creators first
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>1</div>
                            <h3>Verifiable Origins</h3>
                            <p>
                                Every piece of training data is tracked from source to model. Blockchain-verified provenance ensures your
                                work is never stolen again.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🔗 Blockchain verification</span>
                                <span>📜 Immutable records</span>
                                <span>🔍 Full audit trails</span>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>2</div>
                            <h3>Fair Compensation</h3>
                            <p>
                                Automated royalty distribution based on usage. The more your work contributes to model outputs, the more you
                                earn—automatically and transparently.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>💰 Usage-based royalties</span>
                                <span>⚡ Automatic payments</span>
                                <span>📊 Transparent metrics</span>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>3</div>
                            <h3>Creator Control</h3>
                            <p>
                                You decide how your work is used. Set boundaries, choose applications, and withdraw consent at any time.
                                Your art, your rules.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🎛️ Granular controls</span>
                                <span>🚫 Opt-out anytime</span>
                                <span>📋 Usage restrictions</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function WhyNow() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <h2 className='text--center'>Why This Matters Now</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    The window for ethical AI is closing—but it's not closed yet
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>⏰</div>
                            <div className={styles.commandmentText}>
                                <strong>The Current Landscape</strong>
                                <br />
                                Want to use ethically sourced AI for your creative work? Your options are essentially zero. Every major
                                model was built on stolen art, and the few "ethical" alternatives lack the quality to compete.
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🚀</div>
                            <div className={styles.commandmentText}>
                                <strong>Our Opportunity</strong>
                                <br />
                                We can build something better. A model trained exclusively on ethically sourced content that rivals or
                                exceeds the quality of those built on theft. Prove that doing right doesn't mean falling behind.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function JoinWaitlist() {
    return (
        <section className={styles.featuresSection} id='join-waitlist'>
            <div className='container'>
                <h2 className='text--center'>Join the Creator Alliance</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Help us build the ethical AI models the world needs
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🎨</div>
                            <h3>For Artists & Creators</h3>
                            <p>
                                Submit your original work to train ethical models. Set your terms, track your impact, and earn fair
                                compensation for every use.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📝 Original artwork submission</span>
                                <span>💰 Revenue sharing</span>
                                <span>📊 Usage analytics</span>
                                <span>🎛️ Full control</span>
                            </div>
                            <a
                                href='https://share.hsforms.com/your-hubspot-form-id'
                                className={styles.featureCardCTA}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Submit Your Work →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🤝</div>
                            <h3>For Ethical AI Users</h3>
                            <p>
                                Support the movement for ethical AI. Get early access to models trained only on consented, compensated
                                creative work.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🌟 Early access</span>
                                <span>✅ Ethical guarantee</span>
                                <span>📜 Full transparency</span>
                                <span>💡 Creator stories</span>
                            </div>
                            <a
                                href='https://share.hsforms.com/your-hubspot-form-id'
                                className={styles.featureCardCTA}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Join the Waitlist →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function ClosingRally() {
    return (
        <section className={clsx(styles.missionSection, styles.ctaSection)}>
            <div className='container text--center'>
                <h2>This Is Our Moment to Choose Differently</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    To prove that ethical AI isn't just possible—it's better
                </p>
                <div className='row' style={{ marginBottom: '3rem' }}>
                    <div className='col col--12'>
                        <div
                            className={clsx(styles.commandment, styles.comingSoonCard)}
                            style={{ textAlign: 'center', border: '2px solid #ff00ff' }}
                        >
                            <div className={styles.commandmentText}>
                                <h3 style={{ color: '#ff00ff', marginBottom: '1rem' }}>Your creativity is not disposable.</h3>
                                <h3 style={{ color: '#00ffff', marginBottom: '1.5rem' }}>Your consent is not optional.</h3>
                                <p style={{ fontSize: '1.2rem', lineHeight: '1.8' }}>
                                    <strong>Together, we can build AI that enhances human creativity instead of replacing it.</strong>
                                    <br />
                                    That compensates artists instead of exploiting them.
                                    <br />
                                    That asks permission instead of taking without consent.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.heroCTAs}>
                    <a
                        href='https://share.hsforms.com/your-hubspot-form-id'
                        className={clsx(styles.ctaButton, styles.ctaPrimary)}
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        Join the Creator Alliance Today
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/blog/original-sin' className={styles.secondaryLink}>
                            📖 Read "Original Sin"
                        </a>
                        <a href='https://discord.gg/X54ywt8pzj' className={styles.secondaryLink}>
                            💬 Join Discord
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Creators(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <div data-theme='dark'>
            <Layout
                title='Creators - Help Us Build Ethical AI That Respects Your Work'
                description="Join the Creator Alliance. Help build the world's first 100% ethically curated AI models that pay creators fairly and respect consent. Your art matters. Your voice matters. Your choice matters."
            >
                <CreatorsHero />
                <main>
                    <OpeningHook />
                    <OriginalSinSection />
                    <OurSolution />
                    <WhyNow />
                    <JoinWaitlist />
                    <ClosingRally />
                </main>
            </Layout>
        </div>
    )
}
