import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import UsingAnswerAgentAISubmenu from '@site/src/components/UsingAnswerAgentAISubmenu'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'

import styles from './index.module.css'

function LearnHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Learn AI & Accelerate Your Journey</h1>
                <p className={styles.heroSubtitle}>
                    Master AI fundamentals, discover practical applications, and unlock the full potential of AnswerAgentAI with our
                    comprehensive learning resources.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='#alpha-extension' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Try Alpha Extension
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#modules' className={styles.secondaryLink}>
                            📚 AI Modules
                        </a>
                        <a href='#courses' className={styles.secondaryLink}>
                            🎓 Video Courses
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}

function AlphaExtensionPromo() {
    return (
        <section className={clsx(styles.featuresSection, styles.comingSoonSection)} id='alpha-extension'>
            <div className='container'>
                <h2 className='text--center'>🚀 Alpha Browser Sidekick - Your AI Sidekick Everywhere</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Experience the future of AI assistance right in your browser. Ask questions, get help, and boost productivity on any
                    website.
                </p>
                <div className='row'>
                    <div className='col col--12'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard, styles.subscriptionBanner)}>
                            <div className={styles.subscriptionBannerContent}>
                                <div className={clsx(styles.comingSoonIcon, styles.subscriptionBannerIcon)}>🤖</div>
                                <div className={clsx(styles.commandmentText, styles.subscriptionBannerText)}>
                                    <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>What Alpha Can Do For You</h3>
                                    <div className='row'>
                                        <div className='col col--6'>
                                            <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                                                <strong style={{ color: '#ff00ff' }}>🧠 Smart Platform Assistant</strong>
                                                <br />
                                                Ask questions about any feature, get instant explanations, and discover hidden capabilities
                                                while using AnswerAgentAI.
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <strong style={{ color: '#ff00ff' }}>🎯 Agent Creation Helper</strong>
                                                <br />
                                                Get guided assistance creating new agents, optimizing workflows, and troubleshooting
                                                configurations.
                                            </div>
                                        </div>
                                        <div className='col col--6'>
                                            <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                                                <strong style={{ color: '#ff00ff' }}>🎫 Support Ticket Assistant</strong>
                                                <br />
                                                Submit detailed support tickets with context, screenshots, and relevant information
                                                automatically captured.
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <strong style={{ color: '#ff00ff' }}>💬 Universal Q&A</strong>
                                                <br />
                                                Ask anything about AI, productivity, or how to get the most out of your AnswerAgentAI
                                                experience.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.subscriptionBannerButton}>
                                <a href='/browser-sidekick' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                                    Get Alpha Sidekick
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function AIModules() {
    return (
        <section className={styles.featuresSection} id='modules'>
            <div className='container'>
                <h2 className='text--center'>AI Fundamentals - Interactive Learning Modules</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Build your AI knowledge from the ground up with our comprehensive, beginner-friendly modules
                </p>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>1</div>
                            <h3>Welcome to the World of AI!</h3>
                            <p>
                                The bare essentials of AI, Chatbots, and what AnswerAgentAI is all about. Perfect starting point for AI
                                newcomers.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>🧠 AI Basics</span>
                                <span>🤖 Chatbot Fundamentals</span>
                                <span>🎯 AnswerAgentAI Overview</span>
                            </div>
                            <a href='/docs/use-cases/module-1-welcome-to-ai' className={styles.featureCardCTA}>
                                Start Module 1 →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>2</div>
                            <h3>The Art of the Perfect Prompt</h3>
                            <p>
                                Learn how to craft effective prompts to get the best results from AI. Master the communication with AI
                                systems.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>✍️ Prompt Engineering</span>
                                <span>🎨 Effective Communication</span>
                                <span>⚡ Best Practices</span>
                            </div>
                            <a href='/docs/use-cases/module-2-art-of-the-prompt' className={styles.featureCardCTA}>
                                Start Module 2 →
                            </a>
                        </div>
                    </div>
                </div>
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>3</div>
                            <h3>AnswerAgentAI in Action</h3>
                            <p>Discover practical ways you can use AnswerAgentAI for daily tasks and unlock everyday superpowers.</p>
                            <a href='/docs/use-cases/module-3-answeragent-in-action' className={styles.featureCardCTA}>
                                Start Module 3 →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>4</div>
                            <h3>AnswerAgentAI vs. Others</h3>
                            <p>Understand how AnswerAgentAI compares to ChatGPT, Claude, NotebookLM and other popular AI tools.</p>
                            <a href='/docs/use-cases/module-4-answeragent-vs-others' className={styles.featureCardCTA}>
                                Start Module 4 →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>5</div>
                            <h3>Supercharge Your Experience</h3>
                            <p>Tips and advanced features to get the most out of AnswerAgentAI, including Sidekicks and Extensions.</p>
                            <a href='/docs/use-cases/module-5-supercharging-answeragent' className={styles.featureCardCTA}>
                                Start Module 5 →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function YouTubeCourses() {
    return (
        <section className={styles.missionSection} id='courses'>
            <div className='container'>
                <h2 className='text--center'>Learn AI Development with Digital at Scale</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Get up to speed with AI concepts and development practices from our founder&apos;s comprehensive video courses
                </p>

                <div className='row' style={{ marginBottom: '3rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.videoCard)}>
                            <h3 style={{ marginBottom: '1.5rem', color: '#00ffff' }}>🎓 AI 101 - Foundation Course</h3>
                            <div className={styles.videoContainer}>
                                <iframe
                                    className={styles.youtubeVideo}
                                    src='https://www.youtube.com/embed/-VbXVX4rzDk'
                                    title='AI 101 - Foundation Course'
                                    frameBorder='0'
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen
                                />
                            </div>
                            <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                                Master the fundamentals of AI and machine learning. Perfect starting point for developers and enthusiasts
                                joining the mission.
                            </p>
                            <a
                                href='https://www.youtube.com/watch?v=-VbXVX4rzDk'
                                target='_blank'
                                rel='noopener noreferrer'
                                className={styles.featureCardCTA}
                            >
                                Watch on YouTube →
                            </a>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.videoCard)}>
                            <h3 style={{ marginBottom: '1.5rem', color: '#00ffff' }}>🚀 Advanced AI Development</h3>
                            <div className={styles.videoContainer}>
                                <iframe
                                    className={styles.youtubeVideo}
                                    src='https://www.youtube.com/embed/jleXZV8HXtI'
                                    title='Advanced AI Development'
                                    frameBorder='0'
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen
                                />
                            </div>
                            <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                                Deep dive into advanced AI concepts and practical implementation strategies for real-world applications.
                            </p>
                            <a
                                href='https://www.youtube.com/watch?v=jleXZV8HXtI&list=PLfkQz1-GoNNLucltsGTw2f_0VmEsnxsrj'
                                target='_blank'
                                rel='noopener noreferrer'
                                className={styles.featureCardCTA}
                            >
                                Watch Playlist →
                            </a>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div className={clsx(styles.commandment, styles.comingSoonCard, styles.subscriptionBanner)}>
                        <div className={styles.subscriptionBannerContent}>
                            <div className={clsx(styles.comingSoonIcon, styles.subscriptionBannerIcon)}>📺</div>
                            <div className={clsx(styles.commandmentText, styles.subscriptionBannerText)}>
                                <strong>Digital at Scale YouTube Channel</strong>
                                <br />
                                Subscribe for weekly deep dives into AI development, privacy-first architecture, and the future of ethical
                                computing. New videos every Tuesday.
                            </div>
                        </div>
                        <div className={styles.subscriptionBannerButton}>
                            <a
                                href='https://www.youtube.com/@digitalatscale'
                                target='_blank'
                                rel='noopener noreferrer'
                                className={clsx(styles.ctaButton, styles.ctaPrimary)}
                            >
                                Subscribe to Channel
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
        <section className={styles.featuresSection}>
            <div className='container'>
                <h2 className='text--center'>Additional Learning Resources</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Explore comprehensive documentation, community support, and developer resources
                </p>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>📖</div>
                            <h3>Complete Documentation</h3>
                            <p>Comprehensive guides, API references, and step-by-step tutorials for every aspect of AnswerAgentAI.</p>
                            <a href='/docs' className={styles.featureCardCTA}>
                                Browse Documentation →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>👥</div>
                            <h3>Community Support</h3>
                            <p>Join our vibrant community for help, sharing experiences, and collaborating on innovative AI solutions.</p>
                            <a
                                href='https://discord.gg/X54ywt8pzj'
                                target='_blank'
                                rel='noopener noreferrer'
                                className={styles.featureCardCTA}
                            >
                                Join Discord →
                            </a>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={styles.featureCard}>
                            <div className={styles.appIcon}>💻</div>
                            <h3>Developer Resources</h3>
                            <p>Contribute to the platform, access source code, and help build the future of ethical AI.</p>
                            <a href='/developers' className={styles.featureCardCTA}>
                                Explore Development →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Learn(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='Learn AI & Master AnswerAgentAI'
                description='Master AI fundamentals with interactive modules, video courses, and comprehensive learning resources. Start with our Alpha browser extension for instant AI assistance.'
            >
                <LearnHero />
                <UsingAnswerAgentAISubmenu />
                <main>
                    <AlphaExtensionPromo />
                    <AIModules />
                    <YouTubeCourses />
                    <LearningResources />
                </main>
            </Layout>
        </div>
    )
}
