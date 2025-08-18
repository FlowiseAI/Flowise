import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import JsonLd from '@site/src/components/JsonLd'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import UsingAnswerAgentAISubmenu from '@site/src/components/UsingAnswerAgentAISubmenu'

import styles from './index.module.css'

function GettingStartedHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Start Your AI Journey Today</h1>
                <p className={styles.heroSubtitle}>
                    Transform your workflow with AI-powered productivity tools. From browser extension to intelligent chat—everything you
                    need is just minutes away.
                </p>
                <div className={styles.heroCTAs}>
                    <a
                        href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                        className={clsx(styles.ctaButton, styles.ctaPrimary)}
                    >
                        Start Free Now
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#steps' className={styles.secondaryLink}>
                            📋 See How It Works
                        </a>
                        <a href='#resources' className={styles.secondaryLink}>
                            📚 Learning Resources
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function ThreeSteps() {
    return (
        <section className={styles.featuresSection} id='steps'>
            <div className='container'>
                <h2 className='text--center'>Three Steps to AI-Powered Productivity</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    No complex setup, no learning curve—just instant AI assistance
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>1</div>
                            <h3>Install Chrome Extension</h3>
                            <p>
                                Add the AnswerAgent Sidekick to your browser. Get instant AI assistance on any webpage, with page summaries,
                                enhanced search, and tool integrations.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>⚡ 30-second install</span>
                                <span>🌐 Works everywhere</span>
                                <span>🔒 Secure & private</span>
                            </div>
                            <a
                                href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                                className={styles.featureCardCTA}
                            >
                                Install Extension →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>2</div>
                            <h3>Sign Up for Free</h3>
                            <p>
                                Create your AnswerAgentAI account and get instant access to specialized AI sidekicks, chat features, and the
                                visual Studio builder.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🆓 Completely free</span>
                                <span>📧 Email signup only</span>
                                <span>🚀 Instant access</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Sign Up Free →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>3</div>
                            <h3>Start Chatting</h3>
                            <p>
                                Choose from specialized AI sidekicks, upload documents, connect your tools, and begin transforming how you
                                work with AI assistance.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🤖 Multiple AI models</span>
                                <span>📁 Document upload</span>
                                <span>🔗 Tool connections</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Start Chatting →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function LearningResources() {
    return (
        <section className={styles.comingSoonSection}>
            <div className='container'>
                <h2 className='text--center'>Everything You Need to Get Started</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Access learning resources, community support, and developer tools
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🎓</div>
                            <div className={styles.commandmentText}>
                                <strong>AI Learning Hub</strong>
                                <br />
                                Master AI fundamentals with interactive modules, video courses, and get instant help from our Alpha browser
                                extension while using the platform.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a href='/learn' className={clsx(styles.ctaButton, styles.secondaryLink)} style={{ textTransform: 'none' }}>
                                    Start Learning →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🎥</div>
                            <div className={styles.commandmentText}>
                                <strong>Digital at Scale YouTube</strong>
                                <br />
                                Deep-dive courses on prompt engineering, building AI flows, and creating agent applications. New tutorials
                                every week from industry experts.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='https://youtube.com/@digitalatscale'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Watch Free Courses →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>💬</div>
                            <div className={styles.commandmentText}>
                                <strong>Community Support</strong>
                                <br />
                                Join thousands of AI builders sharing workflows, troubleshooting, and collaborating on the future of
                                AI-powered productivity.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='https://discord.gg/X54ywt8pzj'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Join Discord →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>📚</div>
                            <div className={styles.commandmentText}>
                                <strong>Use Cases & Examples</strong>
                                <br />
                                Explore 20 practical AI agent use cases for productivity across browser, studio, chat, and workflow
                                automation.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='/docs/use-cases'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Browse Use Cases →
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🛠️</div>
                            <div className={styles.commandmentText}>
                                <strong>Developer Resources</strong>
                                <br />
                                API documentation, integration guides, and technical resources for building custom AI solutions and
                                connecting external systems.
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <a
                                    href='/docs/developers'
                                    className={clsx(styles.ctaButton, styles.secondaryLink)}
                                    style={{ textTransform: 'none' }}
                                >
                                    Developer Docs →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function AppOverview() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>Your Complete AI Productivity Suite</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Four powerful tools working together to transform how you work
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>💬</div>
                            <h3>Chat</h3>
                            <p>
                                Your conversation hub with specialized AI assistants. Chat histories are automatically stored, switch
                                between different agents, organize knowledge bases, and manage all your AI interactions.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>💾 Stored Chat History</span>
                                <span>🔄 Switch Between Agents</span>
                                <span>📚 Knowledge Base Storage</span>
                                <span>🎯 Specialized Sidekicks</span>
                            </div>
                            <a href='/chat' className={styles.featureCardCTA}>
                                Explore Chat →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🛠️</div>
                            <h3>Sidekick Studio</h3>
                            <p>
                                Visual workflow builder for creating sophisticated AI agents. Connect new tools, import Flowise flows, and
                                build complex automation without coding.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🔗 Connect New Tools</span>
                                <span>📥 Import Flowise Flows</span>
                                <span>🎨 Visual Builder</span>
                                <span>⚡ No-Code Creation</span>
                            </div>
                            <a href='/sidekick-studio' className={styles.featureCardCTA}>
                                Try Studio →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📊</div>
                            <h3>AI-Powered Apps</h3>
                            <p>
                                Specialized applications for data transformation, image generation, and workflow automation. Upload files,
                                configure processing, and get results instantly.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📈 CSV Transformer</span>
                                <span>🎨 Image Creator</span>
                                <span>📄 Document Processing</span>
                                <span>🤖 Coming Soon: More Apps</span>
                            </div>
                            <a href='/apps' className={styles.featureCardCTA}>
                                Explore Apps →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🌐</div>
                            <h3>Browser Extension</h3>
                            <p>
                                AI assistance everywhere you browse. Get page summaries, enhanced search results, generate images, and
                                connect to your business tools—all without leaving your current tab.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📄 Page Summaries</span>
                                <span>🔍 Enhanced Search</span>
                                <span>🎨 Image Generation</span>
                                <span>🔗 Tool Integration</span>
                            </div>
                            <a href='/browser-sidekick' className={styles.featureCardCTA}>
                                Get Extension →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function CTASection() {
    return (
        <section className={clsx(styles.missionSection, styles.ctaSection)}>
            <div className='container text--center'>
                <h2>Ready to Transform Your Productivity?</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    Join thousands of users who are already working smarter with AI assistance
                </p>
                <div className={styles.heroCTAs}>
                    <a
                        href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                        className={clsx(styles.ctaButton, styles.ctaPrimary)}
                    >
                        Install Extension & Start Free
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='https://discord.gg/X54ywt8pzj' className={styles.secondaryLink}>
                            💬 Join Community
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

function DigitalAtScaleSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div style={{ textAlign: 'center' }}>
                    <div className={clsx(styles.commandment, styles.comingSoonCard, styles.subscriptionBanner)}>
                        <div className={styles.subscriptionBannerContent}>
                            <div className={clsx(styles.comingSoonIcon, styles.subscriptionBannerIcon)}>📺</div>
                            <div className={clsx(styles.commandmentText, styles.subscriptionBannerText)}>
                                <strong>Digital at Scale YouTube Channel</strong>
                                <br />
                                Learn AI fundamentals, watch weekly tutorials, and stay updated with the latest in AI development. New
                                videos every Tuesday.
                            </div>
                        </div>
                        <div className={styles.subscriptionBannerButton}>
                            <a
                                href='https://youtube.com/@digitalatscale'
                                target='_blank'
                                rel='noopener noreferrer'
                                className={clsx(styles.ctaButton, styles.ctaPrimary)}
                            >
                                Watch Free Courses →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function GettingStarted(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <div data-theme='dark'>
            <Layout
                title='Get Started with AnswerAgentAI - 3 Simple Steps'
                description='Transform your productivity in minutes. Install the Chrome extension, sign up for free, and start chatting with AI sidekicks that understand your workflow.'
            >
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'Get Started with AnswerAgent - 3 Simple Steps',
                        description:
                            'Install the Chrome extension, sign up for free, and start chatting with AI sidekicks that understand your workflow.',
                        step: [
                            { '@type': 'HowToStep', name: 'Install Extension' },
                            { '@type': 'HowToStep', name: 'Sign Up' },
                            { '@type': 'HowToStep', name: 'Start Chatting' }
                        ],
                        mainEntityOfPage: {
                            '@type': 'WebPage',
                            '@id': 'https://answeragent.ai/getting-started'
                        }
                    }}
                />
                <GettingStartedHero />
                <UsingAnswerAgentAISubmenu />
                <main>
                    <ThreeSteps />
                    <LearningResources />
                    <AppOverview />
                    <CTASection />
                    <DigitalAtScaleSection />
                </main>
            </Layout>
        </div>
    )
}
