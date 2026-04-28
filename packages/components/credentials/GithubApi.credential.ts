import { INodeParams, INodeCredential } from '../src/Interface'

class GithubApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Github API'
        this.name = 'githubApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">official guide</a> on how to get accessToken on Github'
        this.inputs = [
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<GITHUB_ACCESS_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: GithubApi }
