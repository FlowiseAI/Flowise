export const DEFAULT_DROPDOWN_VALUE = 'choose an option'

export const getOptionName = (option) => {
    if (typeof option === 'string') return option
    return option?.name ?? ''
}

export const getOptionLabel = (option) => {
    if (typeof option === 'string') return option
    return option?.label ?? option?.name ?? ''
}

export const isEmptyDropdownValue = (value) => value === undefined || value === null || value === '' || value === DEFAULT_DROPDOWN_VALUE

export const findMatchingOption = (options = [], value) => (options || []).find((option) => option.name === value)

export const getSingleAutocompleteValue = ({ options = [], value, freeSolo = false }) => {
    const matchingOption = findMatchingOption(options, value)
    if (matchingOption) return matchingOption

    if (freeSolo && !isEmptyDropdownValue(value)) return value

    return ''
}

export const getSelectionValue = (selection) => {
    if (typeof selection === 'string') return selection
    return selection?.name ?? ''
}

export const isOptionEqualToValue = (option, value) => getOptionName(option) === getOptionName(value)
