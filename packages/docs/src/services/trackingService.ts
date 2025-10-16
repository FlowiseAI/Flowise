import { marketingConfig } from '@site/src/config/marketingConfig'

interface TrackingEvent {
    event: string
    eventCategory?: string
    eventLabel?: string
    value?: number
    customParameters?: Record<string, any>
}

interface ConversionData {
    email?: string
    firstName?: string
    lastName?: string
    company?: string
    jobTitle?: string
    leadScore?: number
    value?: number
}

export class TrackingService {
    private initialized = false

    constructor() {
        if (typeof window !== 'undefined') {
            this.initialize()
        }
    }

    // Initialize all tracking services
    private initialize(): void {
        if (this.initialized) return

        this.initializeGoogleAnalytics()
        this.initializeLinkedInPixel()
        this.initializeFacebookPixel()

        this.initialized = true
    }

    // Google Analytics 4 setup
    private initializeGoogleAnalytics(): void {
        const gaId = marketingConfig.tracking.googleAnalyticsId
        if (!gaId) return

        try {
            // Load gtag script
            const gtagScript = document.createElement('script')
            gtagScript.async = true
            gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
            document.head.appendChild(gtagScript)

            // Initialize gtag
            window.dataLayer = window.dataLayer || []
            const gtag = (...args: any[]) => {
                window.dataLayer.push(args)
            }
            window.gtag = gtag

            gtag('js', new Date())
            gtag('config', gaId, {
                send_page_view: true,
                custom_map: {
                    custom_parameter_1: 'lead_score',
                    custom_parameter_2: 'company_size'
                }
            })
        } catch (error) {
            console.error('Google Analytics initialization failed:', error)
        }
    }

    // LinkedIn Insight Tag setup
    private initializeLinkedInPixel(): void {
        const linkedInPixel = marketingConfig.tracking.linkedInPixel
        if (!linkedInPixel) return

        try {
            // Load LinkedIn Insight Tag
            const linkedInScript = document.createElement('script')
            linkedInScript.type = 'text/javascript'
            linkedInScript.innerHTML = `
        _linkedin_partner_id = "${linkedInPixel}";
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(_linkedin_partner_id);
      `
            document.head.appendChild(linkedInScript)

            // Load LinkedIn tracking script
            const linkedInTrackingScript = document.createElement('script')
            linkedInTrackingScript.type = 'text/javascript'
            linkedInTrackingScript.async = true
            linkedInTrackingScript.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'
            document.head.appendChild(linkedInTrackingScript)

            // Initialize lintrk function
            window.lintrk =
                window.lintrk ||
                function (...args: any[]) {
                    ;(window.lintrk.q = window.lintrk.q || []).push(args)
                }
        } catch (error) {
            console.error('LinkedIn Pixel initialization failed:', error)
        }
    }

    // Facebook Pixel setup
    private initializeFacebookPixel(): void {
        const facebookPixel = marketingConfig.tracking.facebookPixel
        if (!facebookPixel) return

        try {
            // Facebook Pixel Code
            window.fbq =
                window.fbq ||
                function (...args: any[]) {
                    ;(window.fbq.q = window.fbq.q || []).push(args)
                }
            window._fbq = window.fbq
            window.fbq.push = window.fbq
            window.fbq.loaded = true
            window.fbq.version = '2.0'
            window.fbq.queue = []

            const facebookScript = document.createElement('script')
            facebookScript.async = true
            facebookScript.src = 'https://connect.facebook.net/en_US/fbevents.js'
            document.head.appendChild(facebookScript)

            window.fbq('init', facebookPixel)
            window.fbq('track', 'PageView')
        } catch (error) {
            console.error('Facebook Pixel initialization failed:', error)
        }
    }

    // Track custom events
    trackEvent(event: TrackingEvent): void {
        const { event: eventName, eventCategory, eventLabel, value, customParameters } = event

        // Google Analytics 4 event tracking
        if (window.gtag) {
            window.gtag('event', eventName, {
                event_category: eventCategory,
                event_label: eventLabel,
                value: value,
                ...customParameters
            })
        }

        // LinkedIn conversion tracking
        if (window.lintrk && eventName === 'conversion') {
            window.lintrk('track', {
                conversion_id: eventLabel || 'webinar_registration'
            })
        }

        // Facebook conversion tracking
        if (window.fbq && eventName === 'conversion') {
            window.fbq('track', 'Lead', {
                content_name: eventLabel,
                value: value,
                currency: 'USD'
            })
        }
    }

    // Track webinar registration conversion
    trackWebinarRegistration(data: ConversionData): void {
        // Google Analytics 4 event tracking
        if (window.gtag) {
            window.gtag('event', 'webinar_registration', {
                event_category: 'engagement',
                event_label: 'enterprise-ai-webinar',
                value: 1,
                lead_score: data.leadScore,
                company: data.company,
                job_title: data.jobTitle
            })
        }

        // Meta/Facebook Pixel - CompleteRegistration standard event
        if (window.fbq) {
            try {
                window.fbq('track', 'CompleteRegistration', {
                    content_name: 'Enterprise AI Webinar',
                    value: data.value || 100,
                    currency: 'USD',
                    status: 'confirmed',
                    predicted_ltv: data.leadScore ? data.leadScore * 10 : 100
                })
            } catch (error) {
                console.error('Facebook Pixel tracking failed:', error)
            }
        }

        // LinkedIn conversion tracking
        if (window.lintrk) {
            try {
                window.lintrk('track', {
                    conversion_id: 'webinar_registration'
                })
            } catch (error) {
                console.error('LinkedIn tracking failed:', error)
            }
        }
    }

