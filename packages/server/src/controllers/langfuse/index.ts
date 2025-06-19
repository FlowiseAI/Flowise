import { Request, Response, NextFunction } from 'express'

// Interface for Langfuse trace object
interface LangfuseTrace {
    totalCost?: number | null
    output?: string
    [key: string]: any // Allow other properties
}

// Interface for health check response
interface HealthCheckResult {
    status: 'ok' | 'critical'
}

const getHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Set overall timeout for the entire operation (10 minutes)
        const operationTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out after 10 minutes')), 10 * 60 * 1000)
        })

        const mainOperation = async () => {
            // ✅ CONFIGURABLE: Change this value to adjust the time range (in minutes)
            const MINUTES_TO_QUERY = 60 // Easy to modify - examples:
            // 5 minutes = 5
            // 15 minutes = 15
            // 1 hour = 60
            // 24 hours = 1440
            // 7 days = 10080
            // 30 days = 43200

            const secretKey = process.env.LANGFUSE_SECRET_KEY || ''
            const publicKey = process.env.LANGFUSE_PUBLIC_KEY || ''
            const baseUrl = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'

            if (!secretKey || !publicKey) {
                throw new Error('Missing Langfuse API keys')
            }

            // Calculate date range based on configurable minutes
            const startDate = new Date()
            startDate.setMinutes(startDate.getMinutes() - MINUTES_TO_QUERY)

            // Create Basic Auth header
            const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')

            // Build base query parameters for the specified date range
            const baseParams = {
                fromTimestamp: startDate.toISOString(),
                toTimestamp: new Date().toISOString(),
                limit: '100'
            }

            // Helper function to fetch a specific page with retry logic and timeout handling
            const fetchPage = async (page: number, retries: number = 3): Promise<any> => {
                const params = new URLSearchParams({
                    ...baseParams,
                    page: page.toString()
                })

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const controller = new AbortController()
                        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

                        const response = await fetch(`${baseUrl}/api/public/traces?${params}`, {
                            method: 'GET',
                            headers: {
                                Authorization: `Basic ${auth}`,
                                'Content-Type': 'application/json'
                            },
                            signal: controller.signal
                        })

                        clearTimeout(timeoutId)

                        if (response.status === 429) {
                            // Rate limited - wait longer before retry
                            const waitTime = Math.pow(2, attempt) * 2000 // Exponential backoff: 2s, 4s, 8s
                            await new Promise((resolve) => setTimeout(resolve, waitTime))
                            continue
                        }

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                        }

                        return await response.json()
                    } catch (error) {
                        if (attempt === retries) {
                            throw new Error(
                                `Failed to fetch page ${page} after ${retries} attempts: ${
                                    error instanceof Error ? error.message : 'Unknown error'
                                }`
                            )
                        }

                        // Wait before retry (exponential backoff)
                        const waitTime = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
                        await new Promise((resolve) => setTimeout(resolve, waitTime))
                    }
                }
            }

            // Helper function to add delay between requests to avoid rate limiting
            const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

            // First, fetch page 1 to get totalPages
            const firstPageResult = await fetchPage(1)
            const totalPages = firstPageResult.meta?.totalPages || 1

            // Collect all data from all pages
            let allTraces = firstPageResult.data || []
            const failedPages: number[] = []

            // Fetch remaining pages if there are more than 1
            if (totalPages > 1) {
                const BATCH_SIZE = 5 // Process 5 pages at a time to avoid overwhelming the API
                const remainingPageNumbers = []
                for (let page = 2; page <= totalPages; page++) {
                    remainingPageNumbers.push(page)
                }

                // Process pages in batches
                for (let i = 0; i < remainingPageNumbers.length; i += BATCH_SIZE) {
                    const batch = remainingPageNumbers.slice(i, i + BATCH_SIZE)

                    try {
                        // Fetch batch with small delay between requests
                        const batchPromises = batch.map(async (page, index) => {
                            if (index > 0) {
                                await delay(200) // 200ms delay between requests in the same batch
                            }
                            return fetchPage(page)
                        })

                        const batchResults = await Promise.allSettled(batchPromises)

                        // Process batch results
                        batchResults.forEach((result, index) => {
                            const pageNumber = batch[index]
                            if (result.status === 'fulfilled') {
                                allTraces = allTraces.concat(result.value.data || [])
                            } else {
                                console.error(`Failed to fetch page ${pageNumber}: ${result.reason}`)
                                failedPages.push(pageNumber)
                            }
                        })

                        // Add delay between batches to be respectful to the API
                        if (i + BATCH_SIZE < remainingPageNumbers.length) {
                            await delay(1000)
                        }
                    } catch (error) {
                        console.error(`Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                        // Continue with next batch even if current batch fails
                    }
                }
            }

            // Filter for problematic traces
            // Problematic = totalCost is 0 (or null/undefined) AND output is NOT "Error: Non string message content not supported"
            const isProblematic = (trace: LangfuseTrace): boolean => {
                // Check if totalCost is 0, null, or undefined
                const hasCostIssue = trace.totalCost === 0 || trace.totalCost === null || trace.totalCost === undefined

                // Check if output is NOT the specific error message
                const hasNonErrorOutput = trace.output !== 'Error: Non string message content not supported'

                return hasCostIssue && hasNonErrorOutput
            }

            const problematicTraces = allTraces.filter(isProblematic)
            const nonProblematicTraces = allTraces.filter((trace: LangfuseTrace) => !isProblematic(trace))

            // Debug logging - only when DEBUG=true environment variable is set
            if (process.env.DEBUG === 'true') {
                console.log('=== DEBUG INFORMATION ===', {
                    filtering: {
                        problematicConditions: [
                            'totalCost is 0, null, or undefined',
                            "output is NOT 'Error: Non string message content not supported'"
                        ],
                        problematicCount: problematicTraces.length,
                        nonProblematicCount: nonProblematicTraces.length,
                        problematicPercentage: Math.round((problematicTraces.length / allTraces.length) * 100)
                    }
                })
            }

            // Determine status for Datadog alerts based on problematic traces
            const alertStatus = problematicTraces.length === 0 ? 'ok' : 'critical'

            return {
                status: alertStatus
            }
        }

        // Race between the main operation and the timeout
        const result = (await Promise.race([mainOperation(), operationTimeout])) as HealthCheckResult

        // Set HTTP status code based on alert status for Datadog monitoring
        const httpStatus = result.status === 'critical' ? 503 : 200 // 503 Service Unavailable for critical issues

        return res.status(httpStatus).json(result)
    } catch (error) {
        console.error('Langfuse health check error:', error instanceof Error ? error.message : 'An error occurred while fetching traces')
        return res.status(500).json({
            status: 'critical'
        })
    }
}

export default {
    getHealthCheck
}
