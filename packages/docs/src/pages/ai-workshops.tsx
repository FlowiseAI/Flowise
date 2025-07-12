import clsx from 'clsx'
import Layout from '@theme/Layout'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import { useEffect } from 'react'

import styles from './index.module.css'

function WorkshopsHero() {
    const handleAIAgentClick = (e: React.MouseEvent) => {
        e.preventDefault()
        const widget = document.querySelector('elevenlabs-convai') as any
        if (widget) {
            widget.style.display = 'block'
        }
    }

    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>AI Workshops for Your Team</h1>
                <p className={styles.heroSubtitle}>
                    Transform your organization with hands-on AI training. Expert-led workshops that empower your team to harness the full
                    potential of artificial intelligence.
                </p>
                <div className={styles.heroCTAs}>
                    <a
                        href='https://calendly.com/lastrev-brad/ai-workshop-discovery-call'
                        className={clsx(styles.ctaButton, styles.ctaPrimary)}
                    >
                        Book Consultation
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#how-it-works' className={styles.secondaryLink}>
                            🎯 How It Works
                        </a>
                        <button onClick={handleAIAgentClick} className={styles.secondaryLink}>
                            🤖 Talk to an Agent Now
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}

function BenefitsSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className='row'>
                    <div className='col col--12'>
                        <h2 className='text--center' style={{ marginBottom: '3rem' }}>
                            Why AI Training Matters for Your Team
                        </h2>
                    </div>
                </div>

                {/* First row of 3 cards */}
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>⚡</div>
                            <div className='text--center'>
                                <h3>Seamless, All-Inclusive Experience</h3>
                                <p>
                                    We handle every detail—venue, meals, and events—making it effortless for you to coordinate. Just pick
                                    your date and location; we do the rest.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🚀</div>
                            <div className='text--center'>
                                <h3>Boost Team Productivity and Save Time</h3>
                                <p>
                                    Automate routine work so your team can focus on impactful projects. See less busywork and more
                                    results—immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎯</div>
                            <div className='text--center'>
                                <h3>Customized for Your Team&apos;s Needs</h3>
                                <p>
                                    Tailored training for sales, marketing, technical, or support teams. Ensure every participant gets
                                    relevant, actionable skills.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Second row of 3 cards */}
                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🌟</div>
                            <div className='text--center'>
                                <h3>Attract & Retain Top Talent</h3>
                                <p>
                                    Provide growth opportunities that help your company stand out. Upskill staff so your leaders—and your
                                    organization—shine.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🏆</div>
                            <div className='text--center'>
                                <h3>Position Your Company as a Leader</h3>
                                <p>
                                    Make your execs and teams look forward-thinking with advanced AI capabilities that impress stakeholders
                                    and peers.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>💼</div>
                            <div className='text--center'>
                                <h3>Effortless Scheduling and Support</h3>
                                <p>
                                    Dedicated support from consultation to workshop day. Fast, responsive answers so you can confidently
                                    handle all planning questions and logistics.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function ProminentCTASection() {
    const handleAIAgentClick = (e: React.MouseEvent) => {
        e.preventDefault()
        const widget = document.querySelector('elevenlabs-convai') as any
        if (widget) {
            widget.style.display = 'block'
        }
    }

    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className='row'>
                    <div className='col col--12'>
                        <div className={styles.prominentCTAHeader}>
                            <div className={styles.comingSoonIcon}>🎉</div>
                            <h2 className='text--center'>Complete AI Workshop Experience</h2>
                            <p className='text--center' style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem' }}>
                                We handle everything: venue booking, catering for lunches and dinners, evening networking events, and team
                                celebrations at local nightlife spots. Perfect for team offsites or conference add-ons.
                            </p>
                        </div>
                    </div>
                </div>
                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🤖</div>
                            <div>
                                <h3>Talk to an AI Agent</h3>
                                <p>
                                    Get instant answers about our workshops, pricing, and availability. Our AI agent is trained to help you
                                    understand how we can transform your team&apos;s AI capabilities.
                                </p>
                                <button onClick={handleAIAgentClick} className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                                    🤖 Chat with AI Agent
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>👥</div>
                            <div>
                                <h3>Schedule with a Human</h3>
                                <p>
                                    Talk directly with our team about your specific needs and get a customized proposal. Perfect for
                                    discussing team size, location preferences, and creating a tailored experience.
                                </p>
                                <a
                                    href='https://calendly.com/lastrev-brad/ai-workshop-discovery-call'
                                    className={clsx(styles.ctaButton, styles.ctaPrimary)}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    📅 Schedule with a Human
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function HowItWorksSection() {
    return (
        <section className={styles.featuresSection} id='how-it-works'>
            <div className='container'>
                <h2 className='text--center'>How Our AI Workshops Work</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    A comprehensive 5-day learning experience combining online preparation with intensive in-person training
                </p>

                <div className='row' style={{ marginBottom: '3rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>1</div>
                            <h3>Pre-Workshop Online Training</h3>
                            <p>
                                <strong>3 Days of Online Preparation</strong>
                                <br />
                                Get access to the Answer Academy with videos, documents, resources, prompts, and open-source agents.
                                Participate in Zoom sessions to build foundational knowledge before the in-person workshop.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>📚 Answer Academy Access</span>
                                <span>🎥 Video Resources</span>
                                <span>💬 Interactive Zoom Sessions</span>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <div className={styles.stepNumber}>2</div>
                            <h3>In-Person Workshop Experience</h3>
                            <p>
                                <strong>2 Days of Intensive Training</strong>
                                <br />
                                Join CEO Bradley Taylor and our expert team for hands-on workshops covering AI implementation across
                                marketing, sales, customer support, and engineering leadership.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>👨‍💼 CEO-Led Sessions</span>
                                <span>🛠️ Hands-On Training</span>
                                <span>🎯 Department-Specific Breakouts</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function WorkshopTopicsSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <h2 className='text--center'>Workshop Focus Areas</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Tailored training modules designed for different roles and departments
                </p>

                <div className='row'>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>📈</div>
                            <div>
                                <h3>Sales & Marketing Teams</h3>
                                <p>
                                    Learn to leverage AI for content creation, customer segmentation, lead generation, personalized
                                    outreach, and sales process optimization. Create compelling campaigns and close deals faster with AI
                                    assistance.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>✍️ Quality Content Generation</span>
                                    <span>🎯 Lead Qualification & Nurturing</span>
                                    <span>📊 Campaign Optimization & Tracking</span>
                                    <span>🔄 Sales Process Optimization</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🛠️</div>
                            <div>
                                <h3>Engineering & Technical Teams</h3>
                                <p>
                                    Deep dive into different AI models, implementation strategies, and technical best practices. Learn the
                                    differences between models, when to use each, and how to integrate AI into your development workflow.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>🤖 Agent & RAG Implementation</span>
                                    <span>⚙️ Model Comparison</span>
                                    <span>🔧 Development Process Integration</span>
                                    <span>🔧 Fine Tuning & Prompt Engineering</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>💬</div>
                            <div>
                                <h3>Customer Support Teams</h3>
                                <p>
                                    Transform your customer support with AI-powered solutions. Learn to implement chatbots, automate
                                    responses, analyze sentiment, and provide personalized customer experiences that scale.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>🤖 Chatbot & Voice Agents</span>
                                    <span>📝 Response Automation & Documentation</span>
                                    <span>😊 Sentiment Analysis</span>
                                    <span>🔄 Workflow Automation & Process Optimization</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>👔</div>
                            <div>
                                <h3>Executive Leadership</h3>
                                <p>
                                    Strategic guidance for deploying AI across your organization. Learn to identify opportunities, manage
                                    implementation, and drive company-wide AI adoption for competitive advantage and operational excellence.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>🎯 Strategic Planning & Implementation</span>
                                    <span>📊 ROI Assessment & Tracking</span>
                                    <span>🚀 Change Management & Training</span>
                                    <span>🔄 AI Adoption & Culture</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function LocationsSection() {
    return (
        <section className={styles.featuresSection} id='locations'>
            <div className='container'>
                <h2 className='text--center'>Available Workshop Locations</h2>
                <p className='text--center' style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.9 }}>
                    Choose from premium locations across major cities. Other locations available upon request.
                </p>

                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🌴</div>
                            <div>
                                <h3>Los Angeles</h3>
                                <p>
                                    Innovation hub of the West Coast. Perfect for tech companies and creative agencies looking to integrate
                                    AI into their workflows.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🌉</div>
                            <div>
                                <h3>San Francisco</h3>
                                <p>
                                    Heart of Silicon Valley. Ideal for startups and established tech companies at the forefront of AI
                                    adoption.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🏔️</div>
                            <div>
                                <h3>Seattle</h3>
                                <p>
                                    Tech powerhouse of the Pacific Northwest. Great for companies seeking innovative AI solutions in a
                                    dynamic environment.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>⛰️</div>
                            <div>
                                <h3>Denver</h3>
                                <p>
                                    Mile High City with growing tech scene. Perfect for teams looking to elevate their AI capabilities in an
                                    inspiring setting.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎸</div>
                            <div>
                                <h3>Austin</h3>
                                <p>
                                    Keep Austin AI-powered! Vibrant tech community and creative culture make it ideal for innovative team
                                    experiences.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎰</div>
                            <div>
                                <h3>Las Vegas</h3>
                                <p>
                                    Entertainment capital perfect for memorable team experiences. Combine learning with world-class
                                    networking opportunities.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '3rem' }}>
                    <div className='col col--12'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard, styles.subscriptionBanner)}>
                            <div className={styles.subscriptionBannerContent}>
                                <div className={clsx(styles.comingSoonIcon, styles.subscriptionBannerIcon)}>📅</div>
                                <div className={clsx(styles.commandmentText, styles.subscriptionBannerText)}>
                                    <strong>Available Through End of 2026</strong>
                                    <br />
                                    Book your workshop for any of these locations. We recommend coupling with a conference or team offsite.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function PricingCTASection() {
    const handleAIAgentClick = (e: React.MouseEvent) => {
        e.preventDefault()
        const widget = document.querySelector('elevenlabs-convai') as any
        if (widget) {
            widget.style.display = 'block'
        }
    }

    return (
        <section className={styles.pricingSection} id='pricing'>
            <div className='container'>
                <div className='text--center' style={{ marginBottom: '3rem' }}>
                    <h2>Transform Your Team Today</h2>
                    <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem' }}>
                        Fixed cost plus per-person pricing. Comprehensive training, full logistics, and memorable team experience included.
                    </p>
                </div>

                <div className='row'>
                    <div className='col col--8 col--offset-2'>
                        <div className={clsx(styles.pricingCard, styles.commandment, styles.pricingCardHighlighted)}>
                            <div className={styles.pricingIcon}>🎯</div>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <h3 style={{ color: '#00ffff', marginBottom: '1rem', textAlign: 'center' }}>
                                    Complete AI Workshop Experience
                                </h3>
                                <div className={styles.pricingHighlight}>Fixed Cost + Per Person</div>
                                <p style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '1.1rem' }}>
                                    Everything included: Answer Academy access, 3 days online training, 2 days in-person workshops, all
                                    meals, venue, and team events. Fully customizable to your team&apos;s needs.
                                </p>

                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ Answer Academy access (videos, docs, resources, agents)</div>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ 3 days pre-workshop online training</div>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ 2 days intensive in-person workshops</div>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ CEO Bradley Taylor leading sessions</div>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ Customized breakout sessions</div>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ All venue, meals, and event planning</div>
                                    <div style={{ marginBottom: '0.5rem' }}>✓ Team networking and celebration events</div>
                                </div>

                                <div className='text--center' style={{ marginTop: 'auto' }}>
                                    <div
                                        className={clsx(styles.commandment, styles.comingSoonCard)}
                                        style={{
                                            marginBottom: '2rem',
                                            backgroundColor: 'rgba(255, 0, 0, 0.1)',
                                            border: '2px solid #ff4444'
                                        }}
                                    >
                                        <div className={styles.comingSoonIcon}>⚡</div>
                                        <div className={styles.commandmentText}>
                                            <strong style={{ color: '#ff4444' }}>Only 10 Spots Left in 2025!</strong>
                                            <br />
                                            Book your consultation now to secure your preferred dates and location.
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button onClick={handleAIAgentClick} className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                                            Talk to an AI Agent Now
                                        </button>
                                        <a
                                            href='https://calendly.com/lastrev-brad/ai-workshop-discovery-call'
                                            className={clsx(styles.ctaButton, styles.ctaSecondary)}
                                        >
                                            Schedule a Consultation
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function AIWorkshops(): JSX.Element {
    useEffect(() => {
        // Load the ElevenLabs widget script
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
        script.async = true
        script.type = 'text/javascript'
        document.head.appendChild(script)

        return () => {
            // Clean up
            if (script.parentNode) {
                script.parentNode.removeChild(script)
            }
        }
    }, [])

    return (
        <div data-theme='dark'>
            <Layout
                title='AI Workshops - Transform Your Team'
                description='Expert-led AI workshops for your team. 3 days online + 2 days in-person training. Complete experience with Answer Academy access, hands-on learning, and team events.'
            >
                <WorkshopsHero />
                <UsingAnswerAISubmenu />
                <main>
                    <BenefitsSection />
                    <HowItWorksSection />
                    <ProminentCTASection />
                    <WorkshopTopicsSection />
                    <LocationsSection />
                    <PricingCTASection />
                </main>

                {/* ElevenLabs Conversational AI Widget */}
                <div
                    dangerouslySetInnerHTML={{
                        __html: `<elevenlabs-convai 
                        agent-id="DPsEbqvGlYGP9gJQObqN"
                        action-text="Need AI workshop help?"
                        start-call-text="Start conversation"
                        end-call-text="End conversation"
                        listening-text="Listening..."
                        speaking-text="AI assistant speaking"
                    ></elevenlabs-convai>`
                    }}
                />
            </Layout>
        </div>
    )
}
