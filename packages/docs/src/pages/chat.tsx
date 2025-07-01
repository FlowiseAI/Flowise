import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'

import styles from './index.module.css'

function ChatHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Chat & Sidekicks</h1>
                <p className={styles.heroSubtitle}>
                    Your AI conversation hub with specialized assistants. Store chat histories, switch between different agents, and access
                    powerful sidekicks for every task.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai/chat' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Start Chatting
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/chat' className={styles.secondaryLink}>
                            📚 View Documentation
                        </a>
                        <a href='#features' className={styles.secondaryLink}>
                            🤖 Meet the Sidekicks
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function FeaturedSidekicks() {
    return (
        <section className={styles.featuresSection} id='features'>
            <div className='container'>
                <h2 className='text--center'>Meet Your AI Sidekicks</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Specialized AI assistants designed for specific tasks and workflows
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📊</div>
                            <h3>Data Analysts</h3>
                            <p>
                                Intelligent assistants that help you interpret and visualize complex datasets. Get insights, generate
                                reports, and discover patterns in your data with natural language queries.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📈 Data Visualization</span>
                                <span>🔍 Pattern Recognition</span>
                                <span>📋 Report Generation</span>
                                <span>💡 Smart Insights</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Try Data Analyst →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>✍️</div>
                            <h3>Content Creators</h3>
                            <p>
                                Creative assistants that help generate articles, blog posts, marketing copy, and social media content.
                                Perfect for writers, marketers, and content teams.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📝 Article Writing</span>
                                <span>📱 Social Media</span>
                                <span>📧 Email Campaigns</span>
                                <span>🎯 Brand Voice</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Try Content Creator →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>💻</div>
                            <h3>Code Assistants</h3>
                            <p>
                                Programming experts that provide code reviews, debugging help, architecture advice, and documentation
                                generation. Your pair programming partner that never sleeps.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🐛 Code Review</span>
                                <span>🔧 Debugging</span>
                                <span>📖 Documentation</span>
                                <span>🏗️ Architecture</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Try Code Assistant →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🔬</div>
                            <h3>Research Aids</h3>
                            <p>
                                Academic and business research specialists that help with literature reviews, market analysis, competitive
                                intelligence, and comprehensive research reports.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📚 Literature Review</span>
                                <span>📊 Market Analysis</span>
                                <span>🎯 Competitive Intel</span>
                                <span>📄 Report Writing</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Try Research Aid →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function ChatFeatures() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <h2 className='text--center'>Intelligent Conversation Features</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Advanced AI capabilities that make every conversation more productive
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🧠</div>
                            <div className={styles.commandmentText}>
                                <strong>Context Awareness</strong>
                                <br />
                                Sidekicks remember your conversation history and maintain context throughout sessions for natural,
                                productive interactions.
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>📎</div>
                            <div className={styles.commandmentText}>
                                <strong>File Upload Support</strong>
                                <br />
                                Upload documents, images, and data files for analysis, processing, and intelligent insights from your AI
                                sidekicks.
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>⚙️</div>
                            <div className={styles.commandmentText}>
                                <strong>Customizable Parameters</strong>
                                <br />
                                Fine-tune your sidekicks' responses by adjusting creativity, specificity, and behavior to match your
                                preferences.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function SidekickStudio() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>Expand Your Sidekick Collection</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Discover, create, and share AI sidekicks through Sidekick Studio
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>📂</div>
                            <h3>My Sidekicks</h3>
                            <p>View and manage your personal collection of AI sidekicks. Organize, customize, and deploy your chatflows.</p>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>⭐</div>
                            <h3>AnswerAI Suggested</h3>
                            <p>Explore curated sidekicks recommended by AnswerAI. Discover new capabilities and specialized assistants.</p>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>🌐</div>
                            <h3>Community Shared</h3>
                            <p>Access sidekicks shared by your organization and the global community. Learn from others' creations.</p>
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
                <h2>Ready to Meet Your AI Sidekicks?</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    Start conversing with intelligent AI assistants that understand your workflow and adapt to your needs
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Start Chatting Free
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/chat' className={styles.secondaryLink}>
                            📖 Read Documentation
                        </a>
                        <a href='/docs/sidekick-studio' className={styles.secondaryLink}>
                            🛠️ Sidekick Studio
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Chat(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='Chat & Sidekicks - AI Conversation Hub'
                description='Your central hub for AI conversations with specialized sidekicks. Manage chat histories, access different AI agents, and boost productivity.'
            >
                <ChatHero />
                <UsingAnswerAISubmenu />
                <main>
                    <FeaturedSidekicks />
                    <ChatFeatures />
                    <SidekickStudio />
                    <CTASection />
                </main>
            </Layout>
        </div>
    )
}
