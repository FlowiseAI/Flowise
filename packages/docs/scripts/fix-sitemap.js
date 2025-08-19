#!/usr/bin/env node

/**
 * Script to fix sitemap.xml encoding issues that may occur during deployment
 * Removes any extraneous characters and ensures proper XML formatting
 */

const fs = require('fs')
const path = require('path')

const SITEMAP_PATH = path.join(__dirname, '..', 'build', 'sitemap.xml')

function fixSitemap() {
    console.log('🔧 Fixing sitemap.xml encoding issues...')

    try {
        // Check if sitemap exists
        if (!fs.existsSync(SITEMAP_PATH)) {
            console.log('⚠️  sitemap.xml not found at:', SITEMAP_PATH)
            return
        }

        // Read the sitemap content
        let content = fs.readFileSync(SITEMAP_PATH, 'utf8')

        // Remove any trailing non-XML characters (like %)
        // Ensure the file ends properly with </urlset>
        const urlsetCloseTag = '</urlset>'
        const urlsetIndex = content.lastIndexOf(urlsetCloseTag)

        if (urlsetIndex !== -1) {
            // Keep everything up to and including the closing </urlset> tag
            const cleanContent = content.substring(0, urlsetIndex + urlsetCloseTag.length)

            // Only write if content changed
            if (cleanContent !== content) {
                fs.writeFileSync(SITEMAP_PATH, cleanContent, 'utf8')
                console.log('✅ Fixed sitemap.xml - removed extraneous characters')
                console.log(`📊 Original size: ${content.length} bytes`)
                console.log(`📊 Cleaned size: ${cleanContent.length} bytes`)
            } else {
                console.log('✅ sitemap.xml is already properly formatted')
            }
        } else {
            console.error('❌ Could not find closing </urlset> tag in sitemap.xml')
            process.exit(1)
        }
    } catch (error) {
        console.error('❌ Error fixing sitemap.xml:', error.message)
        process.exit(1)
    }
}

// Run the fix
fixSitemap()
