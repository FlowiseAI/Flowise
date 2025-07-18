export const CREDIT_CONSTANTS = {
    // PRD: $1 = 100 predictions at $0.01 each, so 1 credit = $0.01
    CREDITS_PER_DOLLAR: 100, // 1 credit = $0.01
    CENTS_PER_PREDICTION: 1, // $0.01 per prediction in cents

    PACKAGES: {
        SMALL: {
            credits: 1000,
            price: 1000 // $10.00 in cents (1000 credits * $0.01)
        },
        MEDIUM: {
            credits: 2500,
            price: 2500 // $25.00 in cents (2500 credits * $0.01)
        },
        LARGE: {
            credits: 5000,
            price: 5000 // $50.00 in cents (5000 credits * $0.01)
        }
    },

    // Environment variables
    ENV_VARS: {
        CREDIT_PRODUCT_ID: 'CREDIT_PRODUCT_ID',
        BILLING_METER_ID: 'BILLING_METER_ID',
        METERED_PRICE_ID: 'METERED_PRICE_ID',
        METER_EVENT_NAME: 'METER_EVENT_NAME'
    }
} as const

export type CreditPackageType = keyof typeof CREDIT_CONSTANTS.PACKAGES
export type CreditPackage = (typeof CREDIT_CONSTANTS.PACKAGES)[CreditPackageType]

// Helper functions for credit calculations
export const convertCreditsToCents = (credits: number): number => {
    return credits * CREDIT_CONSTANTS.CENTS_PER_PREDICTION
}

export const convertCentsToCredits = (cents: number): number => {
    return Math.floor(cents / CREDIT_CONSTANTS.CENTS_PER_PREDICTION)
}

export const convertDollarsToCredits = (dollars: number): number => {
    return dollars * CREDIT_CONSTANTS.CREDITS_PER_DOLLAR
}

export const convertCreditsToDollars = (credits: number): number => {
    return credits / CREDIT_CONSTANTS.CREDITS_PER_DOLLAR
}

// Validation helper
export const isValidPackageType = (packageType: string): packageType is CreditPackageType => {
    return packageType in CREDIT_CONSTANTS.PACKAGES
}

// Get package info
export const getPackageInfo = (packageType: CreditPackageType): CreditPackage => {
    return CREDIT_CONSTANTS.PACKAGES[packageType]
}
