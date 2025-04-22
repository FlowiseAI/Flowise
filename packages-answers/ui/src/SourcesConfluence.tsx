import AutocompleteSelect from './AutocompleteSelect'
import { AppSettings, AnswersFilters } from 'types'

interface Props {
    appSettings: AppSettings
    filters: AnswersFilters
    updateFilter: (newFilter: AnswersFilters) => void
}

const SourcesConfluence = ({ appSettings, filters, updateFilter }: Props) => {
    return (
        <>
            <AutocompleteSelect
                label='Confluence Space'
                options={appSettings?.confluence?.spaces?.filter((s) => s.enabled) || []}
                // getOptionValue={(option) => {
                //   return option?.id;
                // }}
                getOptionLabel={(option) => {
                    return option?.name
                }}
                value={filters?.datasources?.confluence?.spaces ?? []}
                onChange={(value) =>
                    updateFilter({
                        datasources: {
                            confluence: { spaces: value || [] }
                        }
                    })
                }
            />
        </>
    )
}

export default SourcesConfluence
