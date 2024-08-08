const formatDateSince = (inputDate: Date): string => {
    const date = new Date(inputDate)
    const now: Date = new Date()
    const diff: number = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 0) {
        return 'today'
    } else if (diff === 1) {
        return '1 day ago'
    } else if (diff < 7) {
        return `${diff} days ago`
    } else {
        return 'more than 1 week ago'
    }
}

export default formatDateSince
