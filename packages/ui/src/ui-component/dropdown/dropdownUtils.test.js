import {
    DEFAULT_DROPDOWN_VALUE,
    getOptionLabel,
    getSelectionValue,
    getSingleAutocompleteValue,
    isOptionEqualToValue
} from './dropdownUtils'

describe('dropdownUtils', () => {
    const options = [
        { label: 'GPT 5', name: 'gpt-5' },
        { label: 'GPT 5 Mini', name: 'gpt-5-mini' }
    ]

    it('keeps a typed free-solo value when it is not in the option list', () => {
        expect(
            getSingleAutocompleteValue({
                options,
                value: 'gpt-5.4-nano-suporte-juridico',
                freeSolo: true
            })
        ).toBe('gpt-5.4-nano-suporte-juridico')
    })

    it('does not keep unknown values when free-solo entry is disabled', () => {
        expect(
            getSingleAutocompleteValue({
                options,
                value: 'gpt-5.4-nano-suporte-juridico',
                freeSolo: false
            })
        ).toBe('')
    })

    it('treats the default placeholder as empty for free-solo fields', () => {
        expect(getSingleAutocompleteValue({ options, value: DEFAULT_DROPDOWN_VALUE, freeSolo: true })).toBe('')
    })

    it('extracts typed free-solo selections and option selections', () => {
        expect(getSelectionValue('gpt-5.4-nano-suporte-juridico')).toBe('gpt-5.4-nano-suporte-juridico')
        expect(getSelectionValue(options[0])).toBe('gpt-5')
    })

    it('handles option labels and equality for string values', () => {
        expect(getOptionLabel('gpt-5.4-nano-suporte-juridico')).toBe('gpt-5.4-nano-suporte-juridico')
        expect(isOptionEqualToValue(options[0], 'gpt-5')).toBe(true)
    })
})
