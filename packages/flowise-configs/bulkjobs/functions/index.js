const fetchEntriesFromContentful = require('./fetchEntriesFromContentful')
const processFilesFromDirectory = require('./processFilesFromDirectory')
const createContentfulEntry = require('./createContentfulEntry')
const updateContentfulEntry = require('./updateContentfulEntry')
const { convertEntryToPlainText } = require('./richTextParser')
const processDocumentsWithAnswerAI = require('./processDocumentsWithAnswerAI')
const processContentEntries = require('./processContentEntries')
const createEntryListFieldReport = require('./createEntryListFieldReport')
const deleteContentEntries = require('./deleteContentEntries')
const callChatflow = require('./callChatflow')

module.exports = {
    fetchEntriesFromContentful,
    processFilesFromDirectory,
    createContentfulEntry,
    updateContentfulEntry,
    callChatflow,
    convertEntryToPlainText,
    processDocumentsWithAnswerAI,
    processContentEntries,
    createEntryListFieldReport,
    deleteContentEntries
}
