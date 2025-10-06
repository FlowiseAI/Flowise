import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import JsonLd from '@site/src/components/JsonLd'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import UsingAnswerAgentAISubmenu from '@site/src/components/UsingAnswerAgentAISubmenu'

import styles from './index.module.css'

function PartnershipHero() {
    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} />
            </div>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Cryptographically-Verifiable AI Collaboration</h1>
                <p className={styles.heroSubtitle} style={{ fontSize: '1.3rem', maxWidth: '800px', margin: '0 auto' }}>
                    Answer Agents × JLINC brings immutable data provenance to AI agent workflows—finally enabling trustworthy AI adoption in
                    public companies and regulated enterprises.
                </p>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        margin: '1.5rem 0',
                        fontSize: '0.9rem',
                        opacity: 0.8
                    }}
                >
                    <span>SOX</span>
                    <span>•</span>
                    <span>FINRA</span>
                    <span>•</span>
                    <span>HIPAA</span>
                    <span>•</span>
                    <span>SEC Compliance</span>
                </div>
                <div className={styles.heroCTAs}>
                    <a href='#demo' className={clsx(styles.ctaButton, styles.ctaPrimary)}>
                        Schedule 30-Minute Demo
                    </a>
                    <div className={styles.secondaryLinks}>
                        <a href='#solution' className={styles.secondaryLink}>
                            How It Works
                        </a>
                        <a href='#architecture' className={styles.secondaryLink}>
                            Technical Architecture
                        </a>
                    </div>
                </div>
                <div
                    style={{
                        marginTop: '2rem',
                        display: 'flex',
                        gap: '2rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        fontSize: '0.85rem',
                        opacity: 0.7
                    }}
                >
                    <span>Asynchronous stamping</span>
                    <span>Vendor-neutral</span>
                    <span>W3C DID-compliant</span>
                    <span>Patent-protected (US PTO 2023)</span>
                </div>
            </div>
        </header>
    )
}

function VisionSection() {
    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Why This Partnership Matters
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Solving AI's Trust Gap</h2>

                <div style={{ maxWidth: '900px', margin: '0 auto 3rem', fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.9 }}>
                    <p>
                        As AI capabilities accelerate, a critical barrier emerges: <strong>How do you trust what AI produces?</strong> For
                        public companies and regulated industries, this isn't philosophical—it's existential. Boards won't approve
                        AI-assisted 10-Ks without provable lineage. Auditors won't sign off on AI-generated risk reports without
                        tamper-evident trails. Compliance officers won't deploy AI workflows that can't demonstrate complete chain of
                        custody.
                    </p>
                    <p style={{ marginTop: '1.5rem' }}>
                        <strong>Answer Agents and JLINC are pioneering the solution.</strong>
                    </p>
                    <p style={{ marginTop: '1.5rem' }}>
                        By combining Answer Agents' sophisticated AI orchestration with JLINC's cryptographic provenance protocol, we're
                        creating something unprecedented: AI workflows where every decision is traceable, every contribution is accountable,
                        and every output is auditable.
                    </p>
                </div>

                <div className='row' style={{ marginTop: '3rem' }}>
                    <div className='col col--6'>
                        <div className={styles.featureCard} style={{ height: '100%' }}>
                            <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Answer Agents Brings</h3>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'grid', gap: '0.75rem' }}>
                                <li>AI orchestration & workflow automation</li>
                                <li>Human-in-the-loop collaboration</li>
                                <li>Multi-model & multi-tool integration</li>
                                <li>Enterprise deployment infrastructure</li>
                            </ul>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard} style={{ height: '100%' }}>
                            <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>JLINC Brings</h3>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'grid', gap: '0.75rem' }}>
                                <li>Cryptographic signature protocol (public key cryptography)</li>
                                <li>Information Sharing Agreements (ISA)</li>
                                <li>Vendor-neutral ledger anchoring</li>
                                <li>W3C DID method specification</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{
                        marginTop: '2rem',
                        maxWidth: '700px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        textAlign: 'center',
                        fontSize: '1.15rem'
                    }}
                >
                    <strong>Together:</strong> Verifiable AI Collaboration—where trust is cryptographically guaranteed, not promised.
                </div>
            </div>
        </section>
    )
}

