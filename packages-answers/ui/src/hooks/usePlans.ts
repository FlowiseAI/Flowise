import { Plan } from 'types'
import useSWR from 'swr'
import type { Stripe } from 'stripe'

export const usePlans = () => {
    const { data: plans } = useSWR<PlanWithPriceObject[]>('/api/plans', (url) =>
        fetch(url)
            .then((res) => res.json())
            .then((res) => res.plans)
    )

    return {
        plans
    }
}

export interface PlanWithPriceObject extends Plan {
    priceObj?: Stripe.Price
}