    // Track page views
    trackPageView(pagePath: string, pageTitle?: string): void {
        if (window.gtag) {
            window.gtag('event', 'page_view', {
                page_location: window.location.href,
                page_path: pagePath,
                page_title: pageTitle || document.title
            })
        }

        if (window.fbq) {
            window.fbq('track', 'PageView')

            // Track ViewContent for webinar pages
            if (pagePath.includes('webinar')) {
                window.fbq('track', 'ViewContent', {
                    content_name: pageTitle || 'Enterprise AI Webinar',
                    content_category: 'webinar',
                    content_type: 'product'
                })
            }
        }
    }

    // Track form interactions
    trackFormInteraction(action: 'start' | 'complete' | 'abandon', formName: string): void {
        this.trackEvent({
            event: `form_${action}`,
            eventCategory: 'form_interaction',
            eventLabel: formName,
            value: action === 'complete' ? 1 : 0
        })

        // Meta Pixel tracking for form interactions
        if (window.fbq) {
            try {
                if (action === 'start') {
                    window.fbq('track', 'Lead', {
                        content_name: formName,
                        content_category: 'webinar'
                    })
                } else if (action === 'abandon') {
                    window.fbq('trackCustom', 'FormAbandonment', {
                        content_name: formName
                    })
                }
            } catch (error) {
                console.error('Facebook Pixel form tracking failed:', error)
            }
        }
    }

    // Track content engagement
    trackContentEngagement(contentType: string, contentName: string, engagementTime?: number): void {
        this.trackEvent({
            event: 'content_engagement',
            eventCategory: 'engagement',
            eventLabel: `${contentType}:${contentName}`,
            value: engagementTime,
            customParameters: {
                content_type: contentType,
                content_name: contentName
            }
        })
    }

    // Track video interactions
    trackVideoInteraction(action: 'play' | 'pause' | 'complete', videoName: string, progress?: number): void {
        this.trackEvent({
            event: `video_${action}`,
            eventCategory: 'video',
            eventLabel: videoName,
            value: progress,
            customParameters: {
                video_name: videoName,
                video_progress: progress
            }
        })
    }

    // Track scroll depth
    trackScrollDepth(depth: number): void {
        this.trackEvent({
            event: 'scroll_depth',
            eventCategory: 'engagement',
            eventLabel: `${depth}%`,
            value: depth
        })
    }

    // Get UTM parameters from URL
    getUtmParameters(): Record<string, string> {
        if (typeof window === 'undefined') return {}

        const urlParams = new URLSearchParams(window.location.search)
        return {
            utm_source: urlParams.get('utm_source') || '',
            utm_medium: urlParams.get('utm_medium') || '',
            utm_campaign: urlParams.get('utm_campaign') || '',
            utm_term: urlParams.get('utm_term') || '',
            utm_content: urlParams.get('utm_content') || ''
        }
    }

    // Store UTM parameters in session storage for attribution
    storeUtmParameters(): void {
        if (typeof window === 'undefined') return

        const utmParams = this.getUtmParameters()
        const hasUtmParams = Object.values(utmParams).some((value) => value !== '')

        if (hasUtmParams) {
            sessionStorage.setItem('webinar_utm_params', JSON.stringify(utmParams))
        }
    }

    // Get stored UTM parameters
    getStoredUtmParameters(): Record<string, string> {
        if (typeof window === 'undefined') return {}

        const storedParams = sessionStorage.getItem('webinar_utm_params')
        return storedParams ? JSON.parse(storedParams) : {}
    }

    // Track external link clicks
    trackExternalLinkClick(url: string): void {
        this.trackEvent({
            event: 'click',
            eventCategory: 'external_link',
            eventLabel: url,
            customParameters: {
                outbound: true,
                link_url: url
            }
        })
    }

    // Track file downloads
    trackFileDownload(fileName: string, fileType: string): void {
        this.trackEvent({
            event: 'file_download',
            eventCategory: 'download',
            eventLabel: fileName,
            customParameters: {
                file_name: fileName,
                file_type: fileType
            }
        })
    }

    // Initialize scroll tracking
    initializeScrollTracking(): void {
        if (typeof window === 'undefined') return

        let scrollThresholds = [25, 50, 75, 100]
        let firedThresholds: number[] = []

        const handleScroll = () => {
            const scrollTop = window.pageYOffset
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight
            const scrollPercent = Math.round((scrollTop / documentHeight) * 100)

            scrollThresholds.forEach((threshold) => {
                if (scrollPercent >= threshold && !firedThresholds.includes(threshold)) {
                    this.trackScrollDepth(threshold)
                    firedThresholds.push(threshold)
                }
            })
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
    }
}

// Export singleton instance
export const trackingService = new TrackingService()

// Initialize tracking when the service is imported
if (typeof window !== 'undefined') {
    trackingService.storeUtmParameters()
    trackingService.initializeScrollTracking()
}
