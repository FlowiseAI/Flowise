// MailerLite configuration - hardcoded values with env var fallbacks
const MAILERLITE_CONFIG = {
    webformId: '6zbHKe', // This is the data-form ID from the Universal embed code
    accountId: '1802410', // Your MailerLite account ID
    enabled: true,
    apiBaseUrl: 'https://assets.mailerlite.com/api',
    defaultGroups: undefined as string[] | undefined,
    doubleOptIn: false,
    customRedirectUrl: undefined as string | undefined
}

// Use hardcoded values with fallback to env vars (for when we fix env loading)
const mailerLiteWebformId = process.env.DOCUSAURUS_MAILERLITE_WEBFORM_ID?.trim() || MAILERLITE_CONFIG.webformId
const mailerLiteEnabled = process.env.DOCUSAURUS_MAILERLITE_ENABLED
    ? !['0', 'false', 'off'].includes(process.env.DOCUSAURUS_MAILERLITE_ENABLED.toLowerCase())
    : MAILERLITE_CONFIG.enabled
const mailerLiteApiBaseUrl = process.env.DOCUSAURUS_MAILERLITE_API_BASE_URL?.trim() || MAILERLITE_CONFIG.apiBaseUrl
const mailerLiteDefaultGroups = process.env.DOCUSAURUS_MAILERLITE_GROUP_IDS
    ? process.env.DOCUSAURUS_MAILERLITE_GROUP_IDS.split(',')
          .map((groupId) => groupId.trim())
          .filter(Boolean)
    : MAILERLITE_CONFIG.defaultGroups
const mailerLiteDoubleOptIn = process.env.DOCUSAURUS_MAILERLITE_DOUBLE_OPT_IN
    ? !['0', 'false', 'off'].includes(process.env.DOCUSAURUS_MAILERLITE_DOUBLE_OPT_IN.toLowerCase())
    : MAILERLITE_CONFIG.doubleOptIn
const mailerLiteCustomRedirectUrl = process.env.DOCUSAURUS_MAILERLITE_REDIRECT_URL?.trim() || MAILERLITE_CONFIG.customRedirectUrl
export interface MarketingConfig {
    // Tracking and analytics
    tracking: {
        googleAnalyticsId?: string
        linkedInPixel?: string
        facebookPixel?: string
        gtmId?: string
    }

    // MailerLite integration
    mailerLite: {
        enabled: boolean
        webformId?: string
        apiBaseUrl: string
        defaultGroups?: string[]
        doubleOptIn?: boolean
        customRedirectUrl?: string
    }

    // A/B testing configuration
    abTests: {
        [key: string]: {
            enabled: boolean
            variants: string[]
            defaultVariant?: string
        }
    }

    // API endpoints
    endpoints: {
        registration: string
        leadMagnet: string
        thankYou: string
    }

    // Urgency and scarcity settings
    urgency: {
        seatsRemaining: boolean
        countdownTimer: boolean
        lastChanceHours: number
        bonusTimeLimit?: number
    }

    // Email automation
    emailAutomation: {
        confirmationEmail: boolean
        reminderEmails: boolean
        followupSequence: boolean
        leadMagnetDelivery: boolean
    }

    // Social proof and trust signals
    socialProof: {
        customerLogos: string[]
        testimonials: boolean
        registrationCount: boolean
        liveAttendeeCount?: boolean
    }

    // Conversion optimization
    optimization: {
        exitIntent: boolean
        stickyHeader: boolean
        mobileOptimized: boolean
        formValidation: boolean
    }
}

