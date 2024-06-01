/**
 * This script creates a new content entry of type 'block' in Contentful.
 * It accepts two fields: 'text' (required) and 'imageURL' (optional).
 * The 'text' field is converted to rich text from markdown, and the 'imageURL' is added as an asset.
 *
 * Inputs:
 * - $text (String) The markdown text content for the entry.
 * - $imageURL (String, optional) The URL of the image to be added as an asset.
 * - $vars.CONTENTFUL_MANAGEMENT_API (String) The Contentful Management API environment variable.
 */

const contentful = require('contentful-management')
const { richTextFromMarkdown } = require('@contentful/rich-text-from-markdown')

const accessToken = $vars.CONTENTFUL_MANAGEMENT_API
const spaceId = 'e4vn8tcbbhts' // Replace with your Space ID
const environmentId = 'master' // Replace with your Environment ID if different
const contentTypeId = 'block' // The ID of the 'block' content type

const text = $text
const imageURL = $imageURL || null // Set to null if no image URL is provided


function getFilenameFromPath(urlOrPath) {
    // Use a regular expression to match the filename at the end of the path
    const regex = /\/([^\/]+)$|\\([^\\]+)$/
    const match = urlOrPath.match(regex)

    // Extract the filename if a match is found
    const filename = match ? match[1] || match[2] : null

    // Check if the extracted filename contains a dot, indicating an extension
    if (filename && filename.includes('.')) {
        return filename
    }

    return null // Return null if no filename with an extension is found
}

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
