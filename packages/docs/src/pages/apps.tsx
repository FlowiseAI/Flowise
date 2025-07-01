import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'

import styles from './index.module.css'

function AppsHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Agent Apps</h1>
                <p className={styles.heroSubtitle}>
                    Supercharge your workflow with AI-powered applications that transform how you work with data, creativity, and
                    automation.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Try Apps Now
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/apps' className={styles.secondaryLink}>
                            📚 View Documentation
                        </a>
                        <a href='#featured-apps' className={styles.secondaryLink}>
                            🚀 Explore Features
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function FeaturedApps() {
    return (
        <section className={styles.featuresSection} id='featured-apps'>
            <div className='container'>
                <h2 className='text--center'>Featured Applications</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Powerful AI tools designed to solve real-world problems and enhance productivity
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📊</div>
                            <h3>CSV Transformer</h3>
                            <p>
                                Effortlessly clean, reformat, and analyze your CSV data using intelligent AI algorithms. Perfect for data
                                preparation, reporting, and ensuring data quality.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>✨ Smart Data Cleaning</span>
                                <span>🔄 Format Conversion</span>
                                <span>📈 Analysis Tools</span>
                                <span>🛡️ Secure Processing</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Launch App →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🎨</div>
                            <h3>Image Creator</h3>
                            <p>
                                Generate stunning, unique images from text descriptions or transform existing images with AI-powered
                                enhancements. Perfect for marketing and creative projects.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🖼️ Text-to-Image</span>
                                <span>✨ Image Enhancement</span>
                                <span>🎭 Style Transfer</span>
                                <span>📱 High Quality</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Launch App →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🔍</div>
                            <h3>Deep Research</h3>
                            <p>
                                Harness the power of AI to analyze both external web data and internal company information. Generate
                                comprehensive research reports and insights instantly.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🌐 External Data Mining</span>
                                <span>📂 Internal Data Analysis</span>
                                <span>📋 Research Reports</span>
                                <span>🧠 Smart Insights</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Launch App →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>💻</div>
                            <h3>Code IDE</h3>
                            <p>
                                AI-powered integrated development environment with intelligent code completion, debugging assistance, and
                                automated code generation for faster development.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🤖 AI Code Completion</span>
                                <span>🐛 Smart Debugging</span>
                                <span>⚡ Code Generation</span>
                                <span>🔧 Multi-Language</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Launch App →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📈</div>
                            <h3>SEO & Website Analyzer</h3>
                            <p>
                                Comprehensive SEO analysis and website optimization recommendations powered by AI. Identify opportunities
                                and track performance improvements.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🔍 SEO Audits</span>
                                <span>📊 Performance Metrics</span>
                                <span>💡 Optimization Tips</span>
                                <span>📱 Mobile Analysis</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Launch App →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📝</div>
                            <h3>CMS Publisher</h3>
                            <p>
                                Seamlessly create and publish content across multiple platforms with native Sanity and Contentful
                                integrations. AI-powered content optimization included.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📚 Sanity Integration</span>
                                <span>🎯 Contentful Support</span>
                                <span>✨ AI Optimization</span>
                                <span>🚀 Multi-Platform</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Launch App →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📞</div>
                            <h3>Call Analysis</h3>
                            <p>
                                Automated insights from your voice communications. Extract key points, sentiment, and action items from
                                meetings and calls with advanced AI processing.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🎙️ Voice Recognition</span>
                                <span>📝 Meeting Summaries</span>
                                <span>📊 Sentiment Analysis</span>
                                <span>✅ Action Items</span>
                            </div>
                            <div className={styles.featureCardCTA} style={{ opacity: 0.7, cursor: 'default' }}>
                                Coming Soon
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🎫</div>
                            <h3>Ticket Analysis</h3>
                            <p>
                                Streamline customer support with AI-driven ticket insights. Categorize, prioritize, and route support
                                requests intelligently with automated workflows.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🏷️ Auto-Categorization</span>
                                <span>⚡ Priority Scoring</span>
                                <span>🔄 Smart Routing</span>
                                <span>📈 Performance Analytics</span>
                            </div>
                            <div className={styles.featureCardCTA} style={{ opacity: 0.7, cursor: 'default' }}>
                                Coming Soon
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🎬</div>
                            <h3>Video Creation</h3>
                            <p>
                                Generate compelling videos from text or simple inputs. Create engaging content for social media,
                                presentations, and marketing with AI-powered video generation.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🎥 Text-to-Video</span>
                                <span>✨ AI Enhancement</span>
                                <span>📱 Multiple Formats</span>
                                <span>🎨 Custom Branding</span>
                            </div>
                            <div className={styles.featureCardCTA} style={{ opacity: 0.7, cursor: 'default' }}>
                                Coming Soon
                            </div>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🤖</div>
                            <h3>Agent Builder</h3>
                            <p>
                                Visually design and deploy custom AI agents for any task. No coding required - just drag, drop, and
                                configure your intelligent workforce with intuitive visual tools.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🎨 Visual Builder</span>
                                <span>🔧 No-Code Design</span>
                                <span>⚡ Instant Deployment</span>
                                <span>🔄 Workflow Automation</span>
                            </div>
                            <div className={styles.featureCardCTA} style={{ opacity: 0.7, cursor: 'default' }}>
                                Coming Soon
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📊</div>
                            <h3>Company Dashboards</h3>
                            <p>
                                Unified AI-powered insights across your business operations. Real-time analytics, predictive insights, and
                                automated reporting to drive data-driven decisions.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📈 Real-time Analytics</span>
                                <span>🔮 Predictive Insights</span>
                                <span>📋 Automated Reports</span>
                                <span>🎯 Custom Metrics</span>
                            </div>
                            <div className={styles.featureCardCTA} style={{ opacity: 0.7, cursor: 'default' }}>
                                Coming Soon
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function IntegrationsSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <h2 className='text--center'>Powerful Integrations</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Connect with the tools and platforms you already use - seamless integration across your workflow
                </p>

                <div className='row'>
                    <div className='col col--12'>
                        <h3 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Business & Productivity</h3>
                        <div className='row'>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>☁️</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Salesforce (SFDC)</strong>
                                        <br />
                                        CRM data sync, lead scoring, and automated insights for sales teams
                                    </div>
                                </div>
                            </div>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>🎫</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Jira</strong>
                                        <br />
                                        Project management, issue tracking, and automated ticket analysis
                                    </div>
                                </div>
                            </div>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>📚</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Confluence</strong>
                                        <br />
                                        Knowledge base integration and intelligent document search
                                    </div>
                                </div>
                            </div>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>💼</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Workday</strong>
                                        <br />
                                        HR analytics, employee insights, and workforce optimization
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '3rem' }}>
                    <div className='col col--12'>
                        <h3 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Google Workspace & Communication</h3>
                        <div className='row'>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>🔍</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Google Search</strong>
                                        <br />
                                        Enhanced search capabilities with AI-powered result analysis
                                    </div>
                                </div>
                            </div>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>📧</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Gmail</strong>
                                        <br />
                                        Email automation, smart replies, and sentiment analysis
                                    </div>
                                </div>
                            </div>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>📅</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Google Calendar</strong>
                                        <br />
                                        Meeting insights, scheduling optimization, and calendar intelligence
                                    </div>
                                </div>
                            </div>
                            <div className='col col--3'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>🎥</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Zoom</strong>
                                        <br />
                                        Meeting transcription, summary generation, and action item extraction
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '3rem' }}>
                    <div className='col col--12'>
                        <h3 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>File Storage & HR Systems</h3>
                        <div className='row'>
                            <div className='col col--4'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>📂</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Dropbox</strong>
                                        <br />
                                        Intelligent file organization, content analysis, and automated tagging for better document
                                        management
                                    </div>
                                </div>
                            </div>
                            <div className='col col--4'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>🌊</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Rippling</strong>
                                        <br />
                                        HR data integration, employee analytics, and automated workflow management for people operations
                                    </div>
                                </div>
                            </div>
                            <div className='col col--4'>
                                <div className={clsx(styles.commandment, styles.integrationCard)}>
                                    <div className={styles.integrationIcon}>⚡</div>
                                    <div className={styles.commandmentText}>
                                        <strong>And Many More...</strong>
                                        <br />
                                        Slack, Microsoft Teams, Notion, Airtable, HubSpot, and 100+ other integrations coming soon
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
                        Need a custom integration? Our team can build it for you.
                    </p>
                    <a href='https://discord.gg/X54ywt8pzj' className={clsx(styles.ctaButton, styles.ctaSecondary)}>
                        Request Integration
                    </a>
                </div>
            </div>
        </section>
    )
}

