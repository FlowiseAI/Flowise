const chunkArray = <T>(array: T[], chunkSize: number) => {
    return Array.from({ length: Math.ceil(array.length / chunkSize) }, (v, i) => {
        return array.slice(i * chunkSize, i * chunkSize + chunkSize)
    })
}

export default chunkArray
