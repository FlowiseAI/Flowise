import AutocompleteSelect from './AutocompleteSelect'
import { AppSettings, AnswersFilters } from 'types'

interface Props {
    appSettings: AppSettings
    filters: AnswersFilters
    updateFilter: (newFilter: AnswersFilters) => void
}

const SourcesSlack = ({ appSettings, filters, updateFilter }: Props) => {
    return (
        <>
            <AutocompleteSelect
                label='Channel'
                options={appSettings?.slack?.channels?.filter((s) => s.enabled)?.map((s) => s.name) || []}
                value={filters?.datasources?.slack?.channelId || []}
                onChange={(value: string[]) => updateFilter({ datasources: { slack: { channelId: value } } })}
            />
        </>
    )
}

export default SourcesSlack
