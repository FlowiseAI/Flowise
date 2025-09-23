export interface WebinarConfig {
    // Basic webinar details
    webinarDate: string
    webinarTime: string
    webinarDateTimeISO: string
    maxSeats: number
    currentRegistrations: number
    scarcity?: {
        totalSeats: number
        registrationDeadline: string
        urgencyMessages: string[]
    }
    limitedBonus?: {
        headline: string
        subhead: string
        perks: string[]
    }
    pressFeatures?: Array<{
        name: string
        logo?: string
        url?: string
        label?: string
    }>
    hostHighlights?: Array<{
        speaker: string
        highlight: string
    }>
    testimonialQuotes?: Array<{
        quote: string
        author: string
        role?: string
        company: string
    }>
    roadmap?: Array<{
        phase: string
        duration: string
        outcomes: string[]
    }>
    toolkitPreview?: Array<{
        title: string
        description: string
        asset?: string
    }>
    introVideo?: {
        url: string
        caption?: string
    }

    // Headlines for A/B testing
    headlines: {
        primary: string
        alternate1: string
        alternate2: string
    }

    // Customer success stories
    customerStats: {
        [key: string]: {
            saved?: string
            roi?: string
            deployment?: string
            systems?: string
            reps?: string
            search?: string
            [key: string]: string | undefined
        }
    }

    // Speaker information
    speakers: Array<{
        name: string
        title: string
        bio: string
        image?: string
    }>

    // Form configuration
    formFields: {
        requiredFields: string[]
        optionalFields: string[]
    }

    // Content sections
    problems: Array<{
        icon: string
        title: string
        description: string
    }>

    framework: Array<{
        week: number
        title: string
        description: string
        deliverables: string[]
    }>

    customerStories: Array<{
        company: string
        logo: string
        industry: string
        challenge: string
        solution: string
        results: string[]
        metrics: string
    }>

    agenda: Array<{
        time: string
        topic: string
        description: string
    }>

    faqs: Array<{
        question: string
        answer: string
    }>
}

