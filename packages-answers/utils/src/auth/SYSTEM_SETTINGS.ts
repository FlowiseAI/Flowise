import { AppSettings } from 'types'

export const SYSTEM_SETTINGS: AppSettings = {
    services: [
        { id: 'file', name: 'Plain Text', imageURL: '/static/images/icon-fast-text.svg' },
        { id: 'document', name: 'document', imageURL: '/static/images/documents.png' },
        {
            id: 'confluence',
            providerId: 'atlassian',
            name: 'confluence',
            imageURL: '/static/images/logo-confluence.svg'
        },
        {
            id: 'contentful',
            name: 'contentful',
            imageURL: '/static/images/logo-contentful.svg'
        },

        {
            id: 'drive',
            providerId: 'google',
            name: 'drive',
            imageURL: '/static/images/logo-google-drive.svg'
        },

        {
            id: 'github',
            providerId: 'github',
            name: 'github',
            imageURL: '/static/images/logo-github.svg'
        },

        {
            id: 'jira',
            providerId: 'atlassian',
            name: 'jira',
            imageURL: '/static/images/logo-jira.svg'
        },

        { id: 'notion', name: 'notion', imageURL: '/static/images/logo-notion.svg' },

        { id: 'slack', providerId: 'slack', name: 'slack', imageURL: '/static/images/logo-slack.svg' },

        { id: 'web', name: 'web', imageURL: '/static/images/logo-web.svg' },

        { id: 'airtable', name: 'airtable', imageURL: '/static/images/airtable.png' },

        { id: 'codebase', name: 'codebase', imageURL: '/static/images/docubot.png' },

        { id: 'zoom', name: 'zoom', imageURL: '/static/images/zoom.png' },

        { id: 'youtube', name: 'youtube', imageURL: '/static/images/youtube.png' }
    ]
}
