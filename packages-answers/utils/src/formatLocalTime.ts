const formatLocalTime = (inputDate: string | number) => {
    if (!inputDate) return ''
    const date = new Date(inputDate)
    const formattedDate = date.toLocaleDateString()
    const formattedTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `${formattedDate} ${formattedTime}`
}

export default formatLocalTime
