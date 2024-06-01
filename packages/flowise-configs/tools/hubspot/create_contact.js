/**
 * Create a new contact in HubSpot
 * 
 * Inputs:
 * - $email (String) The email address of the contact.
 * - $firstname (String) The first name of the contact.
 * - $lastname (String) The last name of the contact.
 * - $vars.HUBSPOT_API_KEY (String) The HubSpot API key.
 */
const fetch = require('node-fetch');
const url = 'https://api.hubapi.com/crm/v3/objects/contacts'
const token = $vars.HUBSPOT_API_KEY;

const body = {
    "properties": {
        "email": $email
    }
};

if ($firstname) body.properties.firstname = $firstname;
if ($lastname) body.properties.lastname = $lastname;

const options = {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
};

try {
    const response = await fetch(url, options);
    const text = await response.text();
    return text;
} catch (error) {
    console.error(error);
    return '';
}