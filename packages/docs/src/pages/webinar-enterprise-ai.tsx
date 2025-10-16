import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import LazyThreeScene from '@site/src/components/LazyThreeScene'
import WebinarRegistrationForm from '@site/src/components/WebinarRegistrationForm'
import WebinarCountdown from '@site/src/components/WebinarCountdown'
import WebinarCalendarButtons from '@site/src/components/WebinarCalendarButtons'
import { webinarConfig, getAvailableSeats, getLocalWebinarDateTime, getRegistrationDeadline } from '@site/src/config/webinarContent'
import { trackingService } from '@site/src/services/trackingService'

import styles from './index.module.css'

const RiskAssurances = () => (
    <ul className={styles.riskList}>
        <li>✅ 30-day replay access + slides</li>
        <li>✅ Zero sales pitch — just frameworks and dashboards</li>
        <li>✅ Privacy-first: your email stays with us (no spam)</li>
        <li>✅ Can&apos;t attend live? Register anyway and we&apos;ll deliver the replay + toolkit automatically</li>
    </ul>
)

function WebinarHero() {
    const formatUrgencyMessage = (available: number) => {
        if (!webinarConfig.scarcity) {
            if (available <= 10) return `Only ${available} seats left!`
            if (available <= 50) return `${available} seats remaining`
            return `Limited to ${webinarConfig.maxSeats} seats`
        }

        const template = webinarConfig.scarcity.urgencyMessages[0] || '{remainingSeats} seats remaining'
        return template.replace('{remainingSeats}', Math.max(available, 0).toString())
    }

    const [availableSeats, setAvailableSeats] = useState(getAvailableSeats())
    const [urgencyMessage, setUrgencyMessage] = useState(() => formatUrgencyMessage(getAvailableSeats()))
    const [localDateTime, setLocalDateTime] = useState(() => getLocalWebinarDateTime())
    const registrationDeadline = getRegistrationDeadline()

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const updateAvailability = () => {
            try {
                const localRegistrations = Number(window.localStorage.getItem('webinar_registration_local_count') || '0')
                const adjusted = Math.max(getAvailableSeats() - localRegistrations, 0)
                setAvailableSeats(adjusted)
                setUrgencyMessage(formatUrgencyMessage(adjusted))
            } catch (error) {
                console.warn('Unable to sync local registration count', error)
            }
        }

        const handleLocalRegistration = () => updateAvailability()

        updateAvailability()

        window.addEventListener('storage', updateAvailability)
        window.addEventListener('webinar-registration-success', handleLocalRegistration)

        const intervalId = window.setInterval(updateAvailability, 60000)

        return () => {
            window.removeEventListener('storage', updateAvailability)
            window.removeEventListener('webinar-registration-success', handleLocalRegistration)
            window.clearInterval(intervalId)
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        setLocalDateTime(getLocalWebinarDateTime())
    }, [])

    const heroBullets = [
        {
            icon: '⚙️',
            copy: '4-week enterprise rollout: multiple disconnected systems unified into one governed AI assistant.'
        },
        {
            icon: '💰',
            copy: 'Targeting 6-figure annual savings: automation frameworks proven in live deployments.'
        },
        {
            icon: '🛡️',
            copy: 'Security-first: SOC 2 evidence pack, SSO/SAML patterns, and data residency options baked in.'
        },
        {
            icon: '🧭',
            copy: 'Change enablement: stakeholder scripts, rollout comms, and adoption metrics ready to reuse.'
        },
        {
            icon: '🚀',
            copy: '30-day pilot guarantee: qualification checklist + risk-free governance review to get sign-off fast.'
        },
        {
            icon: '🤝',
            copy: 'Hybrid support: live AnswerAgent voice coaches plus human office hours so your team isn&apos;t alone day one.'
        }
    ]

    const [activeBulletIndex, setActiveBulletIndex] = useState(0)

    useEffect(() => {
        if (heroBullets.length <= 1 || typeof window === 'undefined') {
            return
        }

        const intervalId = window.setInterval(() => {
            setActiveBulletIndex((prev) => (prev + 1) % heroBullets.length)
        }, 6000)

        return () => window.clearInterval(intervalId)
        // heroBullets length is constant within render; safe to omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCarouselSelect = (index: number) => {
        setActiveBulletIndex(index)
    }

    const deadlineLabel = (() => {
        if (!registrationDeadline) return null
        try {
            const date = new Date(registrationDeadline)
            if (Number.isNaN(date.getTime())) return null
            return new Intl.DateTimeFormat(undefined, {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            }).format(date)
        } catch (error) {
            console.warn('Unable to format registration deadline', error)
            return null
        }
    })()

    return (
        <header className={clsx('hero hero--primary', styles.heroSection, styles.landingHero)}>
            <div className={styles.heroBackground}>
                <LazyThreeScene className={styles.threeJsCanvas} fallbackClassName={styles.heroFallback} />
            </div>
            <div className={clsx('container', styles.heroContainer)}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <div className={styles.heroEyebrow}>
                            <span role='img' aria-hidden='true'>
                                🔴
                            </span>
                            <span>Free Live Workshop • {localDateTime}</span>
                        </div>

                        <h1 className={styles.heroHeadline}>{webinarConfig.headlines.primary}</h1>

                        <p className={styles.heroSubhead}>
                            Join Brad Taylor (CEO), Adam Harris (COO), and Max Techera (CTO) as they show the exact AI orchestration system
                            and framework they built to deploy enterprise AI agents in weeks, not months.
                        </p>

                        <div className={styles.heroHighlightsHeading}>What you&apos;ll see live</div>
                        <div className={styles.heroCarousel} aria-live='polite' aria-atomic='true'>
                            <div key={activeBulletIndex} className={styles.heroCarouselCard}>
                                <span className={styles.heroCarouselIcon} aria-hidden='true'>
                                    {heroBullets[activeBulletIndex].icon}
                                </span>
                                <p className={styles.heroCarouselCopy}>{heroBullets[activeBulletIndex].copy}</p>
                            </div>

                            <div className={styles.heroCarouselIndicators} role='tablist' aria-label='Webinar highlights'>
                                {heroBullets.map((bullet, index) => (
                                    <button
                                        key={bullet.copy}
                                        type='button'
                                        className={clsx(
                                            styles.heroCarouselIndicator,
                                            index === activeBulletIndex && styles.heroCarouselIndicatorActive
                                        )}
                                        onClick={() => handleCarouselSelect(index)}
                                        aria-label={`Show highlight ${index + 1}: ${bullet.copy}`}
                                        aria-pressed={index === activeBulletIndex}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div id='hero-registration' className={styles.heroFormCard}>
                        <div className={styles.scarcityBadge}>
                            <span role='img' aria-hidden='true'>
                                ⚡
                            </span>
                            <span>
                                {urgencyMessage} • {availableSeats} seats left
                                {deadlineLabel ? ` • Closes ${deadlineLabel}` : ''}
                            </span>
                        </div>

                        <div className={styles.heroFormHeading}>
                            <h3>Save Your Seat — Free</h3>
                            <p>Live demo + 30-day replay • No sales pitch, just the playbooks</p>
                        </div>

                        <WebinarRegistrationForm />

                        <div className={styles.formCountdown}>
                            <WebinarCountdown compact />
                        </div>

                        <RiskAssurances />
                    </div>
                </div>
            </div>
        </header>
    )
}

function HeroProofSection() {
    const pressFeatures = webinarConfig.pressFeatures || []
    const testimonial =
        webinarConfig.testimonialQuotes?.[0] ||
        ({
            quote: '"We are seeing promising early results from unifying our scattered systems into one AI interface."',
            author: 'Customer Success Lead',
            company: 'Enterprise Technology'
        } as const)

    const hasPress = pressFeatures.length > 0
    const hasTestimonial = Boolean(testimonial?.quote)

    if (!hasPress && !hasTestimonial) {
        return null
    }

    return (
        <section className={styles.heroProofSection} aria-labelledby='hero-proof-heading'>
            <div className='container'>
                <div className={styles.heroProofGrid}>
                    {hasPress && (
                        <div>
                            <p id='hero-proof-heading' className={styles.heroProofLabel}>
                                Featured by leading enterprise innovators
                            </p>
                            <div className={styles.logoStrip}>
                                {pressFeatures.map((feature) => (
                                    <span key={feature.name}>{feature.label || feature.name}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {hasTestimonial && (
                        <div className={styles.testimonialCard}>
                            <div>{testimonial.quote}</div>
                            <div className={styles.testimonialAuthor}>
                                <span role='img' aria-hidden='true'>
                                    ⭐
                                </span>
                                <span>
                                    {testimonial.author}
                                    {testimonial.company ? `, ${testimonial.company}` : ''}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

function ValueProposition() {
    return (
        <section
            style={{
                backgroundColor: 'rgba(10, 25, 47, 0.95)',
                padding: '5rem 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            id='value'
        >
            <div className='container'>
                <div className='row'>
                    <div className='col col--10 col--offset-1'>
                        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2
                                style={{
                                    fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                                    marginBottom: '1rem',
                                    fontWeight: '600',
                                    background: 'linear-gradient(135deg, #ffffff, #00ffff)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                What You&apos;ll Learn in 60 Minutes
                            </h2>
                            <p
                                style={{
                                    fontSize: '1.1rem',
                                    opacity: 0.8,
                                    maxWidth: '600px',
                                    margin: '0 auto'
                                }}
                            >
                                No fluff, no theory. Just the proven frameworks that work.
                            </p>
                        </div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '2rem',
                                marginBottom: '3rem'
                            }}
                        >
                            <div
                                style={{
                                    padding: '2rem',
                                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    border: '2px solid #00ffff'
                                }}
                            >
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                                <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Live 4-Week Framework</h3>
                                <p style={{ fontSize: '1.1rem' }}>
                                    Watch the exact deployment process used to go from scattered systems to unified AI in just 4-6 weeks.
                                </p>
                            </div>

                            <div
                                style={{
                                    padding: '2rem',
                                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                    borderRadius: '12px',
                                    border: '2px solid #00ff00'
                                }}
                            >
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
                                <h3 style={{ color: '#00ff00', marginBottom: '1rem' }}>Real ROI Numbers</h3>
                                <p style={{ fontSize: '1.1rem' }}>
                                    100+ hours/week saved potential, dramatically faster search times, 6-figure annual savings projected.
                                    See the framework.
                                </p>
                            </div>

                            <div
                                style={{
                                    padding: '2rem',
                                    backgroundColor: 'rgba(255, 255, 0, 0.1)',
                                    borderRadius: '12px',
                                    border: '2px solid #ffff00'
                                }}
                            >
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
                                <h3 style={{ color: '#ffff00', marginBottom: '1rem' }}>No Vendor Lock-in</h3>
                                <p style={{ fontSize: '1.1rem' }}>
                                    Swap OpenAI ↔ Claude ↔ Gemini instantly. Keep full control of your AI stack.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function LimitedBonusSection() {
    const bonus = webinarConfig.limitedBonus

    if (!bonus) {
        return null
    }

    return (
        <section className={styles.bonusSection} id='limited-bonus'>
            <div className='container'>
                <div className={styles.bonusCard}>
                    <div>
                        <span className={styles.bonusBadge}>Exclusive Bonus</span>
                        <h2>{bonus.headline}</h2>
                        <p>{bonus.subhead}</p>
                    </div>
                    <ul>
                        {bonus.perks.map((perk) => (
                            <li key={perk}>⚡ {perk}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}

function CustomerLogosSection() {
    const stats = webinarConfig.customerStats
    const customers = [
        {
            name: 'Fortune 500 AdTech',
            highlight: '4-6 week deployment • Multiple systems unified',
            metric: stats.adtech?.roi || 'Targeting 30%+ faster resolution'
        },
        {
            name: 'Leading Financial Services',
            highlight: 'Target: 100+ hours/week automated',
            metric: stats.financial?.saved || 'Projected 6-figure annual savings'
        },
        {
            name: 'Healthcare Technology',
            highlight: 'Multiple teams in pilot',
            metric: stats.healthcare?.search || 'Dramatically faster search'
        },
        {
            name: 'Major Telecom Provider',
            highlight: 'Workflow automation underway',
            metric: stats.telecom?.conversion || 'Active POC in progress'
        },
        {
            name: 'Enterprise SaaS Platform',
            highlight: 'Knowledge bases being unified',
            metric: stats.saas?.roi || 'AI-powered responses in testing'
        }
    ]

    const getInitials = (name: string) =>
        name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 3)

    return (
        <section className={styles.customerLogoSection} id='customer-proof'>
            <div className='container'>
                <h2 className={styles.sectionTitle}>Trusted by teams shipping enterprise AI in weeks</h2>
                <p className={styles.sectionSubtitle}>
                    These teams used the playbook you&apos;ll learn on Thursday to launch compliance-ready AI agents and unlock immediate
                    ROI.
                </p>
                <div className={styles.customerLogoGrid}>
                    {customers.map((customer) => (
                        <div key={customer.name} className={styles.customerLogoCard}>
                            <div className={styles.customerLogoInitials} aria-hidden='true'>
                                {getInitials(customer.name)}
                            </div>
                            <div className={styles.customerLogoName}>{customer.name}</div>
                            <div className={styles.customerLogoHighlight}>{customer.highlight}</div>
                            <div className={styles.customerLogoMetric}>{customer.metric}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function ValueStackSection() {
    const bonuses = [
        {
            label: 'Live 60-minute enterprise AI deployment training',
            value: '$497 value'
        },
        {
            label: '4-week implementation worksheet',
            value: '$197 value'
        },
        {
            label: 'Enterprise AI readiness checklist',
            value: '$97 value'
        },
        {
            label: 'ROI calculator template',
            value: '$147 value'
        },
        {
            label: 'Security & compliance whitepaper',
            value: '$97 value'
        }
    ]

    return (
        <section className={styles.valueStackSection} id='value-stack'>
            <div className='container'>
                <h2 className={styles.sectionTitle}>What You Get When You Register Today</h2>
                <p className={styles.sectionSubtitle}>
                    Everything you need to execute a board-ready AI project in the next 90 days — yours free just for attending live.
                </p>
                <div className={styles.valueStackGrid}>
                    {bonuses.map((bonus) => (
                        <div key={bonus.label} className={styles.valueCard}>
                            <div style={{ fontSize: '1.5rem' }} role='img' aria-hidden='true'>
                                ✅
                            </div>
                            <strong>{bonus.label}</strong>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem' }}>{bonus.value}</div>
                        </div>
                    ))}
                </div>
                <div className={styles.valueTotal}>Total value: $1,035 — access it all free on Thursday.</div>
            </div>
        </section>
    )
}

function MidPageCTA() {
    return (
        <section className={styles.midCtaSection} id='mid-registration'>
            <div className='container'>
                <div className={styles.midCtaCard}>
                    <div className={styles.midCtaCopy}>
                        <h2>Need the playbook before Thursday?</h2>
                        <p>Drop your email to hold your seat and get the Enterprise AI readiness checklist + ROI worksheet immediately.</p>
                    </div>
                    <div className={styles.midCtaForm}>
                        <WebinarRegistrationForm />
                        <div className={styles.formCountdown}>
                            <WebinarCountdown compact />
                        </div>
                        <RiskAssurances />
                    </div>
                </div>
            </div>
        </section>
    )
}

function CustomerSuccessSection() {
    return (
        <section
            style={{
                backgroundColor: 'rgba(5, 15, 30, 0.8)',
                padding: '5rem 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            id='customer-results'
        >
            <div className='container'>
                <h2 className={styles.sectionTitle}>Real Results from Real Teams</h2>
                <p className={styles.sectionSubtitle}>
                    Proof that the 4-week deployment framework delivers measurable ROI across finance, advertising, healthcare, and telecom.
                </p>

                <div className={styles.testimonialGrid}>
                    <div className={styles.miniStat}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💰</div>
                        <div className={styles.miniStatValue}>6-Figure</div>
                        <div className={styles.miniStatLabel}>Projected annual savings</div>
                        <p style={{ marginTop: '1.25rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            Target: automating 100+ analyst-hours weekly through intelligent document routing and processing workflows.
                        </p>
                    </div>

                    <div className={styles.miniStat}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚡</div>
                        <div className={styles.miniStatValue}>4-6 weeks</div>
                        <div className={styles.miniStatLabel}>Typical deployment timeline</div>
                        <p style={{ marginTop: '1.25rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            Unifying scattered systems into a single AI interface with complete audit trails and compliance approvals.
                        </p>
                    </div>

                    <div className={styles.miniStat}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚀</div>
                        <div className={styles.miniStatValue}>3× Faster</div>
                        <div className={styles.miniStatLabel}>Sales enablement improvement</div>
                        <p style={{ marginTop: '1.25rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            Distributed teams getting answers in seconds, freeing operations to focus on strategic initiatives and
                            compliance.
                        </p>
                    </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: '3rem', fontSize: '1rem', color: 'rgba(255,255,255,0.75)' }}>
                    💡 Thursday&apos;s session walks through these playbooks step-by-step so you can replicate them inside your org.
                </p>
            </div>
        </section>
    )
}

function PresenterSection() {
    const highlights = webinarConfig.hostHighlights || []

    return (
        <section className={styles.presenterSection} id='hosts'>
            <div className='container'>
                <div className={styles.presenterIntro}>
                    <h2 className={styles.sectionTitle}>Meet Your Hosts</h2>
                    <p className={styles.sectionSubtitle}>
                        Brad Taylor, Adam Harris, and Max Techera are the founding team behind AnswerAI and Last Rev, with deep experience
                        at Google, Optimizely, and building enterprise-scale AI platforms.
                    </p>
                </div>

                <div className={styles.presenterGrid}>
                    {webinarConfig.speakers.map((speaker) => {
                        const highlight = highlights.find((h) => h.speaker === speaker.name)?.highlight
                        return (
                            <div key={speaker.name} className={styles.presenterCard}>
                                <div className={styles.presenterHeader}>
                                    {speaker.image ? (
                                        <img src={speaker.image} alt={speaker.name} className={styles.presenterPhoto} />
                                    ) : (
                                        <div className={styles.presenterPlaceholder} aria-hidden='true'>
                                            {speaker.name
                                                .split(' ')
                                                .map((part) => part[0])
                                                .join('')}
                                        </div>
                                    )}
                                    <div>
                                        <h3>{speaker.name}</h3>
                                        <p className={styles.presenterTitle}>{speaker.title}</p>
                                    </div>
                                </div>
                                <p className={styles.presenterBio}>{speaker.bio}</p>
                                {highlight && <div className={styles.presenterHighlight}>{highlight}</div>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

function IntroVideoSection() {
    const video = webinarConfig.introVideo

    if (!video?.url) {
        return null
    }

    return (
        <section className={styles.videoSection} id='intro-video'>
            <div className='container'>
                <div className={styles.videoWrapper}>
                    <div className={styles.videoFrame}>
                        <iframe
                            src={video.url}
                            title='Enterprise AI Webinar Intro'
                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                            allowFullScreen
                        />
                    </div>
                    {video.caption && <p className={styles.videoCaption}>{video.caption}</p>}
                </div>
            </div>
        </section>
    )
}

function TestimonialsCarousel() {
    const testimonials = webinarConfig.testimonialQuotes || []
    const [activeIndex, setActiveIndex] = useState(0)

    useEffect(() => {
        if (testimonials.length <= 1) return undefined

        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % testimonials.length)
        }, 6000)

        return () => clearInterval(timer)
    }, [testimonials.length])

    if (!testimonials.length) {
        return null
    }

    const active = testimonials[activeIndex]

    return (
        <section className={styles.carouselSection} id='testimonials'>
            <div className='container'>
                <h2 className={styles.sectionTitle}>What Leaders Say About the Workshop</h2>
                <div className={styles.carouselCard}>
                    <p className={styles.carouselQuote}>{active.quote}</p>
                    <p className={styles.carouselAuthor}>
                        {active.author}
                        {active.role ? `, ${active.role}` : ''}
                        {active.company ? ` • ${active.company}` : ''}
                    </p>
                    <div className={styles.carouselDots}>
                        {testimonials.map((_, index) => (
                            <button
                                key={`testimonial-${index}`}
                                type='button'
                                aria-label={`Show testimonial ${index + 1}`}
                                className={clsx(styles.carouselDot, index === activeIndex && styles.carouselDotActive)}
                                onClick={() => setActiveIndex(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function ToolkitPreviewSection() {
    const toolkit = webinarConfig.toolkitPreview || []

    if (!toolkit.length) {
        return null
    }

    return (
        <section className={styles.toolkitSection} id='toolkit'>
            <div className='container'>
                <h2 className={styles.sectionTitle}>Peek Inside the Implementation Toolkit</h2>
                <p className={styles.sectionSubtitle}>
                    Download everything the moment you register so you can execute the 30/60/90-day plan without guesswork.
                </p>
                <div className={styles.toolkitGrid}>
                    {toolkit.map((item) => (
                        <div key={item.title} className={styles.toolkitCard}>
                            <div className={styles.toolkitIcon} aria-hidden='true'>
                                📦
                            </div>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function RoadmapSection() {
    const roadmap = webinarConfig.roadmap || []

    if (!roadmap.length) {
        return null
    }

    return (
        <section className={styles.roadmapSection} id='roadmap'>
            <div className='container'>
                <h2 className={styles.sectionTitle}>Your First 30 Days, Mapped Out</h2>
                <p className={styles.sectionSubtitle}>
                    Walk away with a step-by-step execution plan so your team knows exactly what happens after the webinar.
                </p>
                <div className={styles.roadmapGrid}>
                    {roadmap.map((step) => (
                        <div key={step.phase} className={styles.roadmapCard}>
                            <div className={styles.roadmapHeader}>
                                <span className={styles.roadmapPhase}>{step.phase}</span>
                                <span className={styles.roadmapDuration}>{step.duration}</span>
                            </div>
                            <ul>
                                {step.outcomes.map((outcome) => (
                                    <li key={`${step.phase}-${outcome}`}>{outcome}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function AgendaSection() {
    return (
        <section
            style={{
                backgroundColor: 'rgba(15, 30, 50, 0.9)',
                padding: '5rem 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            id='agenda'
        >
            <div className='container'>
                <h2 className={styles.sectionTitle}>60-Minute Game Plan</h2>
                <p className={styles.sectionSubtitle}>
                    We move fast — you&apos;ll leave with a week-by-week rollout timeline, governance blueprint, and next-step checklist.
                </p>

                <div className='row'>
                    <div className='col col--8 col--offset-2'>
                        {webinarConfig.agenda.map((item, index) => (
                            <div key={index} className={clsx(styles.featureCard, styles.stepCard)} style={{ marginBottom: '1rem' }}>
                                <div className={styles.stepNumber} style={{ minWidth: '60px', fontSize: '0.9rem' }}>
                                    {item.time}
                                </div>
                                <div>
                                    <h4>{item.topic}</h4>
                                    <p>{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function FinalCTA() {
    return (
        <section
            style={{
                backgroundColor: 'rgba(0, 10, 25, 0.95)',
                padding: '6rem 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            id='final-cta'
        >
            <div className='container'>
                <div className='row'>
                    <div className='col col--10 col--offset-1'>
                        <div className={styles.finalCtaCard}>
                            <h2 className={styles.finalCtaHeadline}>Ready to Launch an AI Win in the Next 30 Days?</h2>
                            <p className={styles.finalCtaCopy}>
                                Save your seat for Thursday&apos;s live workshop and walk away with the exact templates, governance
                                safeguards, and deployment timeline that&apos;s driving success for leading enterprises.
                            </p>

                            <div
                                id='final-registration'
                                style={{
                                    maxWidth: '520px',
                                    margin: '0 auto',
                                    background: 'rgba(0,0,0,0.35)',
                                    padding: '2.25rem',
                                    borderRadius: '14px'
                                }}
                            >
                                <h3 style={{ color: '#ffff80', marginBottom: '1.25rem' }}>Reserve your free seat now</h3>
                                <WebinarRegistrationForm />
                                <div className={styles.formCountdown}>
                                    <WebinarCountdown compact />
                                </div>
                                <RiskAssurances />
                                <WebinarCalendarButtons />
                            </div>

                            <div className={styles.finalCtaFooter}>
                                {getLocalWebinarDateTime()} • 60 minutes + live Q&A • Bonus toolkit delivered right after the session
                                <br />
                                500+ AI leaders registered — seats refresh daily
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function SimpleFAQ() {
    return (
        <section
            style={{
                backgroundColor: 'rgba(8, 20, 35, 0.9)',
                padding: '4rem 0 6rem 0'
            }}
            id='faq'
        >
            <div className='container'>
                <div className='row'>
                    <div className='col col--10 col--offset-1'>
                        <h2 className={styles.sectionTitle}>Quick Answers Before You Register</h2>
                        <p className={styles.sectionSubtitle}>
                            Bring your questions — we handle the strategy, compliance, and execution details live.
                        </p>

                        <div className={styles.faqGrid}>
                            <div className={styles.faqCard}>
                                <h4>Is this a sales pitch?</h4>
                                <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                                    Nope. It&apos;s a live teardown of the frameworks and dashboards that drive our enterprise deployments.
                                    You&apos;ll see product, but there&apos;s no sales deck.
                                </p>
                            </div>

                            <div className={styles.faqCard}>
                                <h4>Will it be recorded?</h4>
                                <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                                    Yes — register and you&apos;ll get 30-day replay access plus the slide deck, worksheets, and toolkit
                                    downloads.
                                </p>
                            </div>

                            <div className={styles.faqCard}>
                                <h4>What if I can&apos;t attend live?</h4>
                                <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                                    Secure your seat anyway and catch the replay. We&apos;ll also send the templates and instructions so you
                                    can execute at your pace.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function StickyCTA() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const handleVisibility = () => {
            const heroRegistration = document.getElementById('hero-registration')
            const finalRegistration = document.getElementById('final-registration')

            const elementIsInViewport = (element: HTMLElement | null) => {
                if (!element) return false
                const rect = element.getBoundingClientRect()
                return rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15
            }

            const shouldShow = window.scrollY > 320 && !elementIsInViewport(heroRegistration) && !elementIsInViewport(finalRegistration)
            setVisible(shouldShow)
        }

        handleVisibility()
        window.addEventListener('scroll', handleVisibility)
        window.addEventListener('resize', handleVisibility)

        return () => {
            window.removeEventListener('scroll', handleVisibility)
            window.removeEventListener('resize', handleVisibility)
        }
    }, [])

    const scrollToForm = () => {
        const target = document.getElementById('hero-registration')
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    const seatsLeft = getAvailableSeats()
    const localTime = getLocalWebinarDateTime()

    return (
        <>
            <div className={clsx(styles.desktopStickyHeader, visible && styles.desktopStickyHeaderVisible)}>
                <div className={styles.desktopStickyInner}>
                    <span>
                        Next live session: <strong>{localTime}</strong> • {seatsLeft} seats left
                    </span>
                    <button type='button' className={styles.stickyCtaButton} onClick={scrollToForm}>
                        Save My Seat - Free
                    </button>
                </div>
            </div>

            <div className={clsx(styles.stickyCtaBar, visible && styles.stickyCtaBarVisible)}>
                <div>
                    <div style={{ fontWeight: 600 }}>Save Your Seat Now</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Live {localTime} • {seatsLeft} seats left • 60-minute playbook + toolkit
                    </div>
                </div>
                <button type='button' className={styles.stickyCtaButton} onClick={scrollToForm}>
                    Save My Seat - Free
                </button>
            </div>
        </>
    )
}

export default function WebinarEnterpriseAI(): JSX.Element {
    // Initialize page tracking
    useEffect(() => {
        trackingService.trackPageView('/webinar-enterprise-ai', 'Enterprise AI Webinar Landing Page')

        // Track content engagement for different sections when they come into view
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px 0px -10% 0px'
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id
                    if (sectionId) {
                        trackingService.trackContentEngagement('section', sectionId)
                    }
                }
            })
        }, observerOptions)

        // Observe all sections
        const sections = document.querySelectorAll('section[id]')
        sections.forEach((section) => observer.observe(section))

        return () => {
            observer.disconnect()
        }
    }, [])

    return (
        <div data-theme='dark'>
            <Layout
                title='Enterprise AI Webinar - Deploy AI Agents in weeks'
                description='Free Thursday webinar: From AI Chaos to Enterprise Success. See how leading enterprises are deploying AI in weeks vs 6+ months. Live demo of vendor-free framework.'
                noNavbar
            >
                <WebinarHero />
                <main>
                    <HeroProofSection />
                    <PresenterSection />
                    <IntroVideoSection />
                    <LimitedBonusSection />
                    <CustomerLogosSection />
                    <ValueProposition />
                    <ToolkitPreviewSection />
                    <ValueStackSection />
                    <MidPageCTA />
                    <CustomerSuccessSection />
                    <TestimonialsCarousel />
                    <RoadmapSection />
                    <AgendaSection />
                    <FinalCTA />
                    <SimpleFAQ />
                </main>
                <StickyCTA />
            </Layout>
        </div>
    )
}
