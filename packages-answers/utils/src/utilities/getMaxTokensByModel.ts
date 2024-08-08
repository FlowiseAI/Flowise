const getMaxTokensByModel = (gptModel?: string) => {
    switch (gptModel) {
        case 'gpt-3.5-turbo':
            return 4000
        case 'gpt-4':
            return 7900
        case 'gpt-3.5-turbo-16k':
            return 15800
        default:
            return 4000
    }
}

export default getMaxTokensByModel
