const contentful = require('contentful-management')
const { richTextFromMarkdown } = require('@contentful/rich-text-from-markdown')

// const accessToken = $vars.CONTENTFUL_MANAGEMENT_API
const accessToken = ''
const spaceId = 'e4vn8tcbbhts' // Replace with your Space ID
const environmentId = 'master' // Replace with your Environment ID if different
const contentTypeId = 'block' // The ID of the 'block' content type

// const text = $text
// const imageURL = $imageURL || null // Set to null if no image URL is provided
const text = 'This is cool'
const imageURL = 'https://images.ctfassets.net/imglmb3xms7o/2uc3ZV2MgBFtBTWCeldqm8/6476397d8e3729051488864942ce6165/laptop-rocket-icon.png'

    ; (async () => {
        // Function to create a new content entry
        try {
            const client = contentful.createClient(
                {
                    accessToken: accessToken
                },
                { type: 'plain' }
            )

            // Convert text to rich text from markdown
            const document = await richTextFromMarkdown(text)

            // Create an asset if an image URL is provided
            let mediaId = null
            if (imageURL) {
                console.log(`CONTENTFUL TOOL: Attempting to create an asset from an Image URL ${imageURL}`)
                let assetId = null
                const asset = await client.asset.create(
                    {
                        spaceId,
                        environmentId
                    },
                    {
                        fields: {
                            title: {
                                'en-US': 'Image Asset'
                            },
                            file: {
                                'en-US': {
                                    contentType: 'image/jpeg', // Assuming JPEG format
                                    fileName: 'testinganotherfilenameimage.jpg',
                                    upload: imageURL
                                }
                            }
                        }
                    }
                )
                console.log(`CONTENTFUL TOOL: Asset created successfully: ${asset.sys.id}`)
                assetId = asset.sys.id
                await client.asset.processForLocale(
                    {
                        spaceId: spaceId,
                        environmentId: environmentId
                    },
                    { ...asset },
                    'en-US'
                )

                const mediaEntry = await client.entry.create(
                    {
                        spaceId,
                        environmentId,
                        contentTypeId: 'media'
                    },
                    {
                        fields: {
                            internalTitle: {
                                'en-US': 'Media Entry'
                            },
                            title: {
                                'en-US': 'Media Entry'
                            },
                            ...(assetId ? { asset: { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: assetId } } } } : {})
                        }
                    }
                )
                mediaId = mediaEntry.sys.id
            }
            // Create a new entry
            const newEntry = await client.entry.create(
                {
                    spaceId,
                    environmentId,
                    contentTypeId
                },
                {
                    fields: {
                        internalTitle: {
                            'en-US': 'Block Entry'
                        },
                        title: {
                            'en-US': 'Block Entry'
                        },
                        body: {
                            'en-US': document
                        },
                        ...(mediaId ? { mediaItems: { 'en-US': [{ sys: { type: 'Link', linkType: 'Entry', id: mediaId } }] } } : {})
                    }
                }
            )

            console.log(`CONTENTFUL TOOL: Entry created successfully: EntryID: ${newEntry.sys.id}`)
            return newEntry.sys.id
        } catch (error) {
            console.error('Error:', error)
            return error.message
        }

    })()
