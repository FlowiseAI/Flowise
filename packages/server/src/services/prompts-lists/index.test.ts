import axios from 'axios'

jest.mock('axios')

import promptsListService from '.'

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('promptsListService.createPromptsList', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('fetches LangChain Hub prompts with a bounded timeout', async () => {
        const repos = [{ id: 'repo-1' }]
        mockedAxios.get.mockResolvedValue({ data: { repos } })

        const result = await promptsListService.createPromptsList({ tags: 'chat' })

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://api.hub.langchain.com/repos/?limit=100&tags=chathas_commits=true&sort_field=num_likes&sort_direction=desc&is_archived=false',
            { timeout: 10000 }
        )
        expect(result).toEqual({ status: 'OK', repos })
    })

    it('returns an empty error response when LangChain Hub times out', async () => {
        mockedAxios.get.mockRejectedValue(new Error('timeout'))

        const result = await promptsListService.createPromptsList({})

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), { timeout: 10000 })
        expect(result).toEqual({ status: 'ERROR', repos: [] })
    })
})
