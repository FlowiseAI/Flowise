import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import UsingAnswerAISubmenu from '@site/src/components/UsingAnswerAISubmenu'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'

import styles from './index.module.css'

function WorkshopsHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>AI Workshops for Your Team</h1>
                <p className={styles.heroSubtitle}>
                    Transform your organization with hands-on AI training. Expert-led workshops that empower your team to harness the full potential of artificial intelligence.
                </p>
                <div className={styles.heroCTAs}>
                    <a href='#pricing' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Book Consultation
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#how-it-works' className={styles.secondaryLink}>
                            🎯 How It Works
                        </a>
                        <a href='#locations' className={styles.secondaryLink}>
                            📍 Available Locations
                        </a>
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
                        <h2 className='text--center' style={{ marginBottom: '3rem' }}>Why AI Training Matters for Your Team</h2>
                    </div>
                </div>
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🚀</div>
                            <div>
                                <h3>Accelerate Productivity</h3>
                                <p>
                                    Empower your team to work smarter, not harder. Learn practical AI tools that can automate routine tasks, enhance decision-making, and boost overall productivity across departments.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>💡</div>
                            <div>
                                <h3>Future-Proof Your Business</h3>
                                <p>
                                    Stay ahead of the competition by building AI literacy across your organization. Prepare your team for the AI-driven future with hands-on experience and practical knowledge.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎯</div>
                            <div>
                                <h3>Customized for Your Industry</h3>
                                <p>
                                    Whether you're in marketing, sales, customer support, or engineering, our workshops are tailored to your specific needs and use cases for maximum impact.
                                </p>
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
                                <strong>3 Days of Online Preparation</strong><br/>
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
                                <strong>2 Days of Intensive Training</strong><br/>
                                Join CEO Bradley Taylor and our expert team for hands-on workshops covering AI implementation 
                                across marketing, sales, customer support, and engineering leadership.
                            </p>
                            <div className={styles.appFeatures}>
                                <span>👨‍💼 CEO-Led Sessions</span>
                                <span>🛠️ Hands-On Training</span>
                                <span>🎯 Department-Specific Breakouts</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='row'>
                    <div className='col col--12'>
                        <div className={clsx(styles.commandment, styles.comingSoonCard)}>
                            <div className={styles.comingSoonIcon}>🎉</div>
                            <div className={styles.commandmentText}>
                                <strong>Complete Experience Package</strong><br/>
                                We handle everything: venue booking, catering for lunches and dinners, evening networking events, 
                                and a team celebration at local nightlife spots. Perfect for team offsites or conference add-ons.
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
                                <h3>Marketing & Sales Teams</h3>
                                <p>
                                    Learn to leverage AI for content creation, customer segmentation, lead generation, 
                                    personalized outreach, and sales process optimization. Create compelling campaigns 
                                    and close deals faster with AI assistance.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>✍️ Content Generation</span>
                                    <span>🎯 Lead Qualification</span>
                                    <span>📊 Campaign Optimization</span>
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
                                    Deep dive into different AI models, implementation strategies, and technical best practices. 
                                    Learn the differences between models, when to use each, and how to integrate AI into 
                                    your development workflow.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>🤖 Model Comparison</span>
                                    <span>⚙️ Implementation Strategies</span>
                                    <span>🔧 Development Integration</span>
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
                                <h3>Customer Support Excellence</h3>
                                <p>
                                    Transform your customer support with AI-powered solutions. Learn to implement chatbots, 
                                    automate responses, analyze sentiment, and provide personalized customer experiences 
                                    that scale.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>🤖 Chatbot Implementation</span>
                                    <span>📝 Response Automation</span>
                                    <span>😊 Sentiment Analysis</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>👥</div>
                            <div>
                                <h3>End-User Empowerment</h3>
                                <p>
                                    Help every team member become AI-literate. Learn practical applications, prompt engineering, 
                                    workflow automation, and how to integrate AI tools into daily tasks for maximum productivity 
                                    gains.
                                </p>
                                <div className={styles.appFeatures}>
                                    <span>✨ Prompt Engineering</span>
                                    <span>🔄 Workflow Automation</span>
                                    <span>🎯 Practical Applications</span>
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
                    Choose from premium locations across major cities. Workshops scheduled Thursday-Friday for optimal weekend extension.
                </p>
                
                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🌴</div>
                            <div>
                                <h3>Los Angeles</h3>
                                <p>Innovation hub of the West Coast. Perfect for tech companies and creative agencies looking to integrate AI into their workflows.</p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🌉</div>
                            <div>
                                <h3>San Francisco</h3>
                                <p>Heart of Silicon Valley. Ideal for startups and established tech companies at the forefront of AI adoption.</p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🏔️</div>
                            <div>
                                <h3>Seattle</h3>
                                <p>Tech powerhouse of the Pacific Northwest. Great for companies seeking innovative AI solutions in a dynamic environment.</p>
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
                                <p>Mile High City with growing tech scene. Perfect for teams looking to elevate their AI capabilities in an inspiring setting.</p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎸</div>
                            <div>
                                <h3>Austin</h3>
                                <p>Keep Austin AI-powered! Vibrant tech community and creative culture make it ideal for innovative team experiences.</p>
                            </div>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.commandment)}>
                            <div className={styles.comingSoonIcon}>🎰</div>
                            <div>
                                <h3>Las Vegas</h3>
                                <p>Entertainment capital perfect for memorable team experiences. Combine learning with world-class networking opportunities.</p>
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
                                    <strong>Available Through End of 2026</strong><br/>
                                    Book your workshop for any of these locations. We recommend Thursday-Friday scheduling 
                                    so your team can enjoy the weekend in these amazing cities.
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
                                <h3 style={{ color: '#00ffff', marginBottom: '1rem', textAlign: 'center' }}>Complete AI Workshop Experience</h3>
                                <div className={styles.pricingHighlight}>Fixed Cost + Per Person</div>
                                <p style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '1.1rem' }}>
                                    Everything included: Answer Academy access, 3 days online training, 2 days in-person workshops, 
                                    all meals, venue, and team events. Fully customizable to your team's needs.
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
                                    <div className={clsx(styles.commandment, styles.comingSoonCard)} style={{ marginBottom: '2rem', backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '2px solid #ff4444' }}>
                                        <div className={styles.comingSoonIcon}>⚡</div>
                                        <div className={styles.commandmentText}>
                                            <strong style={{ color: '#ff4444' }}>Only 10 Spots Left in 2025!</strong><br/>
                                            Book your consultation now to secure your preferred dates and location.
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <a href='/developers' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                                            Book Consultation
                                        </a>
                                        <a href='/developers' className={clsx(styles.ctaButton, styles.ctaSecondary)}>
                                            Get Pricing & Availability
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className='row' style={{ marginTop: '3rem' }}>
                    <div className='col col--12'>
                        <div className={clsx(styles.pricingCallout, styles.commandment)}>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>🤝 Fully Customizable Experience</h3>
                                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                                    Whether you're a focused marketing team or a diverse startup, we tailor the workshop to your exact needs. 
                                    Perfect for team offsites or as part of your company conference. Let's talk about creating the perfect 
                                    AI transformation experience for your organization.
                                </p>
                                <div style={{ marginTop: '2rem' }}>
                                    <a href='/developers' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                                        Talk to Us Now
                                    </a>
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
    const { siteConfig } = useDocusaurusContext()

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
                    <WorkshopTopicsSection />
                    <LocationsSection />
                    <PricingCTASection />
                </main>
            </Layout>
        </div>
    )
} 