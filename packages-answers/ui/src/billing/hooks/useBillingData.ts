import useSWR from 'swr'
import billingApi from '@/api/billing'

export interface UsageMetric {
    used: number
    total: number
    rate: number
    cost: number
}

export interface UsageDashboard {
    aiTokens: UsageMetric
    compute: UsageMetric
    storage: UsageMetric
    chatsCreated: number
    messagesSent: number
    messagesGenerated: number
}

export interface CurrentPlan {
    name: 'Free' | 'Pro'
    status: 'active' | 'inactive'
    creditsIncluded: number
}

export interface BillingPeriod {
    start: string
    end: string
    current: string
}

export interface PricingInfo {
    aiTokensRate: string
    computeRate: string
    storageRate: string
    creditRate: string
}

export interface DailyUsage {
    date: string
    aiTokens: number
    compute: number
    storage: number
    total: number
}

export interface UsageSummary {
    currentPlan: CurrentPlan
    usageDashboard: UsageDashboard
    billingPeriod: BillingPeriod
    pricing: PricingInfo
    dailyUsage: DailyUsage[]
    isOverLimit: boolean
    upcomingInvoice?: {
        amount: number
        currency: string
        dueDate?: Date
        periodStart?: Date
        periodEnd?: Date
        lineItems?: Array<{
            description: string
            amount: number
            quantity?: number
            period?: {
                start: Date
                end: Date
            }
        }>
        totalCreditsUsed?: number
    }
}

const fetcher = async () => {
    const response = await billingApi.getUsageSummary()
    return response.data
}

export function useBillingData() {
    const { data, error, isLoading, mutate } = useSWR<UsageSummary>('/api/billing/usage', fetcher, {
        refreshInterval: 60000, // Refresh every minute
        revalidateOnFocus: true,
        dedupingInterval: 5000 // Dedupe requests within 5 seconds
    })

    return {
        billingData: data,
        isLoading,
        isError: error,
        refresh: mutate
    }
}