function ProblemSection() {
    const problems = [
        {
            icon: '📄',
            title: 'Where did this come from?',
            pain: 'AI generates earnings reports mixing data from 15 sources. Auditor asks: "Prove these numbers came from approved systems."',
            reality: 'Screenshots, log files, trust',
            problem: 'Not sufficient for SOX compliance'
        },
        {
            icon: '👁️',
            title: 'What exactly did the AI see?',
            pain: 'Agent analyzes confidential merger docs. Legal asks: "Show us exactly what context the AI had."',
            reality: 'Best-effort prompt logs, often incomplete',
            problem: 'Not admissible as evidence'
        },
        {
            icon: '✍️',
            title: 'Who made the final decision?',
            pain: 'AI drafts SEC filing, three executives review it. Board asks: "Who signed off on what?"',
            reality: 'Email threads, comments in Google Docs',
            problem: 'Not audit-ready, no cryptographic proof'
        }
    ]

    return (
        <section className={styles.featuresSection} id='problem'>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    The Questions Keeping Executives Up at Night
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>AI Adoption is Blocked by a Trust Gap</h2>

                <div className='row' style={{ marginTop: '3rem' }}>
                    {problems.map((item, idx) => (
                        <div key={idx} className='col col--4'>
                            <div className={styles.featureCard} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem', opacity: 0.5 }}>
                                    {item.icon}
                                </div>
                                <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>{item.title}</h3>
                                <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>{item.pain}</p>
                                <div style={{ marginTop: 'auto' }}>
                                    <div
                                        style={{
                                            background: 'rgba(255, 68, 68, 0.1)',
                                            border: '1px solid rgba(255, 68, 68, 0.3)',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            marginBottom: '0.5rem'
                                        }}
                                    >
                                        <strong style={{ fontSize: '0.85rem', color: '#ff9b9b' }}>Current reality:</strong> {item.reality}
                                    </div>
                                    <div
                                        style={{
                                            background: 'rgba(255, 255, 0, 0.1)',
                                            border: '1px solid rgba(255, 255, 0, 0.3)',
                                            borderRadius: '8px',
                                            padding: '0.75rem'
                                        }}
                                    >
                                        <strong style={{ fontSize: '0.85rem', color: '#ffff80' }}>Problem:</strong> {item.problem}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{ marginTop: '3rem', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}
                >
                    <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '0.5rem' }}>
                        Without verifiable provenance, AI adoption in regulated industries remains limited by trust concerns.
                    </strong>
                    <span style={{ opacity: 0.9 }}>
                        Boards, auditors, and compliance teams need cryptographic proof—not just logs—to approve AI-assisted workflows.
                    </span>
                </div>
            </div>
        </section>
    )
}

function SolutionSection() {
    const steps = [
        {
            number: '1',
            icon: '📄',
            title: 'Source Verification',
            subtitle: 'Ingested documents',
            detail: 'SHA-256 hash of each document signed via JLINC agreement',
            result: 'Provable origin of all inputs'
        },
        {
            number: '2',
            icon: '🤖',
            title: 'Agent Reasoning',
            subtitle: 'Agent processes data',
            detail: 'Prompts, context windows, and intermediate outputs cryptographically stamped',
            result: 'Auditable AI decision-making'
        },
        {
            number: '3',
            icon: '👤',
            title: 'Human Collaboration',
            subtitle: 'Human review & edits',
            detail: 'Each human action appended as new JLINC event with identity verification',
            result: 'Clear accountability'
        },
        {
            number: '4',
            icon: '📊',
            title: 'Final Output',
            subtitle: 'Published report',
            detail: 'Final document hash linked to complete lineage chain',
            result: 'One-click audit trail reproduction'
        }
    ]

    return (
        <section className={styles.missionSection} id='solution'>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    How the Integration Works
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Immutable Chain of Custody for AI Workflows</h2>
                <p className={clsx(styles.sectionLead, 'text--center')} style={{ maxWidth: '800px', margin: '1rem auto 3rem' }}>
                    Every step—from data ingestion to final report—is cryptographically stamped and anchored to an immutable ledger
                </p>

                <div className='row'>
                    {steps.map((step, idx) => (
                        <div key={idx} className='col col--3'>
                            <div className={styles.featureCard} style={{ height: '100%', position: 'relative' }}>
                                <div className={styles.stepNumber} style={{ marginBottom: '0.5rem' }}>
                                    {step.number}
                                </div>
                                <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' }}>{step.icon}</div>
                                <h3 style={{ color: '#00ffff', textAlign: 'center', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                    {step.title}
                                </h3>
                                <p style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                                    {step.subtitle}
                                </p>
                                <div
                                    style={{
                                        background: 'rgba(0, 255, 255, 0.08)',
                                        border: '1px solid rgba(0, 255, 255, 0.25)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        marginBottom: '0.75rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <strong>Technical:</strong> {step.detail}
                                </div>
                                <div
                                    style={{
                                        background: 'rgba(0, 255, 123, 0.08)',
                                        border: '1px solid rgba(0, 255, 123, 0.25)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <strong>Result:</strong> {step.result}
                                </div>
                                {idx < steps.length - 1 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: '-1rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            fontSize: '2rem',
                                            opacity: 0.3,
                                            display: 'none'
                                        }}
                                    >
                                        →
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{ marginTop: '2rem', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}
                >
                    <strong>Cryptographic Foundation:</strong> Every event is signed using standard public-key cryptography and anchored to
                    your chosen ledger—whether that's a private database, Hyperledger, or public blockchain.
                </div>
            </div>
        </section>
    )
}

function ComparisonSection() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    What Makes This Unique
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Beyond Traditional LLM Operations</h2>

                <div style={{ overflowX: 'auto', marginTop: '3rem' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 255, 255, 0.2)',
                            borderRadius: '12px'
                        }}
                    >
                        <thead>
                            <tr style={{ background: 'rgba(0, 255, 255, 0.1)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(0, 255, 255, 0.3)' }}>
                                    Capability
                                </th>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid rgba(0, 255, 255, 0.3)' }}>
                                    Conventional LLM Ops
                                </th>
                                <th
                                    style={{
                                        padding: '1rem',
                                        textAlign: 'left',
                                        borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
                                        background: 'rgba(0, 255, 255, 0.08)'
                                    }}
                                >
                                    Answer Agents + JLINC
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['Lineage Granularity', 'Best-effort prompt logs', 'Cryptographic event stream at context-window level'],
                                ['Proof Standard', 'Screenshot / PDF export', 'Ledger-backed, machine-verifiable receipts'],
                                [
                                    'Human ↔ AI Handshake',
                                    'Informal comments or approval emails',
                                    'Dual-signed cryptographic agreements (W3C DID-compliant)'
                                ],
                                ['Tamper Detection', 'File modification timestamps', 'Immutable chain-of-custody with hash verification'],
                                ['Audit Trail', 'Manual log review by auditors', 'Instant, reproducible provenance queries via API'],
                                [
                                    'Compliance',
                                    'Documentation assembled after-the-fact',
                                    'Built-in SOX/FINRA/HIPAA compliance from day one'
                                ],
                                [
                                    'Identity Verification',
                                    'Username/password authentication',
                                    'Cryptographic public-key identity (non-repudiable)'
                                ],
                                ['Ledger Flexibility', 'Proprietary databases', 'Vendor-neutral: private DB, Hyperledger, or public chain']
                            ].map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < 7 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600, color: '#00ffff' }}>{row[0]}</td>
                                    <td style={{ padding: '1rem', opacity: 0.7 }}>{row[1]}</td>
                                    <td style={{ padding: '1rem', background: 'rgba(0, 255, 255, 0.05)', fontWeight: 500 }}>{row[2]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{ marginTop: '2rem', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}
                >
                    This isn't just better logging—it's a{' '}
                    <strong style={{ color: '#00ffff' }}>fundamental shift in how AI systems prove their trustworthiness</strong>. From "we
                    logged it" to "it's cryptographically impossible to falsify."
                </div>
            </div>
        </section>
    )
}

function BenefitsSection() {
    const benefits = [
        {
            icon: '',
            title: 'Audit-Ready by Default',
            subtitle: 'For Auditors',
            description:
                'Zero-knowledge proofs of data lineage satisfy SOX, FINRA, HIPAA requirements. Verify the entire chain in seconds, not weeks.',
            detail: 'Machine-readable audit trails via API'
        },
        {
            icon: '',
            title: 'Tamper-Evident',
            subtitle: 'For Compliance Officers',
            description: 'Any change produces a new cryptographically signed event. Unauthorized edits are immediately detectable.',
            detail: 'Perfect for 21 CFR Part 11, GDPR Article 25'
        },
        {
            icon: '',
            title: 'Reproducible',
            subtitle: 'For Engineers',
            description: 'Recreate the exact state of any AI decision. Debug production issues by replaying provenance.',
            detail: 'Show precisely what the agent saw and why'
        },
        {
            icon: '',
            title: 'Vendor-Neutral',
            subtitle: 'For CTOs',
            description: 'JLINC hashes anchor to ANY ledger you choose. Not locked into blockchain vendor or infrastructure.',
            detail: 'Works with your existing security posture'
        },
        {
            icon: '',
            title: 'Non-Repudiable',
            subtitle: 'For Legal',
            description: 'Cryptographic signatures prove who authorized what. Dual-signed human-AI agreements defensible in court.',
            detail: 'Clear delineation of responsibility'
        },
        {
            icon: '',
            title: 'Scale with Confidence',
            subtitle: 'For Executives',
            description: 'Board members can trust AI-assisted strategic documents. Scale agent workflows without sacrificing governance.',
            detail: "Competitive advantage: deploy AI where others can't"
        }
    ]

    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Key Benefits
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Enterprise-Grade AI Governance</h2>

                <div className='row' style={{ marginTop: '3rem' }}>
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className='col col--4' style={{ marginBottom: '2rem' }}>
                            <div className={styles.featureCard} style={{ height: '100%' }}>
                                {benefit.icon && (
                                    <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' }}>{benefit.icon}</div>
                                )}
                                <h3 style={{ color: '#00ffff', textAlign: 'center', fontSize: '1.15rem', marginBottom: '0.25rem' }}>
                                    {benefit.title}
                                </h3>
                                <p style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>
                                    {benefit.subtitle}
                                </p>
                                <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>{benefit.description}</p>
                                <div
                                    style={{
                                        background: 'rgba(0, 255, 255, 0.08)',
                                        border: '1px solid rgba(0, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        padding: '0.5rem 0.75rem',
                                        fontSize: '0.85rem',
                                        fontStyle: 'italic'
                                    }}
                                >
                                    {benefit.detail}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function IndustryUseCases() {
    const industries = [
        {
            icon: '🏦',
            title: 'Financial Services',
            useCases: [
                'Earnings releases & 10-K filings',
                'Credit risk assessment reports',
                'Trading compliance monitoring',
                'SEC regulatory disclosures'
            ],
            regulations: 'SOX 404, FINRA 2210, SEC Regulation S-P',
            value: 'Prove to auditors that AI-assisted financial disclosures have complete, cryptographically-verified data lineage from source systems to published documents.'
        },
        {
            icon: '🏥',
            title: 'Healthcare & Life Sciences',
            useCases: ['Clinical trial data analysis', 'Adverse event reporting', 'IRB documentation', 'Medical research publications'],
            regulations: 'HIPAA, 21 CFR Part 11 (FDA), GDPR Article 9',
            value: 'Demonstrate that AI analysis of protected health information maintains complete chain of custody and consent tracking throughout the research lifecycle.'
        },
        {
            icon: '⚖️',
            title: 'Legal & Professional Services',
            useCases: ['E-discovery document analysis', 'Contract review & redlining', 'Due diligence reports', 'Attorney work product'],
            regulations: 'Attorney-client privilege, Federal Rules of Evidence',
            value: 'Create defensible AI-assisted legal work product with chain of custody provable in court. Maintain privilege while demonstrating competence.'
        },
        {
            icon: '🏢',
            title: 'Public Companies',
            useCases: [
                'ESG reporting & sustainability disclosures',
                'Board meeting materials',
                'Investor communications',
                'Strategic planning documents'
            ],
            regulations: 'SEC rules, NYSE/NASDAQ governance, SOX',
            value: 'Give your board confidence in AI-assisted strategic documents. Prove data sources, AI reasoning, and human review process for fiduciary duty compliance.'
        }
    ]

    return (
        <section className={styles.featuresSection} id='use-cases'>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Industry Use Cases
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Built for Enterprises That Can't Afford to Guess</h2>

                <div className='row' style={{ marginTop: '3rem' }}>
                    {industries.map((industry, idx) => (
                        <div key={idx} className='col col--6' style={{ marginBottom: '2rem' }}>
                            <div className={clsx(styles.featureCard, styles.integrationCard)}>
                                <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>{industry.icon}</div>
                                <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1.5rem' }}>{industry.title}</h3>

                                <div style={{ marginBottom: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem', color: '#00ffff' }}>Use Cases:</strong>
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                        {industry.useCases.map((useCase, i) => (
                                            <li key={i}>{useCase}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div
                                    style={{
                                        background: 'rgba(255, 255, 0, 0.08)',
                                        border: '1px solid rgba(255, 255, 0, 0.25)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        marginBottom: '1rem'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.85rem', color: '#ffff80' }}>Regulatory Frameworks:</strong>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>{industry.regulations}</p>
                                </div>

                                <div
                                    style={{
                                        background: 'rgba(0, 255, 255, 0.08)',
                                        border: '1px solid rgba(0, 255, 255, 0.25)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        fontSize: '0.9rem',
                                        fontStyle: 'italic'
                                    }}
                                >
                                    {industry.value}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function TechnicalArchitecture() {
    return (
        <section className={styles.missionSection} id='architecture'>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Technical Architecture
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Protocol-Based, Not Platform-Locked</h2>
                <p className={clsx(styles.sectionLead, 'text--center')} style={{ maxWidth: '700px', margin: '1rem auto 3rem' }}>
                    JLINC's open standard integrates seamlessly with Answer Agents' orchestration layer
                </p>

                <div
                    style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '900px',
                        margin: '0 auto 3rem'
                    }}
                >
                    <pre
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            lineHeight: '1.6',
                            color: '#00ffff',
                            margin: 0,
                            overflow: 'auto'
                        }}
                    >
                        {`┌─────────────────────────────────────────────────────────┐
│         ANSWER AGENTS ORCHESTRATION LAYER               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Agent Workflows (LangChain, Custom, Multi-Agent)│ │
│  └────────────┬──────────────────────────────────────┘ │
│               │                                          │
│  ┌────────────▼──────────────────────────────────────┐ │
│  │  JLINC Integration Middleware                     │ │
│  │  • Document Ingestion Hook                        │ │
│  │  • Agent Reasoning Logger                         │ │
│  │  • Human Interaction Capture                      │ │
│  │  • Output Verification Endpoint                   │ │
│  └────────────┬──────────────────────────────────────┘ │
└───────────────┼──────────────────────────────────────────┘
                │
                │ JLINC Protocol API
                │ (Curve25519 signatures, ISA framework)
                │
      ┌─────────▼─────────┐
      │  JLINC DATA LAYER │
      │  (Provenance API) │
      └─────────┬─────────┘
                │
     ┌──────────┼──────────┐
     │          │          │
     ▼          ▼          ▼
[Private     [Hyperledger] [Public
 Database]                 Blockchain]`}
                    </pre>
                </div>

                <div className='row'>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Integration Points</h3>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
                                <li>Document ingestion hook</li>
                                <li>Agent reasoning middleware</li>
                                <li>Human interaction logger</li>
                                <li>Output verification endpoint</li>
                            </ul>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={styles.featureCard}>
                            <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Cryptographic Approach</h3>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
                                <li>Public-key cryptographic signatures</li>
                                <li>SHA-256 content hashing</li>
                                <li>W3C DID method specification</li>
                                <li>Information Sharing Agreements (ISA)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--12'>
                        <div className={styles.featureCard}>
                            <h3 style={{ color: '#00ffff', marginBottom: '1rem', textAlign: 'center' }}>Deployment Options</h3>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <strong>Cloud-hosted</strong>
                                    <br />
                                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>AWS, Azure, GCP</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <strong>On-premises</strong>
                                    <br />
                                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Air-gapped supported</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <strong>Hybrid</strong>
                                    <br />
                                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>AI cloud, provenance on-prem</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <strong>Custom ledger</strong>
                                    <br />
                                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Your blockchain, your rules</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{ marginTop: '2rem', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}
                >
                    <strong>Performance:</strong> JLINC stamping happens asynchronously—minimal latency added per event. Your workflows run
                    at full speed with cryptographic verification in the background.
                </div>
            </div>
        </section>
    )
}

function AboutJLINCSection() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    About JLINC
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Powered by JLINC's Open Provenance Protocol</h2>

                <div style={{ maxWidth: '900px', margin: '2rem auto', fontSize: '1.05rem', lineHeight: '1.7', opacity: 0.9 }}>
                    <p>
                        Founded in 2015 by Jim Fournier and Victor Grey, JLINC set out to solve a fundamental problem:{' '}
                        <strong>How do you prove where information came from and who touched it?</strong> Not with proprietary databases or
                        vendor-locked platforms, but with an <strong>open protocol</strong> anyone can use.
                    </p>
                    <p style={{ marginTop: '1.5rem' }}>
                        The result: <strong>Information Sharing Agreements (ISA)</strong>—cryptographically signed contracts between systems
                        that create an immutable record of every data exchange.
                    </p>
                </div>

                <div className='row' style={{ marginTop: '3rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Protocol, Not Platform</h3>
                            <p>
                                JLINC isn't a blockchain company or SaaS vendor. It's an <strong>open protocol specification</strong> that
                                works with any infrastructure. Think of it like SMTP for provenance—a standard anyone can implement.
                            </p>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Patent-Protected Innovation</h3>
                            <p>
                                US Patent "Internet Data Usage Control Systems" issued January 17, 2023 by the US Patent and Trademark
                                Office. Legally protected intellectual property with nearly a decade of R&D.
                            </p>
                        </div>
                    </div>
                </div>

                <div className='row' style={{ marginTop: '2rem' }}>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Standards-Compliant</h3>
                            <p>
                                JLINC maintains a W3C-compatible Decentralized Identifier (DID) method, ensuring interoperability with
                                emerging digital identity standards.
                            </p>
                        </div>
                    </div>
                    <div className='col col--6'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Battle-Tested</h3>
                            <p>
                                In production since 2015, handling data provenance for enterprise workflows. Proven at scale in regulated
                                environments.
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: '3rem',
                        textAlign: 'center',
                        display: 'flex',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}
                >
                    <a href='https://jlinc.com' target='_blank' rel='noopener noreferrer' className={styles.secondaryLink}>
                        Learn more about JLINC
                    </a>
                    <a href='https://protocol.jlinc.org' target='_blank' rel='noopener noreferrer' className={styles.secondaryLink}>
                        JLINC Protocol Specification
                    </a>
                    <a href='https://did-spec.jlinc.org' target='_blank' rel='noopener noreferrer' className={styles.secondaryLink}>
                        W3C DID Method Spec
                    </a>
                </div>
            </div>
        </section>
    )
}

function ImplementationRoadmap() {
    const phases = [
        {
            phase: 'Phase 1: Pilot',
            duration: 'Weeks 1-2',
            icon: '🧪',
            tasks: [
                'Enable JLINC stamping in sandbox environment',
                'Test with sample workflows (dummy data)',
                'Verify integration with chosen ledger anchor',
                'Performance benchmarking (latency, throughput)'
            ],
            deliverable: 'Proof-of-concept report with provenance query demo'
        },
        {
            phase: 'Phase 2: Policy Mapping',
            duration: 'Weeks 3-5',
            icon: '📋',
            tasks: [
                'Map JLINC event types to governance controls',
                'Define signature requirements (who signs what)',
                'Establish ledger anchor strategy',
                'Identity provisioning (DID creation)'
            ],
            deliverable: 'Governance playbook & technical integration doc'
        },
        {
            phase: 'Phase 3: Production',
            duration: 'Weeks 6-8',
            icon: '🚀',
            tasks: [
                'Deploy to production AI workflows',
                'Train teams on provenance verification',
                'Integrate with existing audit processes',
                'Monitor & optimize performance'
            ],
            deliverable: 'Operational verifiable AI with audit dashboard'
        }
    ]

    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Implementation Roadmap
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>From Pilot to Production in 8 Weeks</h2>

                <div className='row' style={{ marginTop: '3rem' }}>
                    {phases.map((phase, idx) => (
                        <div key={idx} className='col col--4'>
                            <div className={styles.featureCard} style={{ height: '100%' }}>
                                <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
                                >
                                    <h3 style={{ color: '#00ffff', margin: 0, fontSize: '1rem' }}>{phase.phase}</h3>
                                    <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{phase.duration}</span>
                                </div>
                                <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>{phase.icon}</div>
                                <ul
                                    style={{
                                        listStyle: 'disc',
                                        paddingLeft: '1.5rem',
                                        display: 'grid',
                                        gap: '0.5rem',
                                        fontSize: '0.9rem',
                                        marginBottom: '1rem'
                                    }}
                                >
                                    {phase.tasks.map((task, i) => (
                                        <li key={i}>{task}</li>
                                    ))}
                                </ul>
                                <div
                                    style={{
                                        marginTop: 'auto',
                                        background: 'rgba(0, 255, 123, 0.08)',
                                        border: '1px solid rgba(0, 255, 123, 0.25)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <strong>Deliverable:</strong> {phase.deliverable}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '3rem', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    <div className={styles.featureCard}>
                        <h3 style={{ color: '#00ffff', marginBottom: '1rem', textAlign: 'center' }}>Success Metrics</h3>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1rem',
                                fontSize: '0.95rem',
                                textAlign: 'center'
                            }}
                        >
                            <div>Minimal latency overhead</div>
                            <div>100% provenance coverage</div>
                            <div>Auditor sign-off achieved</div>
                            <div>Board demo completed</div>
                        </div>
                    </div>
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{ marginTop: '2rem', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}
                >
                    <strong>Support Throughout:</strong> Dedicated integration engineer, JLINC protocol specialist, weekly syncs, and
                    real-time Slack/Teams support.
                </div>
            </div>
        </section>
    )
}

function PartnershipVisionSection() {
    return (
        <section className={styles.featuresSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Partnership Vision
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Beyond Integration: Pioneering Verifiable AI</h2>

                <div style={{ maxWidth: '900px', margin: '2rem auto 3rem', fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.9 }}>
                    <p>
                        This partnership represents more than a technical integration. Answer Agents and JLINC are{' '}
                        <strong>pioneering a new category: Verifiable AI Collaboration</strong>.
                    </p>
                    <p style={{ marginTop: '1.5rem' }}>
                        As AI becomes more capable—from writing code to making medical diagnoses to managing investment portfolios—the need
                        for provenance becomes existential. Society can't afford opaque AI systems in critical domains. We need verifiable
                        intelligence.
                    </p>
                    <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '1.2rem', color: '#00ffff' }}>
                        <strong>That's what we're building together.</strong>
                    </p>
                </div>

                <h3 style={{ textAlign: 'center', color: '#00ffff', marginBottom: '2rem' }}>Joint Innovation Roadmap</h3>

                <div className='row'>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h4 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Near-term (2025)</h4>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'grid', gap: '0.5rem' }}>
                                <li>Real-time provenance APIs</li>
                                <li>Multi-party workflows</li>
                                <li>Agent-to-agent provenance</li>
                            </ul>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h4 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Mid-term (2026)</h4>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'grid', gap: '0.5rem' }}>
                                <li>Automated compliance reporting</li>
                                <li>AI model lineage tracking</li>
                                <li>Zero-knowledge provenance</li>
                            </ul>
                        </div>
                    </div>
                    <div className='col col--4'>
                        <div className={clsx(styles.featureCard, styles.stepCard)}>
                            <h4 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1rem' }}>Long-term (2027+)</h4>
                            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'grid', gap: '0.5rem' }}>
                                <li>Verifiable AI marketplace</li>
                                <li>Regulatory framework contribution</li>
                                <li>Academic research partnership</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div
                    className={clsx(styles.testimonialCard)}
                    style={{
                        marginTop: '3rem',
                        maxWidth: '900px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        textAlign: 'center',
                        fontSize: '1.05rem'
                    }}
                >
                    Answer Agents and JLINC are committed to making AI <strong style={{ color: '#00ffff' }}>trustworthy by design</strong>,
                    not by promise. This partnership is the first step toward a future where provenance is as fundamental to AI systems as
                    HTTPS is to web security.
                </div>
            </div>
        </section>
    )
}

function FAQSection() {
    const faqs = [
        {
            q: 'How is this different from blockchain-based AI solutions?',
            a: 'JLINC is a protocol, not a blockchain. It can anchor to private databases, Hyperledger, or public blockchains—giving you maximum flexibility. Most "blockchain AI" solutions lock you into specific infrastructure. JLINC adapts to yours.'
        },
        {
            q: 'Does cryptographic verification slow down AI workflows?',
            a: 'No. JLINC stamping happens asynchronously, adding <100ms per event (imperceptible to users). Your agents run at full speed while provenance is captured in the background.'
        },
        {
            q: "What if we don't want to use a public blockchain?",
            a: "You don't have to. JLINC is vendor-neutral. Anchor to your private PostgreSQL database, Hyperledger Fabric, or any system you trust. The cryptographic signatures provide tamper-evidence regardless of ledger choice."
        },
        {
            q: 'Can we verify provenance years later?',
            a: "Yes. JLINC creates immutable records that can be queried indefinitely. As long as the ledger exists (your responsibility to maintain), provenance is verifiable. Think of it like digital signatures on PDFs—they don't expire."
        },
        {
            q: 'How do you protect data privacy?',
            a: "Only cryptographic hashes are written to the ledger—never the actual data. Hashes are one-way functions (can't reverse-engineer content). Your sensitive information stays in your systems with your access controls."
        },
        {
            q: 'What happens if Answer Agents or JLINC goes out of business?',
            a: "JLINC is an open protocol. The signature verification doesn't depend on JLINC-the-company existing. As long as you have the cryptographic keys and ledger data, you can verify provenance. We can also provide code escrow arrangements."
        }
    ]

    return (
        <section className={styles.missionSection}>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Frequently Asked Questions
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Common Questions About Verifiable AI</h2>

                <div style={{ maxWidth: '900px', margin: '3rem auto 0' }}>
                    {faqs.map((faq, idx) => (
                        <div key={idx} className={styles.faqCard} style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ color: '#00ffff', marginBottom: '0.75rem', fontSize: '1.05rem' }}>{faq.q}</h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', opacity: 0.9 }}>{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function DemoCTASection() {
    return (
        <section className={clsx(styles.featuresSection, styles.ctaSection)} id='demo'>
            <div className='container'>
                <div className={styles.sectionEyebrow} style={{ textAlign: 'center', justifyContent: 'center' }}>
                    Ready to Get Started?
                </div>
                <h2 className={clsx(styles.sectionHeading, 'text--center')}>Experience Verifiable AI in Action</h2>
                <p className={clsx(styles.sectionLead, 'text--center')} style={{ maxWidth: '700px', margin: '1rem auto 3rem' }}>
                    See how Answer Agents + JLINC transforms AI workflows from "trust us" to "verify yourself"
                </p>

                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div
                        className={styles.featureCard}
                        style={{ background: 'rgba(0, 255, 255, 0.08)', border: '2px solid rgba(0, 255, 255, 0.35)' }}
                    >
                        <h3 style={{ color: '#00ffff', textAlign: 'center', marginBottom: '1.5rem' }}>Schedule 30-Minute Demo</h3>
                        <p style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.9 }}>What you'll see:</p>
                        <ul
                            style={{
                                listStyle: 'disc',
                                paddingLeft: '1.5rem',
                                display: 'grid',
                                gap: '0.75rem',
                                marginBottom: '2rem',
                                maxWidth: '600px',
                                margin: '0 auto 2rem'
                            }}
                        >
                            <li>Live cryptographic stamping of AI workflow</li>
                            <li>Real-time provenance query demonstration</li>
                            <li>Industry-specific use case walkthrough</li>
                            <li>Implementation timeline & pricing discussion</li>
                        </ul>
                        <div style={{ textAlign: 'center' }}>
                            <a
                                href='https://discord.gg/X54ywt8pzj'
                                className={clsx(styles.ctaButton, styles.ctaPrimary)}
                                style={{ marginBottom: '1rem' }}
                            >
                                Contact Partnership Team
                            </a>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.7, margin: '1.5rem 0 0 0' }}>
                            No commitment required • NDA available upon request • Custom demos for your use case
                        </p>
                    </div>

                    <div className='row' style={{ marginTop: '2rem' }}>
                        <div className='col col--6'>
                            <div className={styles.featureCard}>
                                <h4 style={{ color: '#00ffff', marginBottom: '1rem', textAlign: 'center' }}>For Technical Teams</h4>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <a href='#architecture' className={styles.secondaryLink} style={{ justifyContent: 'center' }}>
                                        Technical Architecture
                                    </a>
                                    <a
                                        href='https://protocol.jlinc.org'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className={styles.secondaryLink}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        JLINC Protocol Docs
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className='col col--6'>
                            <div className={styles.featureCard}>
                                <h4 style={{ color: '#00ffff', marginBottom: '1rem', textAlign: 'center' }}>For Business Teams</h4>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <a
                                        href='https://discord.gg/X54ywt8pzj'
                                        className={styles.secondaryLink}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        Request ROI Analysis
                                    </a>
                                    <a
                                        href='https://discord.gg/X54ywt8pzj'
                                        className={styles.secondaryLink}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        Contact Sales
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

function CoFooter() {
    return (
        <section style={{ background: 'rgba(0, 0, 0, 0.5)', padding: '3rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className='container'>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            fontSize: '1.5rem',
                            marginBottom: '1rem'
                        }}
                    >
                        <span style={{ color: '#00ffff', fontWeight: 'bold' }}>Answer Agents</span>
                        <span style={{ opacity: 0.5 }}>×</span>
                        <span style={{ color: '#00ffff', fontWeight: 'bold' }}>JLINC</span>
                    </div>
                    <div
                        style={{
                            display: 'inline-block',
                            background: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: '999px',
                            padding: '0.5rem 1.5rem',
                            fontSize: '0.9rem',
                            marginBottom: '1rem'
                        }}
                    >
                        Strategic Technology Partnership
                    </div>
                    <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>Building the future of trustworthy AI</p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '2rem',
                        flexWrap: 'wrap',
                        fontSize: '0.9rem',
                        opacity: 0.7,
                        marginBottom: '2rem'
                    }}
                >
                    <a href='/' style={{ color: 'inherit' }}>
                        About Answer Agents
                    </a>
                    <a href='https://jlinc.com' target='_blank' rel='noopener noreferrer' style={{ color: 'inherit' }}>
                        About JLINC
                    </a>
                    <a href='/docs' style={{ color: 'inherit' }}>
                        Documentation
                    </a>
                    <a href='https://discord.gg/X54ywt8pzj' style={{ color: 'inherit' }}>
                        Contact
                    </a>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.5 }}>
                    © 2025 Last Rev / AnswerAI × JLINC Protocol. All rights reserved.
                </div>
            </div>
        </section>
    )
}

export default function JLINCPartnership(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()

    return (
        <div data-theme='dark'>
            <Layout
                title='JLINC Partnership - Cryptographically-Verifiable AI'
                description='Answer Agents and JLINC bring immutable data provenance to AI workflows—enabling trustworthy AI adoption in public companies and regulated enterprises.'
            >
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'WebPage',
                        name: 'Answer Agents × JLINC Strategic Partnership',
                        description: 'Cryptographically-verifiable AI collaboration for regulated enterprises',
                        url: 'https://answeragent.ai/jlinc-partnership',
                        about: {
                            '@type': 'Partnership',
                            name: 'Answer Agents × JLINC',
                            partner: [
                                { '@type': 'Organization', name: 'AnswerAgentAI' },
                                { '@type': 'Organization', name: 'JLINC' }
                            ]
                        }
                    }}
                />
                <PartnershipHero />
                <main>
                    <VisionSection />
                    <ProblemSection />
                    <SolutionSection />
                    <ComparisonSection />
                    <BenefitsSection />
                    <IndustryUseCases />
                    {/* <TechnicalArchitecture /> */}
                    <AboutJLINCSection />
                    {/* <ImplementationRoadmap /> */}
                    {/* <PartnershipVisionSection /> */}
                    <FAQSection />
                    <DemoCTASection />
                    {/* <CoFooter /> */}
                </main>
            </Layout>
        </div>
    )
}
