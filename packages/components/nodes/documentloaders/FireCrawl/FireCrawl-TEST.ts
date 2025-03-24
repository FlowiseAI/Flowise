import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { FireCrawlLoader } from './FireCrawl'

async function testFireCrawl() {
    const apiKey = process.env.FIRECRAW_API_KEY || 'FIRECRAW_API_KEY'
    const apiUrl = 'https://api.firecrawl.dev'

    // Test URLs
    const testUrl = 'https://firecrawl.dev/'
    const testUrlForExtract = 'https://firecrawl.dev/*'

    // Test 1: Basic Scraping
    console.log('\n=== Testing Basic Scraping ===')
    try {
        const scrapeLoader = new FireCrawlLoader({
            url: testUrl,
            apiKey,
            apiUrl,
            mode: 'scrape',
            params: {
                onlyMainContent: true,
                includeTags: ['article', 'main', 'section'],
                excludeTags: ['header', 'footer', 'nav']
            }
        })
        const scrapeDocs = await scrapeLoader.load()
        console.log('Scrape Results:', {
            numDocs: scrapeDocs.length,
            firstDocMetadata: scrapeDocs[0]?.metadata,
            firstDocContent: scrapeDocs[0]?.pageContent.substring(0, 100) + '...'
        })
    } catch (error) {
        console.error('Scraping Error:', error)
    }

    // Test 2: Crawling with Text Splitter
    console.log('\n=== Testing Crawling with Text Splitter ===')
    try {
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        })
        const crawlLoader = new FireCrawlLoader({
            url: testUrl,
            apiKey,
            apiUrl,
            mode: 'crawl',
            params: {
                limit: 5, // Limit to 5 pages for testing
                includePaths: ['/docs', '/blog'],
                excludePaths: ['/api', '/admin']
            }
        })

        console.log('Starting crawl with params:', {
            url: testUrl,
            apiKey: apiKey.substring(0, 8) + '...',
            apiUrl,
            mode: 'crawl'
        })

        const crawlDocs = await crawlLoader.load()

        if (!crawlDocs || crawlDocs.length === 0) {
            console.warn('No documents were returned from the crawl')
            return
        }

        console.log('Crawl Results:', {
            numDocs: crawlDocs.length,
            firstDocMetadata: crawlDocs[0]?.metadata,
            firstDocContent: crawlDocs[0]?.pageContent.substring(0, 100) + '...'
        })
    } catch (error: any) {
        console.error('Crawling Error Details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status
        })
    }

    // Test 3: Data Extraction
    console.log('\n=== Testing Data Extraction ===')
    try {
        const extractLoader = new FireCrawlLoader({
            url: testUrlForExtract,
            apiKey,
            apiUrl,
            mode: 'extract',
            params: {
                schema: {
                    type: 'object',
                    properties: {
                        company: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string'
                                },
                                mission: {
                                    type: 'string'
                                },
                                is_open_source: {
                                    type: 'boolean'
                                }
                            },
                            required: ['name']
                        }
                    },
                    required: ['company']
                },
                prompt: 'Extract the company name, mission, and determine if the company is open source.'
            }
        })
        const extractDocs = await extractLoader.load()
        console.log('Extract Results:', {
            numDocs: extractDocs.length,
            firstDocMetadata: extractDocs[0]?.metadata,
            firstDocContent: extractDocs[0]?.pageContent
        })
    } catch (error) {
        console.error('Extraction Error:', error)
    }

    // // Test 4: Get Extract Status
    console.log('\n=== Testing Get Extract Status ===')
    try {
        const statusLoader = new FireCrawlLoader({
            url: testUrl,
            apiKey,
            apiUrl,
            mode: 'getExtractStatus',
            params: { jobId: 'EXTRACT_JOB_ID' } // Replace with an actual job ID
        })
        const statusResult = await statusLoader.load()
        console.log('Status Results:', statusResult)
    } catch (error) {
        console.error('Status Check Error:', error)
    }
}

// Run the tests
testFireCrawl().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})
