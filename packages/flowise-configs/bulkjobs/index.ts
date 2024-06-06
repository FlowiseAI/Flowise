const { relatedGlossaryTerms, summaryReport } = require('./processors')
const { relatedContentEntries } = require('./jobTypes/labeling')
const { entryListFieldReport } = require('./jobTypes/reports')
/*
 To use this script, you need to create a jobType, this is where your business logic goes, and a process, this is where your configuration for a processor goes.
    The jobType is a function that receives the processor and returns a function that receives the process.
    The process is a function that defines the configuration and returns an object with the configuration, helper functions and other things that you need that are unique to run the job. 
*/

;(async () => {
    // const report = await relatedContentEntries(relatedGlossaryTerms)
    const summary = await entryListFieldReport(summaryReport)
    console.log(summary)
})()
