/**
 * This script is used by workflows inside AnswerAI and queries the personas view in an Airtable table.
 */
const fetch = require('node-fetch');
const baseId = 'appHaVCt9OE1RFSX0'; // Digital @ Scale Base
const tableId = 'tblNHSzfdiLEXXmay'; // Persona Table Digital @ Scale
const view = 'viw9Ag8KjZImOKN5e'; // Encode the view name to ensure the URL is valid
const token = $vars.AIRTABLE_API_KEY;
console.log('Querying View in Airtable');

const options = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
    }
};

const url = `https://api.airtable.com/v0/${baseId}/${tableId}?view=${view}`;

try {
    const response = await fetch(url, options);
    const json = await response.json(); // Assuming you want to work with JSON directly
    return JSON.stringify(json);
} catch (error) {
    console.error('Error Querying View in Airtable:', error);
    return error.message;
}