import { Document } from '@langchain/core/documents'
import { PuppeteerCrawler, CheerioCrawler, RequestQueue, MemoryStorage, KeyValueStore } from 'crawlee'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { ICommonObject } from '../../../src/Interface'
import robotsParser from 'robots-parser'

type CrawlMode = 'links' | 'sitemap' | 'both'

export type DeepCrawlOptions = {
    startUrl: string
    crawlMode: CrawlMode
    renderJs: boolean
    maxPages: number // 0 = unlimited
    maxDepth: number
    sameDomainOnly: boolean
    includeRegex?: string
    excludeRegex?: string

    // Content cleanup
    stripSelectors?: string
    dedupeCommonBlocks: boolean
    commonBlockThreshold: number // 0..1
    minBlockChars: number

    // Politeness / limits
    respectRobots: boolean
    concurrency: number
    delayMs: number
    timeoutMs: number
}

type UserData = { depth: number; sourceType: 'seed' | 'crawl' | 'sitemap' }

type PageResult = {
    url: string
    title?: string
    depth: number
    sourceType: string
    fetchedAt: string
    blocks: string[]
}

function normalizeUrl(raw: string): string {
    try {
        const u = new URL(raw)
        u.hash = ''
        u.searchParams.sort() // Normalize query parameter order
        u.pathname = u.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
        return u.toString().toLowerCase()
    } catch {
        return raw
    }
}

function compileRegex(s?: string): RegExp | null {
    if (!s) return null
    const t = s.trim()
    if (!t) return null
    try {
        return new RegExp(t)
    } catch {
        return null
    }
}

function urlAllowedByFilters(url: string, startHost: string, sameDomainOnly: boolean, inc: RegExp | null, exc: RegExp | null) {
    try {
        const u = new URL(url)
        const normalizeHost = (h: string) => h.replace(/^www\./i, '')
        if (sameDomainOnly && normalizeHost(u.host) !== normalizeHost(startHost)) return false
        if (exc && exc.test(url)) return false
        if (inc && !inc.test(url)) return false
        return true
    } catch {
        return false
    }
}

function isAssetUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        const path = parsed.pathname.toLowerCase()
        
        // Skip common asset directories
        const assetDirs = ['/img/', '/images/', '/assets/', '/static/', '/media/', '/uploads/', '/cdn/', '/dist/']
        if (assetDirs.some(dir => path.includes(dir))) {
            return true
        }
        
        // Check for file extensions at the end of the path
        const lastSegment = path.split('/').pop() || ''
        const hasExtension = /\.\w+$/.test(lastSegment)
        
        if (hasExtension) {
            const extension = lastSegment.split('.').pop()?.toLowerCase() || ''
            const nonAssetExtensions = new Set([
                'html', 'htm', 'php', 'asp', 'aspx', 'jsp',
                'xml', 'rss', 'atom',
                'txt', 'md', 'rst',
                'cgi', 'pl', 'py', 'rb'
            ])
            
            const assetExtensions = new Set([
                'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff',
                'css', 'js', 'map',
                'pdf',
                'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
                'mp4', 'mp3', 'avi', 'mov', 'wmv', 'flv',
                'wav', 'ogg', 'wma',
                'woff', 'woff2', 'ttf', 'eot', 'otf'
            ])
            
            // Skip if it's an asset extension AND not a known non-asset extension
            if (assetExtensions.has(extension) && !nonAssetExtensions.has(extension)) {
                return true
            }
        }
        
        return false
    } catch {
        // Fallback: check only at end of URL or before query/hash
        const urlWithoutQuery = url.split('?')[0].split('#')[0]
        return /\.(?:jpe?g|png|gif|webp|svg|ico|css|js|map|pdf|zip|rar|7z|tar|gz|mp[34]|wav|woff2?|ttf|eot)$/i.test(urlWithoutQuery)
    }
}

async function fetchRobotsTxt(baseUrl: string): Promise<ReturnType<typeof robotsParser> | null> {
    try {
        const u = new URL(baseUrl)
        const robotsUrl = `${u.protocol}//${u.host}/robots.txt`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const res = await fetch(robotsUrl, { 
            signal: controller.signal,
            redirect: 'follow'
        })
        clearTimeout(timeoutId)
        
        if (!res.ok) return null
        const txt = await res.text()
        return robotsParser(robotsUrl, txt)
    } catch {
        return null
    }
}

