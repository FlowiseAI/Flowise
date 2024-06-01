/**
 * Use this tool to add a new record into the marketing campaign table.
 * 
 * Inputs:
 * - $name (String) The name of the marketing campaign.
 * - $do (String) What you want your target audience to do.
 * - $know (String) What you want your target audience to know.
 * - $feel (String) What you want your target audience to feel.
 * - $keywords (String) SEO Keywords that describe the marketing campaign.
 */
const fetch = require('node-fetch');
const baseId = 'appHaVCt9OE1RFSX0'; // Digital @ Scale Base
const tableId = 'tblIOSmK5lCSBEnPw'; // Campaign Table Digital @ Scale
const token = $vars.AIRTABLE_API_KEY;

const body = {
    "records": [
        {
            "fields": {
                "fldDeVjLk4Tf1fb4y": $name,
                "fldt1c7zFlzWpeTlN": $do,
                "fldjZdbCdb13Nr1Sl": $know,
                "fldvonOHuw9sPqFxw": $feel,
                "fldKEXcsK9qyheE8h": $keywords,
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
    console.error('Campaign Airtable Tool Error:', error);
    return error.message;
}