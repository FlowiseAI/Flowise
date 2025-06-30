import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'

import styles from './index.module.css'

function HomepageHeader() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <img src='img/answerai-logo-600-wide-white.png' alt='AnswerAI Logo' className={styles.heroLogo} />
                <h1 className={styles.heroTitle}>AI for all, not for the few.</h1>
                <p className={styles.heroSubtitle}>Empowering a free, creative, and decentralized future with AI.</p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Join Alpha
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a
                            href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                            target='_blank'
                            rel='noreferrer'
                            className={styles.secondaryLink}
                        >
                            <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className={styles.chromeIcon}>
                                <path d='M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29L1.931 5.47zm6.865 2.29a5.454 5.454 0 0 1 6.865 2.29l5.346-9.26A11.944 11.944 0 0 0 12 0v6.545a5.454 5.454 0 0 1 5.454 5.455c0 3.012-2.443 5.455-5.454 5.455s-5.454-2.443-5.454-5.455c0-1.513.616-2.88 1.612-3.865z' />
                            </svg>
                            Download Chrome Extension
                        </a>
                        <a href='/docs/developers/building-node' className={styles.secondaryLink}>
                            👩‍💻 Call for Developers
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function MissionSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className='row'>
                    <div className='col col--6'>
                        <h2>The Problem We Face</h2>
                        <p>
                            We live in a world where power over AI is centralized—controlled by corporations, governments, and unelected
                            technocrats. These entities harvest our data, profit from our creativity, and shape our digital reality. The
                            most powerful technology ever created is being used not to uplift, but to manipulate.
                        </p>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.videoContainer}>
                            <iframe
                                width='100%'
                                height='315'
                                src='https://www.youtube.com/embed/McrDhKBA5Ac'
                                title='AnswerAI Vision'
                                frameBorder='0'
                                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                                allowFullScreen
                                className={styles.youtubeVideo}
                            ></iframe>
                        </div>
                    </div>
                </div>
                <div className={styles.beliefsSection}>
                    <h2>The Commandments of AI Freedom</h2>
                    <div className={styles.commandments}>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>I</div>
                            <div className={styles.commandmentText}>
                                <strong>Human Autonomy Is Sacred.</strong>
                                <br />
                                No AI should ever be used to control humans. And no human should control AI in ways that violate autonomy,
                                dignity, or agency.
                            </div>
                        </div>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>II</div>
                            <div className={styles.commandmentText}>
                                <strong>Technology Must Serve the Individual.</strong>
                                <br />
                                AI should be a personal tool, not a corporate weapon. It should be deployed locally, owned individually, and
                                governed transparently.
                            </div>
                        </div>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>III</div>
                            <div className={styles.commandmentText}>
                                <strong>Creativity Is Sovereign.</strong>
                                <br />
                                Artists, thinkers, and builders must retain control over their work. No AI model should be trained on human
                                output without explicit, informed consent.
                            </div>
                        </div>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>IV</div>
                            <div className={styles.commandmentText}>
                                <strong>Privacy Is Non-Negotiable.</strong>
                                <br />
                                You should never have to trade your privacy for functionality. AnswerAI is built local-first to ensure your
                                data stays with you—and only you.
                            </div>
                        </div>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>V</div>
                            <div className={styles.commandmentText}>
                                <strong>Decentralization Is Freedom.</strong>
                                <br />A future worth living in depends on systems that are open, forkable, transparent, and global—not
                                platforms locked inside Silicon Valley monopolies.
                            </div>
                        </div>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>VI</div>
                            <div className={styles.commandmentText}>
                                <strong>Ethics ≠ Weakness.</strong>
                                <br />
                                Ethics are our advantage, not our constraint. We believe in profit—but capped, transparent, and reinvested
                                in public good.
                            </div>
                        </div>
                        <div className={styles.commandment}>
                            <div className={styles.commandmentNumber}>VII</div>
                            <div className={styles.commandmentText}>
                                <strong>The Community Owns the Future.</strong>
                                <br />
                                Technology should be built with people, not for them. The AnswerAI community is the core steward of its
                                evolution.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function FeaturesSection() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>What We&apos;re Building</h2>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <h3>Apps</h3>
                            <p>
                                Extend the power of AnswerAgent with a growing ecosystem of applications. Integrate AI seamlessly into your
                                workflows and daily tasks.
                            </p>
                            <a href='/docs/apps' className={styles.featureCardCTA}>
                                Explore Apps →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <h3>Chat Feature</h3>
                            <p>
                                Engage with your AI agents naturally through a powerful chat interface. Get instant answers, automate tasks,
                                and streamline communication.
                            </p>
                            <a href='/docs/chat' className={styles.featureCardCTA}>
                                Learn About Chat →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <h3>Chrome Extension</h3>
                            <p>
                                Bring AnswerAgent directly into your browser. Access AI capabilities, automate web tasks, and enhance your
                                online experience with ease.
                            </p>
                            <a href='/docs/browser-extension' className={styles.featureCardCTA}>
                                Get Extension →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <h3>Sidekick Studio</h3>
                            <p>
                                Design, deploy, and manage your AI agent workforce with an intuitive visual interface. Build powerful,
                                customizable AI agents without coding skills.
                            </p>
                            <a href='/docs/sidekick-studio' className={styles.featureCardCTA}>
                                Try Studio →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function MacAppTeaser() {
    return (
        <section className={styles.macAppTeaserSection}>
            <div className='container text--center'>
                <h2>Mac App Coming Soon!</h2>
                <img src='img/mac-app-icon.svg' alt='Mac App Icon' className={styles.macAppIcon} />
                <p>
                    Experience the full power of AnswerAgent natively on your Mac. A decentralized ecosystem where individuals can own their
                    digital identity, run autonomous agents, and share, monetize, or protect their data as they choose.
                </p>
            </div>
        </section>
    )
}

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={'Answer Agent AI: Build your AI-Agent Workforce'} description='Orchestrate secure AI agents across your business.'>
            <HomepageHeader />
            <main>
                <MissionSection />
                <FeaturesSection />
                <MacAppTeaser />
            </main>
        </Layout>
    )
}
