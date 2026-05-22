export const isNodeExplicitlyDisabled = (node) => {
    const disabled = node?.data?.disabled
    return disabled === true || disabled === 'true'
}