async function discoverSitemapUrls(startUrl: string): Promise<string[]> {
    const u = new URL(startUrl)
    const commonPaths = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap-index.xml',
        '/sitemap.php',
        '/sitemap.txt',
        '/sitemap/',
        '/sitemaps/'
    ]
    
    return commonPaths.map(path => `${u.protocol}//${u.host}${path}`)
}

async function parseSitemapXml(xmlText: string): Promise<{ urls: string[]; sitemaps: string[] }> {
    const locs = [...xmlText.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
    const isIndex = /<sitemapindex[\s>]/i.test(xmlText)
    return { urls: isIndex ? [] : locs, sitemaps: isIndex ? locs : [] }
}

async function processSitemap(url: string, timeoutMs: number): Promise<string[]> {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        
        const res = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DeepWebCrawler/1.0)' }
        })
        clearTimeout(timeoutId)
        
        if (!res.ok) return []
        
        const xml = await res.text()
        const { urls, sitemaps } = await parseSitemapXml(xml)
        
        // Process nested sitemaps in parallel
        const nestedResults = await Promise.allSettled(
            sitemaps.map(async (sitemap) => {
                try {
                    return await processSitemap(sitemap, timeoutMs)
                } catch {
                    return []
                }
            })
        )
        
        const nestedUrls = nestedResults
            .filter(r => r.status === 'fulfilled')
            .map(r => (r as PromiseFulfilledResult<string[]>).value)
            .flat()
        
        return [...urls, ...nestedUrls]
    } catch {
        return []
    }
}

function defaultStripSelectors(): string[] {
    return [
        'script',
        'style',
        'noscript',
        'nav',
        'header',
        'footer',
        'aside',
        'form',
        'iframe',
        'svg',
        '[role="navigation"]',
        '[role="banner"]',
        '[role="contentinfo"]',
        '#cookie',
        '.cookie',
        '.cookies',
        '.cookie-banner',
        '.consent',
        '.gdpr',
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[id*="consent"]',
        '[class*="consent"]',
        '.menu',
        '.navbar',
        '.nav',
        '.sidebar',
        '.breadcrumbs',
        '.breadcrumb',
        '[class*="sidebar"]',
        '[id*="sidebar"]',
        '[class*="nav"]',
        '[id*="nav"]'
    ]
}

function mergeStripSelectors(extra?: string): string[] {
    const base = defaultStripSelectors()
    const add =
        extra && extra.trim()
            ? extra
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : []
    return [...new Set([...base, ...add])]
}

function extractReadableTextFromHtml(html: string, url: string, stripSel: string[]): { title?: string; text: string } {
    try {
        const dom = new JSDOM(html, { 
            url,
            pretendToBeVisual: true,
            resources: "usable"
        })
        
        // Batch DOM operations
        const doc = dom.window.document
        try {
            // Try all selectors at once first
            const combinedSelector = stripSel.join(',')
            doc.querySelectorAll(combinedSelector).forEach(el => el.remove())
        } catch {
            // Fallback to individual selectors
            for (const sel of stripSel) {
                try {
                    doc.querySelectorAll(sel).forEach(el => el.remove())
                } catch {
                    // Skip invalid selector
                }
            }
        }

        const reader = new Readability(doc)
        const article = reader.parse()
        if (article?.textContent) {
            return { 
                title: article.title || dom.window.document.title || undefined, 
                text: article.textContent.trim() 
            }
        }
        
        // Fallback extraction
        let text = dom.window.document.body?.textContent || ''
        text = text
            .replace(/\s*\n\s*/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s{2,}/g, ' ')
            .trim()
            
        return { 
            title: dom.window.document.title || undefined, 
            text 
        }
    } catch {
        // Ultimate fallback
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
        return { text }
    }
}

function toBlocks(text: string, minChars: number): string[] {
    return text
        .split(/\n{2,}/g)
        .map((b) => b.replace(/\s+/g, ' ').trim())
        .filter((b) => b.length >= minChars)
}