export const marketingConfig: MarketingConfig = {
    // Easy to update tracking codes
    tracking: {
        googleAnalyticsId: process.env.DOCUSAURUS_GA_ID,
        linkedInPixel: process.env.DOCUSAURUS_LINKEDIN_PIXEL,
        facebookPixel: process.env.DOCUSAURUS_FACEBOOK_PIXEL,
        gtmId: process.env.DOCUSAURUS_GTM_ID
    },

    // MailerLite configuration
    mailerLite: {
        enabled: mailerLiteEnabled,
        webformId: mailerLiteWebformId,
        apiBaseUrl: mailerLiteApiBaseUrl,
        defaultGroups: mailerLiteDefaultGroups,
        doubleOptIn: mailerLiteDoubleOptIn,
        customRedirectUrl: mailerLiteCustomRedirectUrl
    },

    // A/B test variants - EASY TO ENABLE/DISABLE
    abTests: {
        headline: {
            enabled: false, // Set to true to enable A/B testing
            variants: ['primary', 'alternate1', 'alternate2'],
            defaultVariant: 'primary'
        },
        cta: {
            enabled: false,
            variants: ['Register Now', 'Save My Seat', 'Reserve Spot Free'],
            defaultVariant: 'Reserve Spot Free'
        },
        formPosition: {
            enabled: false,
            variants: ['hero', 'midPage', 'both'],
            defaultVariant: 'hero'
        }
    },

    // Email automation endpoints - UPDATE THESE
    endpoints: {
        registration: '/api/webinar/register',
        leadMagnet: '/api/webinar/download-checklist',
        thankYou: '/webinar-thank-you'
    },

    // Urgency messaging - EASY TO TOGGLE
    urgency: {
        seatsRemaining: true,
        countdownTimer: true,
        lastChanceHours: 24, // Show "last chance" messaging 24 hours before
        bonusTimeLimit: 72 // Bonus offer expires 72 hours after registration
    },

    // Email automation settings
    emailAutomation: {
        confirmationEmail: true, // Send immediate confirmation
        reminderEmails: true, // Send reminder sequence
        followupSequence: true, // Post-webinar nurture
        leadMagnetDelivery: true // Auto-deliver bonus materials
    },

    // Social proof elements
    socialProof: {
        customerLogos: [
            'ias-logo.png',
            'palatine-capital.png',
            'moonstruck-medical.png',
            'wow-internet.png',
            'contentful-logo.png',
            'dropbox-logo.png',
            'marqeta-logo.png'
        ],
        testimonials: true,
        registrationCount: true,
        liveAttendeeCount: false // Could show real-time registration numbers
    },

    // Conversion optimization features
    optimization: {
        exitIntent: true, // Show exit-intent popup
        stickyHeader: false, // Sticky registration CTA
        mobileOptimized: true, // Mobile-first responsive design
        formValidation: true // Real-time form validation
    }
}

// UTM parameter configuration for tracking
export const utmConfig = {
    source: 'website',
    medium: 'webinar-landing',
    campaign: 'enterprise-ai-webinar-jan-2025',
    content: 'primary-landing-page'
}

// Lead scoring configuration
export const leadScoringConfig = {
    jobTitleScores: {
        CTO: 10,
        CDO: 10,
        VP: 8,
        Director: 7,
        Manager: 5,
        Engineer: 3,
        Other: 1
    },
    companySizeScores: {
        '500-1000': 10,
        '1000-5000': 9,
        '200-500': 8,
        '50-200': 5,
        '10-50': 2,
        '1-10': 1
    },
    industryScores: {
        Technology: 10,
        'Financial Services': 9,
        Healthcare: 9,
        Manufacturing: 8,
        Retail: 6,
        Other: 5
    }
}

// Helper functions for marketing automation
export const getUtmParams = (source?: string, medium?: string, campaign?: string) => {
    return new URLSearchParams({
        utm_source: source || utmConfig.source,
        utm_medium: medium || utmConfig.medium,
        utm_campaign: campaign || utmConfig.campaign,
        utm_content: utmConfig.content
    }).toString()
}

export const calculateLeadScore = (formData: any) => {
    let score = 50 // Base score for webinar registration

    // Email domain scoring (work email bonus)
    if (formData.email) {
        const domain = formData.email.split('@')[1]?.toLowerCase()
        const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com']
        if (!personalDomains.includes(domain)) {
            score += 25 // Work email bonus
        } else {
            score += 10 // Personal email still gets some points for interest
        }
    }

    // UTM source scoring for lead quality
    if (formData.utm_source) {
        const source = formData.utm_source.toLowerCase()
        if (source.includes('linkedin')) score += 15
        else if (source.includes('google') || source.includes('search')) score += 10
        else if (source === 'direct') score += 5
    }

    return Math.min(score, 100) // Cap at 100
}

// A/B testing helper
export const getActiveVariant = (testName: string): string => {
    const test = marketingConfig.abTests[testName]
    if (!test || !test.enabled) {
        return test?.defaultVariant || test?.variants[0] || 'default'
    }

    // Simple random selection for now
    // In production, this would use a proper A/B testing service
    const randomIndex = Math.floor(Math.random() * test.variants.length)
    return test.variants[randomIndex]
}
