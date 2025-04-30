import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

interface GptModelSelectProps {
    onGptModelSelected: (value: string) => void
    selectedGptModel: string
}

export const GptModelSelect = ({ onGptModelSelected, selectedGptModel }: GptModelSelectProps) => {
    const handleGptModelChange = (event: SelectChangeEvent<string>) => {
        onGptModelSelected(event.target.value as string)
    }

    return (
        <Select
            labelId='gpt-model-select-label'
            id='gpt-model-select'
            label='GPT Model'
            value={selectedGptModel}
            onChange={handleGptModelChange}
        >
            <MenuItem key='gpt3' value='gpt-3.5-turbo'>
                GPT 3.5
            </MenuItem>
            <MenuItem key='gpt316k' value='gpt-3.5-turbo-16k'>
                GPT 3.5 16k
            </MenuItem>
            <MenuItem key='gpt4' value='gpt-4'>
                GPT 4
            </MenuItem>
        </Select>
    )
}
