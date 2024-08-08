import { deepmerge } from '../deepmerge'
import { JiraProject } from 'types'
// import SlackClient from '../slack/client';

import { User, AppSettings, Organization, ConfluenceSpaceSetting, SlackChannelSetting } from 'types'

import { getUserClients } from './getUserClients'
import { SYSTEM_SETTINGS } from './SYSTEM_SETTINGS'

export const buildSettings = async (user: User, org?: Organization) => {
    const { jiraClient, confluenceClient, slackClient } = await getUserClients(user)
    // if (!session?.user?.email) return NextResponse.redirect('/auth');
    // TODO: Move this into a middleware
    const userSettings = user?.appSettings as AppSettings
    const orgSettings = org?.appSettings as AppSettings
    // TODO: Verify user ownership or permisson scope
    // if (!org) {
    //   console.log('UserWithoutOrg', user);
    //   return NO_ORG_SETTINGS;
    // }
    // Load all possible jiraprojects on every update
    let newSettings: Partial<AppSettings> = deepmerge({}, orgSettings, userSettings, SYSTEM_SETTINGS)
    if (jiraClient)
        try {
            const jiraProjects = await jiraClient
                .getJiraProjects()
                .then((projects) => projects.map((project) => ({ name: project?.name, key: project?.key })))
            const projectsSettingsByKey =
                (newSettings as any)?.jira?.projects?.reduce((acc: any, project: JiraProject) => {
                    acc[project.key] = project
                    return acc
                }, {}) || {}
            newSettings.jira = {
                ...(newSettings as any)?.jira,
                projects: jiraProjects.map((project) => ({
                    ...project,
                    ...projectsSettingsByKey[project.key]
                }))
            }
        } catch (error) {
            console.log('JiraSettingsError', error)
        }
    if (slackClient)
        try {
            // Load all possible slack channels on every update
            const channels = await slackClient.getChannels()
            const channelsSettingsById =
                (newSettings as any)?.slack?.channels?.reduce((acc: any, channel: SlackChannelSetting) => {
                    acc[channel.id] = channel
                    return acc
                }, {}) || {}
            newSettings.slack = {
                ...(newSettings as any)?.slack,
                channels: channels.map((channel) => ({
                    ...channel,
                    ...channelsSettingsById[channel.id]
                }))
            }
        } catch (error) {
            console.log('SlackSettingsError', error)
        }

    if (confluenceClient)
        try {
            // Load all possible Confluence spaces on every update
            const { results: spaces } = await confluenceClient.getSpaces()

            const spacesById =
                (newSettings as AppSettings)?.confluence?.spaces?.reduce((acc: any, space: ConfluenceSpaceSetting) => {
                    acc[space.key] = space
                    return acc
                }, {}) || {}

            newSettings.confluence = {
                ...(newSettings as any)?.confluence,
                spaces: spaces.map((space) => ({
                    ...space,
                    ...spacesById[space.key]
                }))
            }
        } catch (error) {
            console.log('ConfluenceSettingsError', error)
        }

    try {
        const urlSettings =
            (newSettings as any)?.web?.urls?.reduce((acc: any, url: string) => {
                acc[url] = { url }
                return acc
            }, {}) || {}

        const domainSettings =
            (newSettings as any)?.web?.domains?.reduce((acc: any, domain: string) => {
                acc[domain] = { domain }
                return acc
            }, {}) || {}

        newSettings.web = {
            ...(newSettings as any)?.web,
            urls: urlSettings,
            domains: domainSettings
        }
    } catch (error) {
        // TODO: Constant error
        // console.log('urlSettingsError', error);
    }
    try {
        newSettings.airtable = {
            tables: [
                {
                    id: 'supportq12023',
                    title: 'Support Q1 2023',
                    enabled: true
                },
                {
                    id: 'openprojects',
                    title: 'Open Projects',
                    enabled: true
                },
                {
                    id: 'opensupport',
                    title: 'Open Support',
                    enabled: true
                },
                {
                    id: 'opengtm',
                    title: 'Open GTM',
                    enabled: true
                }
            ]
        }
    } catch (error) {
        console.log('JiraSettingsError', error)
    }

    // try {
    //   newSettings.codebase = {
    //     repos: [
    //       {
    //         id: 'docubot-v0.2.2',
    //         name: 'docubot-v0.2.2',
    //         enabled: true
    //       },
    //       {
    //         id: 'answers-ai-v0.1.1',
    //         name: 'answers-ai-v0.1.1',
    //         enabled: true
    //       },
    //       {
    //         id: 'lastrev-marketing-site-v0.1.0',
    //         name: 'lastrev-marketing-site-v0.1.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'langchainjs-v0.0.4',
    //         name: 'langchainjs-v0.0.4',
    //         enabled: true
    //       },
    //       {
    //         id: 'cams-env-test-v0.1.0',
    //         name: 'cams-env-test-v0.1.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'ias-knowledge-base-v0.1.0',
    //         name: 'ias-knowledge-base-v0.1.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'answersai-marketing-v0.1.0',
    //         name: 'answersai-marketing-v0.1.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'trotto-go-links-v0.1.0',
    //         name: 'trotto-go-links-v0.1.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'last-rev-contentful-app-v0.1.0',
    //         name: 'last-rev-contentful-app-v0.1.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'contentful-sidekick-v1.0.0',
    //         name: 'contentful-sidekick-v1.0.0',
    //         enabled: true
    //       },
    //       {
    //         id: 'lastrev-next-starter-v0.1.0',
    //         name: 'lastrev-next-starter-v0.1.0',
    //         enabled: true
    //       }
    //     ]
    //   };
    // } catch (error) {
    //   console.log('JiraSettingsError', error);
    // }

    // const fileSettings =
    //   (newSettings as any)?.files?.url?.reduce((acc: any, file: string) => {
    //     acc[file] = { file };
    //     return acc;
    //   }, {}) || {};

    // try {
    //   newSettings.files = {
    //     url: [...fileSettings]
    //   };
    // } catch (error) {
    //   console.log('FilesSettingsError', error);
    // }

    // const documentSettings =
    //   (newSettings as any)?.document?.url?.reduce((acc: any, document: string) => {
    //     acc[document] = { document };
    //     return acc;
    //   }, {}) || {};

    // try {
    //   newSettings.document = {
    //     url: [...documentSettings]
    //   };
    // } catch (error) {
    //   console.log('DocumenteSettingsError', error);
    // }

    try {
        newSettings.zoom = {
            meetings: [
                {
                    id: 'beacon-strategy-meeting-2023-06-15',
                    name: 'beacon-strategy-meeting-2023-06-15',
                    enabled: true
                }
            ]
        }
    } catch (error) {
        console.log('JiraSettingsError', error)
    }

    try {
        newSettings.youtube = {
            video: [
                {
                    id: 'congress-ai-hearing-2023-05-16',
                    name: 'congress-ai-hearing-2023-05-16',
                    enabled: true
                },
                {
                    id: 'et-sam-altman-June-07-2023',
                    name: 'et-sam-altman-June-07-2023',
                    enabled: true
                },
                {
                    id: 'allin-e133',
                    name: 'allin-e133',
                    enabled: true
                }
            ]
        }
    } catch (error) {
        console.log('JiraSettingsError', error)
    }

    // console.log(JSON.stringify(newSettings, null, 2));
    return newSettings
}
