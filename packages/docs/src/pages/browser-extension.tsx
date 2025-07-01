import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'

import styles from './index.module.css'

function BrowserExtensionHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Browser Extension</h1>
                <p className={styles.heroSubtitle}>
                    Transform your browser into an AI-powered productivity hub. Access specialized sidekicks, connect to your tools, and
                    supercharge your workflow without leaving your tab.
                </p>
                <div className={styles.heroCTAs}>
                    <a
                        href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                        className={clsx(styles.ctaButton, styles.ctaPrimary)}
                    >
                        Install Extension
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/browser' className={styles.secondaryLink}>
                            📚 View Documentation
                        </a>
                        <a href='#features' className={styles.secondaryLink}>
                            🚀 Explore Features
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function CoreFeatures() {
    return (
        <section className={styles.featuresSection} id='features'>
            <div className='container'>
                <h2 className='text--center'>AI-Powered Browser Capabilities</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Everything you need to work smarter, directly in your browser
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📄</div>
                            <h3>Instant Page Summaries</h3>
                            <p>
                                Get the essence of any article, research paper, or webpage in seconds. Extract key insights and main points
                                without reading through lengthy content.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>⚡ Instant Analysis</span>
                                <span>🎯 Key Points</span>
                                <span>📊 Data Extraction</span>
                                <span>🔍 Smart Filtering</span>
                            </div>
                            <a
                                href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                                className={styles.featureCardCTA}
                            >
                                Try Summaries →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🔍</div>
                            <h3>AI-Enhanced Search</h3>
                            <p>
                                Go beyond basic web searches with AI-powered query enhancement, result analysis, and intelligent filtering
                                to find exactly what you need.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🧠 Smart Queries</span>
                                <span>📈 Result Analysis</span>
                                <span>🎯 Precision Results</span>
                                <span>💡 Context Aware</span>
                            </div>
                            <a
                                href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                                className={styles.featureCardCTA}
                            >
                                Try Enhanced Search →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🎨</div>
                            <h3>DALL-E Image Generation</h3>
                            <p>
                                Create stunning images from text descriptions directly in your browser. Perfect for presentations, social
                                media, and creative projects.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🖼️ Text-to-Image</span>
                                <span>✨ High Quality</span>
                                <span>⚡ Instant Generation</span>
                                <span>🎭 Multiple Styles</span>
                            </div>
                            <a
                                href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                                className={styles.featureCardCTA}
                            >
                                Generate Images →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🔗</div>
                            <h3>Tool Integrations</h3>
                            <p>
                                Connect to your essential tools like Salesforce, Jira, Slack, GitHub, and more. Query and interact with your
                                systems using natural language.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>💼 CRM Integration</span>
                                <span>📋 Project Tools</span>
                                <span>💬 Communication</span>
                                <span>🔧 Developer Tools</span>
                            </div>
                            <a
                                href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                                className={styles.featureCardCTA}
                            >
                                Connect Tools →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function AIModels() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <h2 className='text--center'>Choose Your AI Brain</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Access leading AI models through a single interface
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🤖</div>
                            <div className={styles.commandmentText}>
                                <strong>OpenAI Models</strong>
                                <br />
                                Access GPT-4, GPT-3.5, and specialized models for advanced reasoning, writing, and problem-solving tasks.
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🧠</div>
                            <div className={styles.commandmentText}>
                                <strong>Google Gemini</strong>
                                <br />
                                Leverage Google&apos;s advanced AI capabilities for complex analysis, multimodal understanding, and
                                sophisticated reasoning.
                            </div>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🎭</div>
                            <div className={styles.commandmentText}>
                                <strong>Anthropic Claude</strong>
                                <br />
                                Utilize Claude models for nuanced conversations, ethical reasoning, and sophisticated text analysis with
                                safety built-in.
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🦙</div>
                            <div className={styles.commandmentText}>
                                <strong>Llama & Deepseek</strong>
                                <br />
                                Access open-source models for specialized tasks, custom fine-tuning, and privacy-focused AI processing.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function UseCases() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>Transform Your Workflow</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Real-world use cases that boost productivity
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>📊</div>
                            <h3>Research & Analysis</h3>
                            <p>
                                Quickly gather information, summarize research papers, compile competitive intelligence, and generate
                                comprehensive reports.
                            </p>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>💼</div>
                            <h3>Business Operations</h3>
                            <p>
                                Streamline CRM updates, analyze project tickets, draft communications, and maintain business intelligence
                                workflows.
                            </p>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>🎨</div>
                            <h3>Creative Projects</h3>
                            <p>
                                Generate marketing visuals, create social media content, draft copy, and develop creative concepts without
                                switching tools.
                            </p>
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
                <h2>Ready to Supercharge Your Browser?</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    Join thousands of users who have transformed their browsing experience with AnswerAgent Sidekick
                </p>
                <div className={styles.heroCTAs}>
                    <a
                        href='https://chromewebstore.google.com/detail/answeragent-sidekick/cpepciclppmfljkeiodifodfkpicfaim'
                        className={clsx(styles.ctaButton, styles.ctaPrimary)}
                    >
                        Install Now - It&apos;s Free
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/browser' className={styles.secondaryLink}>
                            📖 Read Documentation
                        </a>
                        <a href='https://discord.gg/X54ywt8pzj' className={styles.secondaryLink}>
                            💬 Get Support
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function BrowserExtension(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='Browser Extension - AI Everywhere You Browse'
                description='Bring AI assistance to every website. Get page summaries, enhanced search, and access to your AI sidekicks without leaving your browser tab.'
            >
                <BrowserExtensionHero />
                <UsingAnswerAISubmenu />
                <main>
                    <CoreFeatures />
                    <AIModels />
                    <UseCases />
                    <CTASection />
                </main>
            </Layout>
        </div>
    )
}
