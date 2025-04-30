import AutocompleteSelect from './AutocompleteSelect'
import { AppSettings, AnswersFilters } from 'types'

interface Props {
    appSettings: AppSettings
    filters: AnswersFilters
    updateFilter: (newFilter: AnswersFilters) => void
}

const SourcesAirtable = ({ appSettings, filters, updateFilter }: Props) => {
    return (
        <>
            <AutocompleteSelect
                label='Table'
                options={appSettings?.airtable?.tables?.filter((s) => s.enabled)?.map((s) => s.id) || []}
                value={filters?.datasources?.airtable?.table || []}
                onChange={(value: string[]) => updateFilter({ datasources: { airtable: { table: value } } })}
            />
        </>
    )
}

export default SourcesAirtable
