const createFineTuneQuestions = require('./createFineTuneQuestions')
const legaDocumentTagging = require('./legaDocumentTagging')
const helpCenterArticleTagging = require('./helpCenterArticleTagging')
const analyzeComms = require('./analyzeComms')
const shortSummary = require('./shortSummary')
const summaryReport = require('./summaryReport')
const relatedGlossaryTerms = require('./relatedGlossaryTerms')

module.exports = {
    createFineTuneQuestions,
    legaDocumentTagging,
    helpCenterArticleTagging,
    analyzeComms,
    shortSummary,
    summaryReport,
    relatedGlossaryTerms
}
