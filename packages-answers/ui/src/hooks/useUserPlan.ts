import { useCallback } from 'react'
import { Plan } from 'types'
import useSWR from 'swr'

export const useUserPlans = () => {
    const { data: activeUserPlan, mutate: mutateActiveUserPlan } = useSWR(`/api/user-plan`, (url) =>
        fetch(url)
            .then((res) => res.json())
            .then((data) => ({
                ...data.activeUserPlan,
                renewalDate: new Date(data.activeUserPlan.renewalDate)
            }))
    )

    const handleCancelPlan = useCallback(
        async (onEnd: Function) => {
            const data = await fetch(`/api/user-plan/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((res) => res.json())

            if (data.success) {
                await mutateActiveUserPlan()
            }
            onEnd()
        },
        [mutateActiveUserPlan]
    )

    const isActivePlan = useCallback(
        (plan: Plan) => {
            return activeUserPlan?.planId === plan.id
        },
        [activeUserPlan]
    )

    return {
        activeUserPlan,
        mutateActiveUserPlan,
        handleCancelPlan,
        isActivePlan
    }
}
