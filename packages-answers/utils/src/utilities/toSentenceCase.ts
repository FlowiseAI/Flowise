const toSentenceCase = (str: string) => {
    const sentenceCase = str
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    return sentenceCase
}

export default toSentenceCase