export const webinarConfig: WebinarConfig = {
    // Basic webinar details - EASY TO UPDATE
    webinarDate: 'Saturday, January 18, 2025',
    webinarTime: '11:00 AM PST',
    webinarDateTimeISO: '2025-01-18T19:00:00Z',
    maxSeats: 200,
    currentRegistrations: 147,
    scarcity: {
        totalSeats: 200,
        registrationDeadline: '2025-01-18T18:59:59Z',
        urgencyMessages: [
            "Only {remainingSeats} seats left for Saturday's live session",
            'Registration closes Saturday at 11:00 AM PST',
            '⚡ Limited seating — save your spot now'
        ]
    },
    limitedBonus: {
        headline: 'Bonus for the first 150 registrants',
        subhead: 'Lock in your seat now and you’ll also get:',
        perks: [
            'Private Slack AMA with the AnswerAI founding team the week before the webinar',
            '1:1 20-minute AI readiness audit (scheduled post-workshop)',
            'Early access to the Enterprise AI Playbook PDF before it goes public'
        ]
    },
    pressFeatures: [{ name: 'TechCrunch' }, { name: 'Forbes AI 50' }, { name: 'AWS Startups' }, { name: 'Google Cloud Innovators' }],
    hostHighlights: [
        {
            speaker: 'Brad Taylor',
            highlight: 'Former Optimizely executive • 340% conversion rate improvement • Founded multiple tech companies'
        },
        {
            speaker: 'Adam Harris',
            highlight: 'Former Google DoubleClick Lead • 20+ years scaling enterprise platforms • Operations expert'
        },
        { speaker: 'Max Techera', highlight: 'Architected AnswerAI platform • Built Last Rev framework • Powers enterprise AI deployments' }
    ],
    testimonialQuotes: [
        {
            quote: '“We replaced six scattered systems with one compliant AI interface in just four weeks.”',
            author: 'Customer Success Lead',
            role: 'Enterprise Enablement',
            company: 'Integral Ad Science'
        },
        {
            quote: '“120 analyst hours every week back in our pipeline — the Palatine playbook alone paid for the program.”',
            author: 'Deal Operations Director',
            role: 'Private Equity',
            company: 'Palatine Capital Partners'
        },
        {
            quote: '“Our reps now find answers in seconds and stay on-message across nine regions.”',
            author: 'Director of Sales Enablement',
            role: 'Commercial Operations',
            company: 'Moonstruck Medical'
        }
    ],
    roadmap: [
        {
            phase: 'Week 1',
            duration: 'Days 1-7',
            outcomes: ['Executive alignment & success metrics', 'AI readiness audit delivered', 'Use-case priority matrix built']
        },
        {
            phase: 'Week 2',
            duration: 'Days 8-14',
            outcomes: ['Secure environment configured', 'Systems & data sources connected', 'Governance guardrails activated']
        },
        {
            phase: 'Week 3',
            duration: 'Days 15-21',
            outcomes: ['Pilot teams onboarded', 'Workflows automated with human-in-loop QA', 'Performance baseline captured']
        },
        {
            phase: 'Week 4+',
            duration: 'Days 22-30',
            outcomes: ['Company-wide launch playbook', 'Executive dashboard + ROI tracker', '90-day optimization backlog']
        }
    ],
    toolkitPreview: [
        {
            title: 'Deployment Command Center',
            description: 'Notion + Airtable templates to manage requirements, approvals, and cutover checklist.'
        },
        {
            title: 'Executive Scorecard Dashboard',
            description: 'Ready-to-use Looker/Sheets dashboards for ROI, adoption, and compliance tracking.'
        },
        {
            title: 'Security & Compliance Packet',
            description: 'SOC2-ready policy templates, vendor review questionnaires, and data flow diagrams.'
        },
        {
            title: 'AI Use-Case Prioritization Matrix',
            description: 'Weighted scoring model to align stakeholders on impact vs. complexity instantly.'
        }
    ],
    introVideo: {
        url: 'https://www.youtube-nocookie.com/embed/TODO_REPLACE_WITH_WEBINAR_INTRO',
        caption: 'Bradley Taylor shares what you’ll accomplish in this 60-minute working session (replace with final video).'
    },

    // Headlines - easily A/B testable
    headlines: {
        primary: 'From AI Chaos to Enterprise Success: Deploy AI Agents in 4 Weeks, Not 6 Months',
        alternate1: 'Stop Paying AI Tax: How Enterprises Cut Costs 30% While Scaling AI',
        alternate2: 'The Enterprise AI Playbook: Vendor-Free Implementation in 30 Days'
    },

    // Customer success metrics - UPDATE THESE EASILY
    customerStats: {
        palatine: {
            saved: '120 analyst-hours/week',
            roi: '$312K annual savings',
            deployment: '12 weeks',
            systems: '50-60 daily broker emails automated'
        },
        ias: {
            deployment: '4 weeks',
            systems: '6 systems consolidated to 1 AI interface',
            roi: '40% faster ticket resolution'
        },
        moonstruck: {
            reps: '9 sales reps unified',
            search: 'minutes to seconds search time',
            roi: 'Operations team freed for strategic work'
        },
        wow: {
            conversion: 'POC → $36K annual license',
            roi: 'Complete support workflow automation'
        },
        contentful: {
            systems: '6 scattered systems to 1 unified interface',
            roi: '90% of queries handled instantly by AI'
        }
    },

    // Speaker info - UPDATE BIOS/IMAGES HERE
    speakers: [
        {
            name: 'Brad Taylor',
            title: 'CEO & Co-Founder',
            bio: 'Founder & CEO of AnswerAI and Co-Founder of Last Rev. Former Head of Web & Experimentation at Optimizely where he led a 340% increase in conversion rates. Built and sold multiple tech companies including 195Places. 15+ years pioneering advanced technology solutions and AI automation for enterprise clients.',
            image: '/img/brad-blackand-white.png'
        },
        {
            name: 'Adam Harris',
            title: 'COO & Co-Founder',
            bio: 'COO & Co-Founder with 20+ years in engineering, sales, and business development. Former Lead Product Evangelist at Google DoubleClick, Senior BD at Leap Motion. Led DoubleClick Rich Media to 200%+ growth. Expert in scaling SaaS platforms and enterprise digital transformation.'
        },
        {
            name: 'Max Techera',
            title: 'CTO & Co-Founder',
            bio: "CTO & Co-Founder, architected the entire AnswerAI platform from the ground up. Director of Engineering at Last Rev where he built the framework powering 10+ enterprise websites. Created the unified GraphQL data layer and AI orchestration system that enables AnswerAI's rapid 4-week deployments. Expert in React, Node.js, and enterprise-scale architectures."
        }
    ],

    // Form fields - ADD/REMOVE FIELDS EASILY
    formFields: {
        requiredFields: ['email'],
        optionalFields: []
    },

    // Problem section content
    problems: [
        {
            icon: '📉',
            title: '87% of AI Projects Fail',
            description:
                'Most enterprises get trapped in vendor lock-in, paying 60% more than needed for AI implementations that take 6+ months and deliver no measurable ROI.'
        },
        {
            icon: '🔒',
            title: 'Vendor Lock-In Nightmare',
            description:
                "Companies spend millions on proprietary AI platforms, then discover they can't switch models, export data, or customize workflows to their actual needs."
        },
        {
            icon: '⏰',
            title: '6-Month Implementation Hell',
            description:
                'Traditional AI deployments require armies of consultants, endless meetings, and complex integrations that still leave teams frustrated and unproductive.'
        }
    ],

    // 4-Week framework content
    framework: [
        {
            week: 1,
            title: 'Discovery & Strategy',
            description: 'Live demo of our enterprise AI assessment process',
            deliverables: [
                'AI readiness evaluation',
                'Use case prioritization',
                'Technical requirements analysis',
                'Success metrics definition'
            ]
        },
        {
            week: 2,
            title: 'Document & Tool Setup',
            description: 'Platform configuration and integration planning',
            deliverables: [
                'System integrations configured',
                'Data sources connected',
                'Security protocols established',
                'User access controls set'
            ]
        },
        {
            week: 3,
            title: 'Internal Testing & Iteration',
            description: 'Pilot deployment with real workflows',
            deliverables: ['Pilot user training', 'Workflow optimization', 'Performance monitoring', 'Feedback incorporation']
        },
        {
            week: 4,
            title: 'Launch & Optimization',
            description: 'Full deployment across organization',
            deliverables: ['Company-wide rollout', 'Success metrics tracking', 'Ongoing optimization', 'ROI measurement']
        }
    ],

    // Customer success stories with real metrics
    customerStories: [
        {
            company: 'Palatine Capital Partners',
            logo: '/img/customers/palatine-capital.png',
            industry: 'Private Equity / Real Estate Investment',
            challenge:
                '50-60 broker-blast emails flooding inbox daily. 120 analyst-hours per week on manual data entry, CA signing, and document processing.',
            solution:
                'Smart Intake Agent processes deal emails automatically. Document Extraction Agent reads financial/property data with confidence scoring. ROC Builder Service returns fully-populated models in <60 seconds.',
            results: [
                'Automated 50-60 daily broker emails',
                'Freed 4-5 FTEs for strategic underwriting work',
                '3x faster deal throughput (≤20 min per deal)',
                'GL bucket mis-classification <5%',
                '99.5% system uptime'
            ],
            metrics: '$312K+ annual savings from 120 analyst-hours/week automation'
        },
        {
            company: 'Integral Ad Science (IAS)',
            logo: '/img/customers/ias-logo.png',
            industry: 'Digital Advertising Technology',
            challenge:
                'Complex legal and compliance workflows. Information scattered across 6 different systems. Need for audit trails and governance in public company environment.',
            solution:
                '4-week rapid deployment with enterprise-grade security. Legal department automation for document processing. Multi-system integration with unified AI interface.',
            results: [
                '4-week deployment vs 6+ month industry standard',
                'Single AI interface replacing 6 scattered systems',
                'Legal automation with full compliance maintained',
                'High user adoption across legal and operations teams'
            ],
            metrics: '40% faster ticket resolution with 90% accuracy maintained'
        },
        {
            company: 'Moonstruck Medical',
            logo: '/img/customers/moonstruck-medical.png',
            industry: 'Medical Device / Pharmaceutical',
            challenge:
                '9 sales reps (1099 contractors) across locations with info silos. 5-6 new product lines monthly creating nonstop training demands. Documentation chaos across Google Drive, PDFs, emails.',
            solution:
                'Sales Cheat-Sheet Bot for instant product & pricing lookups. Rep Role-Play Coach for sales call simulation. Knowledge centralization across all documentation sources.',
            results: [
                'Search time: from minutes to seconds',
                'Single source of truth across 9 distributed reps',
                'Operations team freed for strategic work',
                'Consistent messaging eliminated info silos',
                'Automated onboarding for new product lines'
            ],
            metrics: 'Ops team capacity optimized, consistent revenue per rep through standardized messaging'
        },
        {
            company: 'WOW! Internet',
            logo: '/img/customers/wow-internet.png',
            industry: 'Telecommunications / Internet Services',
            challenge:
                'Customer support bottlenecks. Manual ticket routing and response. Need for scalable automation solution without massive upfront investment.',
            solution:
                '3-month $3K POC program with custom support agents. Live voice agents with CRM integration. Chrome extension for agent productivity.',
            results: [
                'Successfully completed POC in 90 days',
                'Moved to annual Enterprise License ($36K/year)',
                'Customer support response times improved',
                'Agent productivity increased through automation',
                'Unified customer data access across systems'
            ],
            metrics: 'POC converted to full implementation with measurable support efficiency gains'
        }
    ],

    // Webinar agenda
    agenda: [
        {
            time: '5 min',
            topic: 'Opening & Problem Statement',
            description: 'AI implementation chaos in enterprises and our proven solution framework'
        },
        {
            time: '15 min',
            topic: 'The Enterprise AI Reality Check',
            description: 'Why 87% of AI projects fail, vendor lock-in costs, and IAS 4-week vs 6+ month case study'
        },
        {
            time: '20 min',
            topic: 'Live Demo: 4-Week Deployment Framework',
            description: 'Week-by-week breakdown with live AnswerAgent platform demonstration and real client examples'
        },
        {
            time: '10 min',
            topic: 'Enterprise Success Stories',
            description: 'Palatine Capital (120 hours saved), IAS (6 systems unified), Moonstruck (9 reps), WOW! ($3K→$36K), ROI metrics'
        },
        {
            time: '10 min',
            topic: 'Q&A & 90-Day Pilot Program',
            description: 'Live objection handling with client proof points, 90-day pilot introduction, clear next steps'
        }
    ],

    // FAQ content addressing common objections
    faqs: [
        {
            question: "This sounds too complex to implement. How do we know it won't be another 18-month project?",
            answer: "IAS (Integral Ad Science) deployed our full solution in exactly 4 weeks with all employees onboarded. We've proven this timeline works because we pre-built 100+ integrations (SFDC, Jira, Confluence, etc.) and use a human-in-the-loop approach rather than trying to automate everything at once."
        },
        {
            question: "What about vendor lock-in? We've been burned before by platforms that held our data hostage.",
            answer: 'Unlike competitors, you bring your own API tokens and can switch between OpenAI, Claude, and Gemini instantly. Complete export capabilities mean you keep everything if you cancel. Open-source components let you fork and modify code. Your data, your infrastructure, your control.'
        },
        {
            question: 'How do we handle security and compliance in a regulated industry?',
            answer: 'We offer SOC2 Type II compliance pathways, on-premise deployment, and air-gapped options. Fortune 500 financial services companies use our platform with full regulatory compliance (SOX, FINRA). Complete audit trails and role-based access controls are built-in.'
        },
        {
            question: "What's the actual ROI? We need concrete numbers to justify this to our board.",
            answer: 'Palatine Capital Partners saved $312K annually by automating 120 analyst-hours per week. Average clients see 10-30% reduction in SaaS tool spending within 90 days. IAS achieved 40% faster ticket resolution. Typical payback period is 90 days with measurable productivity gains.'
        },
        {
            question: "Our team isn't technical. Will we need to hire AI specialists to use this?",
            answer: "Monostruck Medical's sales operations team (non-technical) unified 9 reps across locations in 3 weeks. Our 'buttons beat chat' philosophy means simple interfaces, not complex AI interactions. We provide training, but the platform is designed for business users, not developers."
        },
        {
            question: 'How is this different from Microsoft Copilot or OpenAI Enterprise?',
            answer: 'No vendor lock-in (swap models instantly), usage-based pricing (not per-seat), 4-week deployment (not 6+ months), and complete customization. While competitors lock you into their ecosystem, we integrate with your existing tools and let you maintain full control.'
        }
    ]
}

