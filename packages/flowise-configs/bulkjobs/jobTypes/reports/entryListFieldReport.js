const { fetchEntriesFromContentful } = require('../../functions')
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const csv = require('csv-stringify')

async function entryListFieldReport(processor) {
    let allEntries = processor.entries || []
    if (allEntries.length === 0 && processor.sourceContentTypeId) {
        allEntries = await fetchEntriesFromContentful(processor.sourceContentTypeId, processor?.filters)
    }

    // Fields to use as column headers, passed via the processor
    const reportDataFields = processor.reportDataFields

    // Generate CSV data where each row corresponds to an entry
    const csvData = allEntries.map((entry) => {
        // Create a row for each entry, mapping field names to field values or URLs if it is an asset
        const row = {}
        row['sys.id'] = entry.sys.id
        reportDataFields.forEach((field) => {
            const fieldValue = _.get(entry, field)
            if (Array.isArray(fieldValue) && fieldValue.every((item) => typeof item === 'string')) {
                // Check if it's an array of strings and join them with a dash
                row[field] = fieldValue.join('-')
            } else if (Array.isArray(fieldValue) && fieldValue.every((item) => item.sys && item.sys.type === 'Asset')) {
                // Check if it's an array of assets and include the URLs with 'https:' prefix
                row[field] = fieldValue.map((item) => `https:${item.fields.file.url}`).join('-')
            } else if (Array.isArray(fieldValue) && fieldValue.every((item) => item.sys && item.sys.type === 'Entry')) {
                // Check if it's an array of entries and include the URLs with 'https:' prefix
                row[field] = fieldValue.map((item) => item.fields.term).join('\n') // need to change this to the field you want to display 
            } else if (fieldValue && fieldValue.sys && fieldValue.sys.type === 'Asset') {
                // Check if it's an asset and include the URL with 'https:' prefix
                const url = fieldValue.fields.file.url
                row[field] = `https:${url}`
            } else if (fieldValue && field.indexOf('sys.id') > -1) {
                row[field] = `https://app.contentful.com/spaces/${entry.sys.space.sys.id}/environments/${entry.sys.environment.sys.id}/entries/${fieldValue}`
            } else if (fieldValue) {
                row[field] = fieldValue || 'N/A' // Fill with 'N/A' if field is missing, not an asset, or not an array of strings
            }
        })
        return row
    })

    // Generate CSV with dynamic columns based on reportDataFields
    csv.stringify(csvData, { header: true, columns: reportDataFields }, (err, output) => {
        if (err) throw err
        // Write CSV output to a file
        fs.writeFileSync(path.join(__dirname, 'report.csv'), output)
    })
}

module.exports = entryListFieldReport
