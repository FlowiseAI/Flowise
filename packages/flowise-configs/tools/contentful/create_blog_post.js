/**
 * This script creates or updates a Contentful entry of a specified content type.
 * It uses the Contentful Management API to interact with the Contentful space.
 *
 * Inputs:
 * - $entryId (String) The ID of the entry to create or update.
 * - $title (String) The title of the entry.
 * - $outline (String) The markdown content of the entry.
 * - $vars.CONTENTFUL_MANAGEMENT_API (String) The Contentful Management API environment variable
 */
const contentful = require('contentful-management')
const { richTextFromMarkdown } = require('@contentful/rich-text-from-markdown')
const accessToken = $vars.CONTENTFUL_MANAGEMENT_API
const spaceId = 'imglmb3xms7o' // Your Space ID
const environmentId = 'master' // Your Environment ID, 'master' by default
const contentTypeId = 'pageBlog' // The ID of the content type you want to create or update

const entryId = $entryId
const title = $title
const document = await richTextFromMarkdown($outline)

console.log('ENTRY ID:', entryId)
console.log('TITLE:', title)
console.log('DOCUMENT:', document)
// Function to create or update a content item

try {
    const client = contentful.createClient(
        {
            accessToken: accessToken
        },
        { type: 'plain' }
    )

    console.log('CLIENT RESPONSE')
    // Attempt to fetch the entry by ID
    let entry
    try {
        entry = await client.entry.get({
            spaceId,
            environmentId,
            contentTypeId,
            entryId
        })
    } catch (error) {
        console.log('ERROR GETTING BLOG POST: ', error.name)
        if (error.name === 'NotFound') {
            // Entry does not exist, create a new one
            entry = null
        } else {
            throw error // Rethrow error if it's not a NotFound error
        }
    }

    if (entry) {
        const updatedEntry = await client.entry.update(
            {
                spaceId,
                environmentId,
                contentTypeId,
                entryId
            },
            {
                sys: entry.sys,
                fields: {
                    title: {
                        'en-US': title
                    },
                    body: {
                        'en-US': document
                    }
                }
            }
        )
        return `Entry updated successfully: ${updatedEntry.sys.id}`
    } else {
        // Create a new entry
        console.log('GOT TO NEW ENTRY:')
        const newEntry = await client.entry.createWithId(
            {
                spaceId,
                environmentId,
                contentTypeId,
                entryId
            },
            {
                fields: {
                    title: { 'en-US': title }
                }
            }
        )
        return `Entry created successfully: ${newEntry.sys.id}`
    }
} catch (error) {
    console.error('Error:', error)
    return error.message // Re-throw the error to be caught by the calling code if necessary
}