function HowItWorks() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>How Answer Agent Apps Work</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Simple, powerful, and secure - designed for everyone
                </p>
                <div className='row'>
                    <div className='col col--3'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>1</div>
                            <h3>Choose Your App</h3>
                            <p>Select from our growing library of AI-powered applications designed for specific tasks and workflows.</p>
                        </div>
                    </div>
                    <div className='col col--3'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>2</div>
                            <h3>Upload & Configure</h3>
                            <p>Securely upload your data or provide inputs. Configure the app settings to match your specific needs.</p>
                        </div>
                    </div>
                    <div className='col col--3'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>3</div>
                            <h3>AI Processing</h3>
                            <p>Our advanced AI engines process your data using state-of-the-art algorithms optimized for each task.</p>
                        </div>
                    </div>
                    <div className='col col--3'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>4</div>
                            <h3>Get Results</h3>
                            <p>Download your transformed data, generated content, or insights - ready to use in your workflow.</p>
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
                <h2>Ready to Transform Your Workflow?</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    Join thousands of users who are already supercharging their productivity with Answer Agent Apps
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Get Started Free
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/apps' className={styles.secondaryLink}>
                            📖 Read Documentation
                        </a>
                        <a href='https://discord.gg/X54ywt8pzj' className={styles.secondaryLink}>
                            💬 Join Community
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Apps(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='Apps - AI-Powered Productivity Applications'
                description='Transform your workflow with specialized AI applications. From data analysis to creative tools, explore the future of productivity.'
            >
                <AppsHero />
                <UsingAnswerAISubmenu />
                <main>
                    <FeaturedApps />
                    <IntegrationsSection />
                    <HowItWorks />
                    <CTASection />
                </main>
            </Layout>
        </div>
    )
}
