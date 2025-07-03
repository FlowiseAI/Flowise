import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'

import styles from './index.module.css'

function SidekickStudioHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Sidekick Studio</h1>
                <p className={styles.heroSubtitle}>
                    Build sophisticated AI workflows with our visual no-code editor. Connect tools, create custom agents, and import Flowise
                    flows to automate your processes.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Launch Studio
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/sidekick-studio' className={styles.secondaryLink}>
                            📚 View Documentation
                        </a>
                        <a href='#features' className={styles.secondaryLink}>
                            🛠️ Explore Features
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function FlowiseFoundation() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <h2 className='text--center'>Built on Flowise Excellence</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Leverage the proven power of Flowise with AnswerAI enhancements
                </p>
                <div className='row' style={{ alignItems: 'center' }}>
                    <div className='col col--6'>
                        <div className='row'>
                            <div className='col col--12'>
                                <div className={clsx(styles.commandment, styles.comingSoonCard)} style={{ marginBottom: '1.5rem' }}>
                                    <div className={styles.comingSoonIcon}>🔗</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Flowise Foundation</strong>
                                        <br />
                                        Built as a powerful fork of Flowise, inheriting years of community development and battle-tested stability
                                        for enterprise workflows.
                                    </div>
                                </div>
                            </div>
                            <div className='col col--12'>
                                <div className={clsx(styles.commandment, styles.comingSoonCard)} style={{ marginBottom: '1.5rem' }}>
                                    <div className={styles.comingSoonIcon}>⚡</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Instant Migration</strong>
                                        <br />
                                        Import your existing Flowise chatflows and agent flows instantly. No rebuilding required—just seamless
                                        migration to enhanced capabilities.
                                    </div>
                                </div>
                            </div>
                            <div className='col col--12'>
                                <div className={clsx(styles.commandment, styles.comingSoonCard)} style={{ marginBottom: '1.5rem' }}>
                                    <div className={styles.comingSoonIcon}>🌐</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Thriving Community</strong>
                                        <br />
                                        Join the rapidly growing Flowise community with thousands of developers sharing workflows, templates, and
                                        innovations.
                                    </div>
                                </div>
                            </div>
                            <div className='col col--12'>
                                <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                                    <div className={styles.comingSoonIcon}>🔧</div>
                                    <div className={styles.commandmentText}>
                                        <strong>Enhanced Features</strong>
                                        <br />
                                        All the power of Flowise plus AnswerAI-specific enhancements, integrations, and enterprise-grade security
                                        features.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div style={{ textAlign: 'center' }}>
                            <img 
                                src='/.gitbook/assets/agentflowsv2/agentflowsv2-1-flow-types.png' 
                                alt='AnswerAI Flow Types'
                                style={{ 
                                    maxWidth: '100%', 
                                    height: 'auto',
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0, 255, 255, 0.15)',
                                    border: '1px solid rgba(0, 255, 255, 0.2)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function PlatformSupport() {
    return (
        <section className={styles.featuresSection} id='features'>
            <div className='container'>
                <h2 className='text--center'>Enterprise-Grade AI Framework Support</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Native integration with leading AI frameworks and libraries
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🦜</div>
                            <h3>LangChain Integration</h3>
                            <p>
                                Full native support for LangChain nodes and components. Build sophisticated AI chains, agents, and tools
                                using the most popular AI framework.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🔗 Chain Building</span>
                                <span>🤖 Agent Creation</span>
                                <span>🛠️ Tool Integration</span>
                                <span>📚 Memory Management</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Try LangChain Nodes →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>🦙</div>
                            <h3>LlamaIndex Support</h3>
                            <p>
                                Native LlamaIndex nodes for advanced document processing, RAG applications, and knowledge base construction
                                with enterprise data.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📄 Document Processing</span>
                                <span>🔍 RAG Applications</span>
                                <span>📚 Knowledge Bases</span>
                                <span>🔗 Vector Integration</span>
                            </div>
                            <a href='https://studio.theanswer.ai' className={styles.featureCardCTA}>
                                Try LlamaIndex Nodes →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function StudioFeatures() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>Visual AI Workflow Builder</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Drag, drop, and connect your way to powerful AI applications
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>🎨</div>
                            <h3>Visual Canvas</h3>
                            <p>
                                Intuitive drag-and-drop interface for building complex AI workflows. No coding required—just visual design
                                and logical connections.
                            </p>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>🧩</div>
                            <h3>Extensive Node Library</h3>
                            <p>
                                Hundreds of pre-built nodes for chat models, embeddings, vector stores, document loaders, tools, and
                                integrations.
                            </p>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>⚡</div>
                            <h3>Real-time Testing</h3>
                            <p>
                                Built-in debugging and testing tools let you validate your workflows as you build them. Instant feedback and
                                iteration.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function MCPToolsImage() {
    return (
        <section style={{ padding: '2rem 0', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div className='container'>
                <div style={{ textAlign: 'center' }}>
                    <img 
                        src='/.gitbook/assets/agentflowsv2/agentflowsv2-5-mcp-tools.png' 
                        alt='MCP Tools Integration'
                        style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0, 255, 255, 0.15)',
                            border: '1px solid rgba(0, 255, 255, 0.2)'
                        }}
                    />
                </div>
            </div>
        </section>
    )
}

function NodeCategories() {
    return (
        <section className={clsx(styles.missionSection, styles.comingSoonSection)}>
            <div className='container'>
                <h2 className='text--center'>Comprehensive Node Ecosystem</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Everything you need to build sophisticated AI applications
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🤖</div>
                            <div className={styles.commandmentText}>
                                <strong>AI Agents & Models</strong>
                                <br />
                                Chat models, agents, embeddings, and memory systems for intelligent conversational applications.
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>📚</div>
                            <div className={styles.commandmentText}>
                                <strong>Document Processing</strong>
                                <br />
                                Document loaders, text splitters, and retrievers for comprehensive knowledge management systems.
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🔗</div>
                            <div className={styles.commandmentText}>
                                <strong>Tools & Integrations</strong>
                                <br />
                                Vector stores, chains, tools, and external integrations for enterprise-grade AI workflows.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function NodeReferenceImage() {
    return (
        <section style={{ padding: '2rem 0', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div className='container'>
                <div style={{ textAlign: 'center' }}>
                    <img 
                        src='/.gitbook/assets/agentflowsv2/agentflowsv2-6-node-ref.png' 
                        alt='Node Reference Guide'
                        style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0, 255, 255, 0.15)',
                            border: '1px solid rgba(0, 255, 255, 0.2)'
                        }}
                    />
                </div>
            </div>
        </section>
    )
}

function CTASection() {
    return (
        <section className={clsx(styles.missionSection, styles.ctaSection)}>
            <div className='container text--center'>
                <h2>Ready to Build Your AI Workforce?</h2>
                <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
                    Import your existing flows or start fresh with the most powerful visual AI builder available
                </p>
                <div className={styles.heroCTAs}>
                    <a href='https://studio.theanswer.ai' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Launch Studio Free
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='/docs/sidekick-studio' className={styles.secondaryLink}>
                            📖 Read Documentation
                        </a>
                        <a href='https://discord.gg/X54ywt8pzj' className={styles.secondaryLink}>
                            🌐 Join Community
                        </a>
                    </div>
                </div>
                <div
                    style={{
                        marginTop: '3rem',
                        padding: '2rem',
                        background: 'rgba(0, 255, 255, 0.05)',
                        borderRadius: '15px',
                        border: '1px solid rgba(0, 255, 255, 0.2)'
                    }}
                >
                    <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Migration Made Easy</h3>
                    <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
                        Already using Flowise? Import your existing chatflows and agent flows in seconds. No rebuilding, no data loss—just
                        enhanced capabilities.
                    </p>
                    <a href='/docs/sidekick-studio' className={clsx(styles.ctaButton, styles.secondaryLink)}>
                        Learn About Migration →
                    </a>
                </div>
            </div>
        </section>
    )
}

export default function SidekickStudio(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='Sidekick Studio - Visual AI Workflow Builder'
                description='Build complex AI workflows with our visual no-code editor. Connect tools, create agents, and automate processes without coding.'
            >
                <SidekickStudioHero />
                <UsingAnswerAISubmenu />
                <main>
                    <FlowiseFoundation />
                    <PlatformSupport />
                    <StudioFeatures />
                    <MCPToolsImage />
                    <NodeCategories />
                    <NodeReferenceImage />
                    <CTASection />
                </main>
            </Layout>
        </div>
    )
}
