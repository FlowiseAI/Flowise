import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'

import styles from './index.module.css'

function DevelopersHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Help Us Build the Future of AI—Together</h1>
                <p className={styles.heroSubtitle}>
                    A Call to Builders for the AnswerAI Alpha Sprint. Not your data, not your soul—just your code and your conviction.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://github.com/orgs/the-answerai/repositories' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Start Building Now
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#mission' className={styles.secondaryLink}>
                            🎯 The Mission
                        </a>
                        <a href='#rewards' className={styles.secondaryLink}>
                            💰 Earn Credits
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function OpeningHook() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <div className='row'>
                    <div className='col col--12'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)} style={{ textAlign: 'center' }}>
                            <div className={styles.comingSoonIcon}>👨‍💻</div>
                            <div className={styles.commandmentText}>
                                <h2 style={{ color: '#00ffff', marginBottom: '1.5rem' }}>Hey Builders. We Need You.</h2>
                                <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                                    From now until <strong style={{ color: '#ff00ff' }}>July 21st</strong>, we&apos;re sprinting to create
                                    something that shouldn&apos;t exist according to Big Tech: a fully local AI platform that respects your
                                    privacy and amplifies your creativity.
                                </p>
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                                    <strong style={{ color: '#00ffff' }}>No surveillance. No lock-in.</strong> Just pure, ethical computing
                                    power in your hands.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function MissionBrief() {
    return (
        <section className={styles.featuresSection} id='mission'>
            <div className='container'>
                <h2 className='text--center'>The Mission Brief</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Three critical pieces for launch—developers, creators, rebels building the tools we actually want to use
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>1</div>
                            <h3>Chrome Extension</h3>
                            <p>
                                Your AI sidekick in the browser. Instant assistance on any webpage, intelligent interactions, and seamless
                                workflow integration.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🌐 Browser Integration</span>
                                <span>🤖 AI Assistance</span>
                                <span>⚡ Real-time Processing</span>
                            </div>
                            <a href='https://github.com/the-answerai/aai-browser-sidekick' className={styles.featureCardCTA}>
                                View Issues →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>2</div>
                            <h3>Web Application</h3>
                            <p>
                                The command center for your agents. Visual workflow builder, agent management, and the hub for all AI
                                interactions.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🎨 Visual Builder</span>
                                <span>📊 Agent Dashboard</span>
                                <span>🔗 API Integration</span>
                            </div>
                            <a href='https://github.com/the-answerai/theanswer' className={styles.featureCardCTA}>
                                Contribute →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>3</div>
                            <h3>Desktop Apps</h3>
                            <p>
                                Coming soon, but foundation work starts now. Native applications for true local AI processing and maximum
                                privacy.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🖥️ Native Performance</span>
                                <span>🔒 Local Processing</span>
                                <span>🏗️ Foundation Work</span>
                            </div>
                            <a href='https://github.com/the-answerai' className={styles.featureCardCTA}>
                                Coming Soon
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function PracticalPath() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <h2 className='text--center'>The Practical Path</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Getting started is dead simple—from clone to contribution in minutes
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🚀</div>
                            <div className={styles.commandmentText}>
                                <strong>1. Clone the Repo</strong>
                                <br />
                                Detailed local setup instructions ready. Get your development environment running in minutes with our
                                comprehensive setup guide.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='https://github.com/orgs/the-answerai/repositories'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Browse Repositories →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🎯</div>
                            <div className={styles.commandmentText}>
                                <strong>2. Pick an Issue</strong>
                                <br />
                                Search for the &apos;beginner&apos; tag to find your first contribution. We&apos;ve curated issues perfect
                                for getting familiar with the codebase.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='https://github.com/the-answerai/theanswer/issues'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Browse Issues →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🛠️</div>
                            <div className={styles.commandmentText}>
                                <strong>3. Build Something</strong>
                                <br />
                                Fix a bug, add a feature, improve the docs. Every contribution moves us closer to launch. Own your version.
                                Fork it. Make it yours.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='/docs/developers'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Dev Guide →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>📹</div>
                            <div className={styles.commandmentText}>
                                <strong>4. Share Your Story</strong>
                                <br />
                                Record a 1-3 minute video explaining what you built and why it matters. Show the world what happens when
                                developers build for developers.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='/docs/developers/video-guide'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Video Guide →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function RewardStructure() {
    return (
        <section className={styles.featuresSection} id='rewards'>
            <div className='container'>
                <h2 className='text--center'>This Isn't Charity Work</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Every contribution earns credits—we're tracking everything transparently
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>💎</div>
                            <h3>Earn Credits For</h3>
                            <p>
                                Your work has value, and we&apos;ll make sure you&apos;re compensated. From commits to code reviews, every
                                meaningful contribution counts.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📝 Commits that land</span>
                                <span>🔍 Thoughtful code reviews</span>
                                <span>📚 Documentation that helps</span>
                                <span>🐛 Great bug reports</span>
                            </div>
                            <a href='/docs/developers/earn-credits' className={styles.featureCardCTA}>
                                Learn More →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>⚡</div>
                            <h3>Review Process</h3>
                            <p>
                                No gatekeeping. Just quality code and aligned values. Our automated system helps you succeed with
                                AI-suggested next steps.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🤖 Automated testing</span>
                                <span>💡 AI-suggested improvements</span>
                                <span>📹 Video explanations</span>
                                <span>⚡ Fast feedback loops</span>
                            </div>
                            <a href='/docs/developers/contributing' className={styles.featureCardCTA}>
                                PR Guidelines →
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
                <h2>We Have 17 Days to Prove Something Important</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    That a small group of committed developers can build better tools than billion-dollar corporations
                </p>
                <div className='row' style={{ marginBottom: '3rem' }}>
                    <div className='col col--12'>
                        <div
                            className={clsx(styles.commandment, styles.comingSoonCard)}
                            style={{ textAlign: 'center', border: '2px solid #ff00ff' }}
                        >
                            <div className={styles.commandmentText}>
                                <h3 style={{ color: '#ff00ff', marginBottom: '1rem' }}>Not because we have more resources.</h3>
                                <h3 style={{ color: '#00ffff', marginBottom: '1.5rem' }}>
                                    But because we give a damn about the right things.
                                </h3>
                                <p style={{ fontSize: '1.2rem', lineHeight: '1.8' }}>
                                    <strong>Privacy. Creativity. Human autonomy.</strong>
                                    <br />
                                    This is our shot to build AI that serves people, not platforms.
                                    <br />
                                    To create tools that empower, not exploit.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.heroCTAs}>
                    <a href='https://github.com/orgs/the-answerai/repositories' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Let&apos;s Show Them What We Can Build
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a
                            href='https://github.com/the-answerai/issues?q=is%3Aissue+is%3Aopen+label%3Abeginner'
                            className={styles.secondaryLink}
                        >
                            🎯 Find Beginner Issues
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

// YouTubeSection moved to Learn page

function QuickReference() {
    return (
        <section className={styles.featuresSection} id='video-guide'>
            <div className='container'>
                <h2 className='text--center'>Quick Reference Card for Contributors</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Everything you need to get started and earn credits
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🚀</div>
                            <h3>Start Here</h3>
                            <div className={styles.appFeatures}>
                                <span>📂 GitHub Repository</span>
                                <span>📋 Setup Documentation</span>
                                <span>🏷️ Beginner Issues Filter</span>
                            </div>
                            <a href='https://github.com/orgs/the-answerai/repositories' className={styles.featureCardCTA}>
                                Browse Repositories →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📹</div>
                            <h3>Video Requirements</h3>
                            <div className={styles.appFeatures}>
                                <span>⏱️ 1-3 minutes long</span>
                                <span>🛠️ What you built/fixed</span>
                                <span>🎯 Problem it solves</span>
                                <span>🌟 How it serves the mission</span>
                            </div>
                            <a href='/docs/developers/video-guide' className={styles.featureCardCTA}>
                                Video Guide →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📅</div>
                            <h3>Sprint Timeline</h3>
                            <div className={styles.appFeatures}>
                                <span>⏰ Now - July 21st: Alpha Sprint</span>
                                <span>🎯 Focus: Chrome Extension & Web App</span>
                                <span>🏗️ Foundation: Desktop Architecture</span>
                            </div>
                            <a href='#mission' className={styles.featureCardCTA}>
                                View Mission →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🤝</div>
                            <h3>The Deal</h3>
                            <div className={styles.appFeatures}>
                                <span>👨‍💻 You build with us</span>
                                <span>💰 We reward your work</span>
                                <span>🚀 Together we own the future</span>
                            </div>
                            <a href='#rewards' className={styles.featureCardCTA}>
                                Learn Rewards →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Developers(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <div data-theme='dark'>
            <Layout
                title='Developers - Help Us Build the Future of AI'
                description='Join the AnswerAI Alpha Sprint. Build privacy-first AI tools that empower, not exploit. Earn credits for contributions. July 21st deadline - let us show Big Tech what committed developers can build.'
            >
                <DevelopersHero />
                <main>
                    <OpeningHook />
                    <MissionBrief />
                    <PracticalPath />
                    <RewardStructure />
                    <ClosingRally />
                    <QuickReference />
                </main>
            </Layout>
        </div>
    )
}
