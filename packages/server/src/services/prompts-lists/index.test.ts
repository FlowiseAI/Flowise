import axios from 'axios'
import promptsListsService from '.'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('promptsListsService.createPromptsList', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('fetches LangChain Hub prompts with a bounded timeout', async () => {
        const repos = [{ id: 'owner/prompt', num_likes: 42 }]
        mockedAxios.get.mockResolvedValue({ data: { repos } })

        const result = await promptsListsService.createPromptsList({})

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://api.hub.langchain.com/repos/?limit=100&has_commits=true&sort_field=num_likes&sort_direction=desc&is_archived=false',
            { timeout: 10000 }
        )
        expect(result).toEqual({
            status: 'OK',
            repos
        })
    })

    it('returns the existing fallback when LangChain Hub request fails', async () => {
        mockedAxios.get.mockRejectedValue(new Error('timeout'))

        await expect(promptsListsService.createPromptsList({})).resolves.toEqual({
            status: 'ERROR',
            repos: []
        })
    })
})
