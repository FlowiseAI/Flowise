const csv = require('csv')
const fs = require('fs')
const path = require('path')

async function aggregateDataReport(processor, entries) {
    const { headerField, countField } = processor.aggregateReportSettings
    const dataMap = {}

    // Organize data by dynamically specified fields
    entries.forEach((entry) => {
        const headerValue = entry.fields[headerField]
        const countValue = entry.fields[countField]
        if (!dataMap[headerValue]) {
            dataMap[headerValue] = {}
        }
        if (!dataMap[headerValue][countValue]) {
            dataMap[headerValue][countValue] = 0
        }
        dataMap[headerValue][countValue] += 1
    })

    // Convert organized data to CSV format
    const headers = Object.keys(dataMap)
    const countTypes = new Set()
    Object.values(dataMap).forEach((types) => {
        Object.keys(types).forEach((type) => countTypes.add(type))
    })

    const csvData = Array.from(countTypes).map((type) => {
        const row = { [countField]: type }
        headers.forEach((header) => {
            row[header] = dataMap[header][type] || 0
        })
        return row
    })

    // Add totals row
    const totals = headers.reduce((acc, header) => {
        acc[header] = Object.values(dataMap[header]).reduce((sum, num) => sum + num, 0)
        return acc
    }, {})

    csvData.push({ [countField]: 'Total', ...totals })

    // Generate CSV
    csv.stringify(csvData, { header: true, columns: [countField, ...headers] }, (err, output) => {
        if (err) throw err
        fs.writeFileSync(path.join(__dirname, 'report.csv'), output)
    })
}

module.exports = { aggregateDataReport }
