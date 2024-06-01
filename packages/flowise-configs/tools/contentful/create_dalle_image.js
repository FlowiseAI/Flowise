const fetch = require('node-fetch')

const accessToken = $vars.OPENAI_API_KEY
const spaceId = 'e4vn8tcbbhts' // Replace with your Space ID
const environmentId = 'master' // Replace with your Environment ID if different
const contentTypeId = 'block' // The ID of the 'block' content type

const text = $text
const imageURL = $imageURL || null // Set to null if no image URL is provided

// Helper function to make an authenticated request to the Contentful Management API
async function makeRequest(url, method, body = null) {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Contentful-Version': 1
    }

    const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(body)
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
}

try {
    // Convert text to rich text from markdown
    const document = await richTextFromMarkdown(text)

    let assetId = null
    if (imageURL) {
        console.log(`Attempting to create an asset from an Image URL: ${imageURL}`)
        const assetResponse = await makeRequest(
            `https://api.contentful.com/spaces/${spaceId}/environments/${environmentId}/assets`,
            'POST',
            {
                fields: {
                    title: {
                        'en-US': 'Image Asset'
                    },
                    file: {
                        'en-US': {
                            contentType: 'image/jpeg',
                            fileName: 'image.jpg',
                            upload: imageURL
                        }
                    }
                }
            }
        )

        assetId = assetResponse.sys.id
        console.log(`Asset created successfully: ${assetId}`)

        // Process the asset for the 'en-US' locale
        await makeRequest(
            `https://api.contentful.com/spaces/${spaceId}/environments/${environmentId}/assets/${assetId}/files/en-US/process`,
            'PUT',
            null
        )
            .then((processedAssetResponse) => {
                console.log(`Asset processed successfully for locale 'en-US'`, processedAssetResponse.sys.id)
            })
            .catch((error) => {
                console.error('Error processing asset:', error.message)
            })
    }

    // Create the content entry
    const entryResponse = await makeRequest(`https://api.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries`, 'POST', {
        fields: {
            text: {
                'en-US': document
            },
            ...(assetId ? { image: { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: assetId } } } } : {})
        }
    })

    console.log(`Entry created successfully: EntryID: ${entryResponse.sys.id}`)
    return entryResponse.sys.id
} catch (error) {
    console.error('Error creating content entry:', error)
    return error.message
}
