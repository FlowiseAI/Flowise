/**
 * Cretes a new record in the Airtable table with the provided data.
 * 
 * Inputs:
 * - $platform (String) The platform where the post will be published.
 * - $post (String) The content of the post.
 */

const fetch = require('node-fetch');
const baseId = 'appHaVCt9OE1RFSX0'; // Digital @ Scale Base
const tableId = 'tbl6A3JfVK76vaDl0'; // Social Media Posts Table
const token = $vars.AIRTABLE_API_KEY; // 

const body = {
    "records": [
        {
            "fields": {
                "Platform": $platform,
                "Post": $post,
                "Status": "Needs Review",
            }
        }
    ]
};

const options = {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
};

const url = `https://api.airtable.com/v0/${baseId}/${tableId}`

try {
    const response = await fetch(url, options);
    const text = await response.text();
    return text;
} catch (error) {
    console.error(error);
    return '';
}