export async function deepCrawlToDocuments(opts: DeepCrawlOptions, options?: ICommonObject): Promise<Document[]> {
    const orgId = options?.orgId ?? 'unknown-org'

    const DEBUG = process.env.DEBUG === 'true'

    const dbg = (...args: any[]) => {
        if (!DEBUG) return
        process.stderr.write(
            `[DeepWebCrawler] ${args
                .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
                .join(' ')}\n`
        )
    }
    
    dbg('deepCrawlToDocuments called', { startUrl: opts.startUrl, crawlMode: opts.crawlMode })
    
    const startUrl = normalizeUrl(opts.startUrl)
    const startHost = new URL(startUrl).host
    const inc = compileRegex(opts.includeRegex)
    const exc = compileRegex(opts.excludeRegex)
    const stripSel = mergeStripSelectors(opts.stripSelectors)
    const maxRequestsPerCrawl = opts.maxPages > 0 ? opts.maxPages : undefined

    const pages: PageResult[] = []
    const blockFreq = new Map<string, number>()
    const seen = new Set<string>()
    
    const maxPages = opts.maxPages > 0 ? opts.maxPages : Infinity

    // ✅ Make ALL Crawlee state in-memory for Flowise preview/process runs
    const storageClient = new MemoryStorage()
    await KeyValueStore.open(undefined, { storageClient })

    // ✅ Unique queue per run avoids reuse/counters issues
    const queueName = `deepWebCrawler-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const rq = await RequestQueue.open(queueName, { storageClient })

    const robots = opts.respectRobots ? await fetchRobotsTxt(startUrl) : null

    const shouldProcessUrl = (url: string): { allowed: boolean; reason?: string } => {
        if (pages.length >= maxPages) return { allowed: false, reason: 'max_pages_reached' }
        
        let normalized = url
        try {
            normalized = normalizeUrl(url)
        } catch {
            dbg('reject invalid url', url)
            return { allowed: false, reason: 'invalid_url' }
        }

        if (isAssetUrl(normalized)) {
            dbg('skip asset', normalized)
            return { allowed: false, reason: 'asset_url' }
        }

        if (seen.has(normalized)) {
            dbg('reject seen', normalized)
            return { allowed: false, reason: 'already_seen' }
        }

        if (!urlAllowedByFilters(normalized, startHost, opts.sameDomainOnly, inc, exc)) {
            dbg('reject filters/domain', normalized)
            return { allowed: false, reason: 'filtered' }
        }

        if (robots && !robots.isAllowed(normalized, '*')) {
            dbg('reject robots', normalized)
            return { allowed: false, reason: 'robots_txt' }
        }

        dbg('accept', normalized)
        return { allowed: true }
    }

    const addUrl = async (url: string, userData: UserData) => {
        if (pages.length >= maxPages) return
        
        const normalized = normalizeUrl(url)
        const result = shouldProcessUrl(normalized)
        dbg('addUrl', { url: normalized, ...result, userData })
        
        if (!result.allowed) {
            // If it's an asset URL, just log and return - don't add to queue
            if (result.reason === 'asset_url') {
                dbg('Skipping asset URL at queue level:', normalized)
            }
            return
        }
        
        seen.add(normalized)
        await rq.addRequest({ 
            url: normalized, 
            userData
        })
    }

    // ✅ Always enqueue seed (even if includeRegex would otherwise block it)
    const normalizedSeed = normalizeUrl(startUrl)
    dbg('seed enqueue', normalizedSeed)
    seen.add(normalizedSeed)
    await rq.addRequest({ url: normalizedSeed, userData: { depth: 0, sourceType: 'seed' } })

    // Sitemap discovery - process in parallel
    if (opts.crawlMode === 'sitemap' || opts.crawlMode === 'both') {
        const sitemapCandidates = await discoverSitemapUrls(startUrl)
        
        const sitemapResults = await Promise.allSettled(
            sitemapCandidates.map(async (sm) => {
                try {
                    const urls = await processSitemap(sm, opts.timeoutMs)
                    for (const url of urls) {
                        if (pages.length >= maxPages) break
                        await addUrl(url, { depth: 0, sourceType: 'sitemap' })
                    }
                } catch {
                    // ignore sitemap failures
                }
            })
        )
        
        // Log any failures
        sitemapResults.forEach((result, idx) => {
            if (result.status === 'rejected') {
                dbg('Sitemap processing failed for', sitemapCandidates[idx])
            }
        })
    }

    // Add queue monitoring
    let processedCount = 0
    let lastLogTime = 0
    const QUEUE_LOG_INTERVAL = 5000
    
    const logInterval = setInterval(async () => {
        const now = Date.now()
        if (now - lastLogTime > QUEUE_LOG_INTERVAL) {
            const info = await rq.getInfo()
            dbg('Queue stats:', {
                total: info?.totalRequestCount || 0,
                pending: info?.pendingRequestCount || 0,
                handled: info?.handledRequestCount || 0,
                pagesCollected: pages.length,
                maxPages: maxPages
            })
            lastLogTime = now
        }
    }, 1000)

    const recordPage = async (url: string, title: string | undefined, rawText: string, userData: UserData) => {
        if (pages.length >= maxPages) return
        
        processedCount++
        const cleaned = (rawText || '').replace(/\n{3,}/g, '\n\n').trim()
        if (!cleaned) return
        const blocks = toBlocks(cleaned, Math.max(1, opts.minBlockChars))
        if (blocks.length === 0) return

        const fetchedAt = new Date().toISOString()
        const pageResult: PageResult = {
            url,
            title: title || undefined,
            depth: userData.depth,
            sourceType: userData.sourceType,
            fetchedAt,
            blocks
        }
        
        pages.push(pageResult)

        const unique = new Set(blocks)
        for (const b of unique) blockFreq.set(b, (blockFreq.get(b) ?? 0) + 1)
        
        // Early exit if we've reached max pages
        if (pages.length >= maxPages) {
            dbg('Reached max pages limit', maxPages)
        }
    }

    const maybeEnqueueLinks = async (enqueueLinks: any, depth: number) => {
        if (opts.crawlMode === 'sitemap') return
        if (depth >= opts.maxDepth) return
        if (pages.length >= maxPages) return

        await enqueueLinks({
            globs: ['http://**/*', 'https://**/*'],
            transformRequestFunction: (req: any) => {
                if (pages.length >= maxPages) return null
                
                try {
                    const next = normalizeUrl(req.url)

                    // Skip assets immediately at the queue level - more aggressively
                    if (isAssetUrl(next)) {
                        dbg('Filtered asset at transform level:', next)
                        // Don't add to queue at all
                        return null
                    }

                    if (!urlAllowedByFilters(next, startHost, opts.sameDomainOnly, inc, exc)) return null
                    if (robots && !robots.isAllowed(next, '*')) return null
                    if (seen.has(next)) return null

                    seen.add(next)
                    req.userData = { depth: depth + 1, sourceType: 'crawl' }
                    return req
                } catch {
                    return null
                }
            }
        })
    }

    // Remove the ErrorHandlerContext type and fix the crawler configurations
    // by using inline error handlers with proper typing

    const crawler = opts.renderJs
    ? new PuppeteerCrawler({
          requestQueue: rq,
          maxRequestsPerCrawl,
          maxConcurrency: Math.max(1, Math.min(opts.concurrency, 10)),
          requestHandlerTimeoutSecs: Math.ceil(opts.timeoutMs / 1000),
          maxRequestRetries: 0, // Already 0, good
          navigationTimeoutSecs: Math.ceil(opts.timeoutMs / 2000),
          useSessionPool: false,
          persistCookiesPerSession: false,
          autoscaledPoolOptions: {
              maxTasksPerMinute: opts.delayMs > 0 ? Math.floor(60000 / opts.delayMs) : 1000,
              desiredConcurrency: Math.max(1, opts.concurrency),
          },
          // Better error handling approach
          errorHandler: (context: any) => {
              const { request, error } = context
              if (error?.message?.includes('SKIP_ASSET_URL')) {
                  // Mark the request as handled to prevent retries and logging
                  request.noRetry = true
                  request.handledAt = new Date()
                  dbg('Asset URL silently skipped:', request.url)
                  return
              }
              dbg('Crawler error:', error?.message, request?.url)
          },
          async requestHandler({ request, page, enqueueLinks }: any) {
              if (pages.length >= maxPages) return
              if (opts.delayMs > 0) await new Promise((r) => setTimeout(r, opts.delayMs))

              const userData = (request.userData || { depth: 0, sourceType: 'crawl' }) as UserData

              try {
                  await page.goto(request.url, { 
                      waitUntil: 'domcontentloaded', 
                      timeout: opts.timeoutMs 
                  })
              } catch {
                  // ignore navigation errors
              }

              try {
                  await page.evaluate((selectors: string[]) => {
                      for (const s of selectors) {
                          try {
                              document.querySelectorAll(s).forEach((e) => e.remove())
                          } catch {
                              // ignore invalid selector
                          }
                      }
                  }, stripSel)
              } catch {
                  // ignore
              }

              const title = (await page.title().catch(() => '')) || ''
              const html = (await page.content().catch(() => '')) || ''
              const extracted = extractReadableTextFromHtml(html, request.url, stripSel)

              await recordPage(request.url, extracted.title || title, extracted.text, userData)
              await maybeEnqueueLinks(enqueueLinks, userData.depth)
          },
          // Use a more refined preNavigationHooks approach
          preNavigationHooks: [
              async (context: any) => {
                  const { request } = context
                  // Check if this request should be processed
                  if (isAssetUrl(request.url)) {
                      // Set request properties to prevent logging
                      request.skipNavigation = true
                      request.noRetry = true
                      request.userData = { ...request.userData, wasSkipped: true }
                      // Throw a special error that we'll catch in errorHandler
                      throw new Error('SKIP_ASSET_URL')
                  }
              }
          ]
      })
    : new CheerioCrawler({
        requestQueue: rq,
        maxRequestsPerCrawl,
        maxConcurrency: Math.max(1, Math.min(opts.concurrency, 10)),
        requestHandlerTimeoutSecs: Math.ceil(opts.timeoutMs / 1000),

        maxRequestRetries: 0,
        navigationTimeoutSecs: Math.ceil(opts.timeoutMs / 1000),

        useSessionPool: false,
        persistCookiesPerSession: false,

        autoscaledPoolOptions: {
            maxTasksPerMinute: opts.delayMs > 0 ? Math.floor(60000 / opts.delayMs) : 1000,
            desiredConcurrency: Math.max(1, opts.concurrency)
        },

        failedRequestHandler: async ({ request, error }: any) => {
            const msg = String(error?.message || '')
            if (msg.includes('SKIP_ASSET_URL')) return
            dbg('Failed request:', request?.url, msg)
        },

        async requestHandler({ request, $, enqueueLinks }: any) {
            if (pages.length >= maxPages) return
            if (opts.delayMs > 0) await new Promise((r) => setTimeout(r, opts.delayMs))

            // ✅ Prevent "$ is not a function"
            if (typeof $ !== 'function') {
                dbg('SKIP (no cheerio $)', request.url)
                return
            }

            const userData = (request.userData || { depth: 0, sourceType: 'crawl' }) as UserData
            const title = $('title')?.text()?.trim() || ''

            try {
                $(stripSel.join(',')).remove()
            } catch {
                for (const sel of stripSel) {
                    try {
                        $(sel).remove()
                    } catch {
                        // ignore invalid selector
                    }
                }
            }

            const text = $('body')?.text()?.replace(/\n{3,}/g, '\n\n').trim() || ''
            await recordPage(request.url, title, text, userData)
            await maybeEnqueueLinks(enqueueLinks, userData.depth)
        }
    })

    try {
        await crawler.run()
    } finally {
        clearInterval(logInterval)
    }

    // Remove blocks that appear on many pages
    let commonBlocks = new Set<string>()
    if (opts.dedupeCommonBlocks && pages.length > 1) {
        const pct = Math.min(1, Math.max(0, opts.commonBlockThreshold ?? 0.5))
        const thresholdCount = Math.ceil(pages.length * pct)
        for (const [block, count] of blockFreq.entries()) {
            if (count >= thresholdCount) commonBlocks.add(block)
        }
        
        dbg('Deduplication stats:', {
            totalBlocks: blockFreq.size,
            commonBlocks: commonBlocks.size,
            threshold: thresholdCount
        })
    }

    const docs: Document[] = pages
        .map((p) => {
            const filtered = opts.dedupeCommonBlocks 
                ? p.blocks.filter((b) => !commonBlocks.has(b))
                : p.blocks
            const content = filtered.join('\n\n').trim()
            if (!content) return null

            return new Document({
                pageContent: content,
                metadata: {
                    url: p.url,
                    title: p.title,
                    depth: p.depth,
                    sourceType: p.sourceType,
                    fetchedAt: p.fetchedAt,
                    orgId,
                    blockCount: filtered.length,
                    originalBlockCount: p.blocks.length
                }
            })
        })
        .filter(Boolean) as Document[]

    dbg('Crawl completed:', {
        pagesFound: pages.length,
        documentsGenerated: docs.length,
        uniqueUrls: seen.size
    })

    return docs
}