// Helper function to get available seats
export const getAvailableSeats = () => {
    return webinarConfig.maxSeats - webinarConfig.currentRegistrations
}

// Helper function to get urgency messaging
export const getUrgencyMessage = () => {
    const available = getAvailableSeats()
    if (!webinarConfig.scarcity) {
        if (available <= 10) return `Only ${available} seats left!`
        if (available <= 50) return `${available} seats remaining`
        return `Limited to ${webinarConfig.maxSeats} seats`
    }

    const messageTemplate = webinarConfig.scarcity.urgencyMessages[0] || '{remainingSeats} seats remaining'
    return messageTemplate.replace('{remainingSeats}', available.toString())
}

// Helper to format webinar date/time
export const getWebinarDateTime = () => {
    return `${webinarConfig.webinarDate} at ${webinarConfig.webinarTime}`
}

export const getRegistrationDeadline = () => webinarConfig.scarcity?.registrationDeadline

export const getLocalWebinarDateTime = () => {
    try {
        const eventDate = new Date(webinarConfig.webinarDateTimeISO)
        if (Number.isNaN(eventDate.getTime())) {
            return getWebinarDateTime()
        }

        const dateFormatter = new Intl.DateTimeFormat(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        })

        const timeFormatter = new Intl.DateTimeFormat(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        })

        return `${dateFormatter.format(eventDate)} · ${timeFormatter.format(eventDate)}`
    } catch (error) {
        console.warn('Unable to format webinar datetime for locale', error)
        return getWebinarDateTime()
    }
}
