export const getStateByProgress = (progress) => {
    const values = Object.values(progress)
    if (values.every((completed) => completed === true)) {
        return 'COMPLETED'
    } else if (values.some((completed) => completed === true)) {
        return 'IN_PROGRESS'
    } else {
        return 'NOT_STARTED'
    }
}
