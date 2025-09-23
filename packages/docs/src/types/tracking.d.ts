// Global tracking script declarations
declare global {
    interface Window {
        // Google Analytics 4
        gtag?: (...args: any[]) => void
        dataLayer?: any[]

        // LinkedIn Insight Tag
        lintrk?: {
            (...args: any[]): void
            q?: any[]
        }
        _linkedin_partner_id?: string
        _linkedin_data_partner_ids?: string[]

        // Facebook Pixel
        fbq?: {
            (...args: any[]): void
            push?: any
            loaded?: boolean
            version?: string
            queue?: any[]
            q?: any[]
        }
        _fbq?: any

        // Hotjar
        hj?: (...args: any[]) => void
        hjBootstrap?: any
    }
}

export {}
