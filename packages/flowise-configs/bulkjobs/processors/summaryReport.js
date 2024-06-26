const summaryReport = {
    name: 'summaryReport',
    description: 'Creates a CSV file of all of the fields the user wants to see in a report.',
    sourceContentTypeId: 'jiraSummary',
    reportDataFields: ['sys.id', 'fields.title', 'fields.aiSummaryAccountManagement', 'fields.aiSummarySupport'],
    filters: {
        'fields.accountName': 'Last Rev'
    }
}

module.exports = summaryReport
