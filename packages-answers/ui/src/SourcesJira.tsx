import AutocompleteSelect from './AutocompleteSelect'
import { AppSettings, AnswersFilters } from 'types'

interface Props {
    appSettings: AppSettings
    filters: AnswersFilters
    updateFilter: (newFilter: AnswersFilters) => void
}

const SourcesJira = ({ appSettings, filters, updateFilter }: Props) => {
    return (
        <>
            <AutocompleteSelect
                label='Project'
                options={appSettings?.jira?.projects?.filter((s) => s.enabled)?.map((s) => s.key) || []}
                value={filters?.datasources?.jira?.project || []}
                onChange={(value: string[]) => updateFilter({ datasources: { jira: { project: value } } })}
            />
            <AutocompleteSelect
                label={`Status`}
                sx={{ textTransform: 'capitalize' }}
                options={['to do', 'in progress', 'done']}
                value={filters?.datasources?.jira?.status_category || []}
                onChange={(value: string[]) => {
                    updateFilter({ datasources: { jira: { status_category: value } } })
                }}
            />
        </>
    )
}

export default SourcesJira
