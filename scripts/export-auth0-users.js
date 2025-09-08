#!/usr/bin/env node

/**
 * Auth0 Organization Users Export Script
 *
 * This script exports users from an Auth0 organization along with their roles to a CSV file.
 * It uses the Auth0 Management API v2 and handles pagination for large organizations.
 *
 * Prerequisites:
 * 1. Create a Machine to Machine application in Auth0 Dashboard
 * 2. Grant the following scopes to your M2M application:
 *    - read:organizations
 *    - read:organization_members
 *    - read:organization_member_roles
 *    - read:users (optional, for additional user details)
 *
 * Environment Variables Required:
 * - AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL (your Auth0 domain, e.g., your-tenant.auth0.com)
 * - AUTH0_CLIENT_ID (Machine to Machine Application Client ID)
 * - AUTH0_CLIENT_SECRET (Machine to Machine Application Client Secret)
 * - AUTH0_ORGANIZATION_ID (Target organization ID - can be comma-separated for multiple orgs)
 *
 * Usage:
 *   node scripts/export-auth0-users.js [options]
 *
 * Options:
 *   --org <org_id>     Specific organization ID (overrides env var)
 *   --output <file>    Output CSV file path (default: auth0-users-export.csv)
 *   --verbose          Enable verbose logging
 *   --help             Show this help message
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
    verbose: args.includes('--verbose'),
    help: args.includes('--help'),
    estimateOnly: args.includes('--estimate-tokens'),
    maxUsers: null,
    output: 'auth0-users-export.csv',
    organizationId: null
}

// Parse options
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        options.output = args[i + 1]
        i++
    } else if (args[i] === '--org' && args[i + 1]) {
        options.organizationId = args[i + 1]
        i++
    } else if (args[i] === '--max-users' && args[i + 1]) {
        options.maxUsers = parseInt(args[i + 1], 10)
        i++
    }
}

// Show help if requested
if (options.help) {
    console.log(`
Auth0 Organization Users Export Script

This script exports users from an Auth0 organization along with their roles to a CSV file.

Usage:
  node scripts/export-auth0-users.js [options]

Options:
  --org <org_id>       Specific organization ID (overrides AUTH0_ORGANIZATION_ID env var)
  --output <file>      Output CSV file path (default: auth0-users-export.csv)
  --max-users <num>    Limit export to N users (for token conservation)
  --estimate-tokens    Show estimated token usage without running export
  --verbose            Enable verbose logging
  --help               Show this help message

Environment Variables Required:
  AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL  Your Auth0 domain (e.g., your-tenant.auth0.com)
  AUTH0_CLIENT_ID                        Machine to Machine Application Client ID
  AUTH0_CLIENT_SECRET                    Machine to Machine Application Client Secret
  AUTH0_ORGANIZATION_ID                  Target organization ID(s) - comma-separated

Prerequisites:
1. Create a Machine to Machine application in Auth0 Dashboard
2. Grant the following scopes to your M2M application:
   - read:organizations
   - read:organization_members
   - read:organization_member_roles
   - read:users (optional, for additional user details)

Example:
  node scripts/export-auth0-users.js --output my-org-users.csv --verbose
`)
    process.exit(0)
}

// Load environment variables - check for secure-run wrapper
const loadEnv = () => {
    try {
        // Try to load .env if available (for local development)
        require('dotenv').config()
    } catch (error) {
        // dotenv might not be available, which is fine for production
    }
}

loadEnv()

// Configuration
const AUTH0_DOMAIN =
    process.env.AUTH0_DOMAIN ||
    (process.env.AUTH0_ISSUER_BASE_URL ? process.env.AUTH0_ISSUER_BASE_URL.replace('https://', '').replace('http://', '') : null)
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET
const AUTH0_ORGANIZATION_ID = options.organizationId || process.env.AUTH0_ORGANIZATION_ID

// Validation
const validateConfig = () => {
    const missing = []

    if (!AUTH0_DOMAIN) missing.push('AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL')
    if (!AUTH0_CLIENT_ID) missing.push('AUTH0_CLIENT_ID')
    if (!AUTH0_CLIENT_SECRET) missing.push('AUTH0_CLIENT_SECRET')
    if (!AUTH0_ORGANIZATION_ID) missing.push('AUTH0_ORGANIZATION_ID or --org parameter')

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables or parameters:')
        missing.forEach((env) => console.error(`   - ${env}`))
        console.error('\nRun with --help for more information.')
        process.exit(1)
    }

    if (options.verbose) {
        console.log('✅ Configuration validated')
        console.log(`   Domain: ${AUTH0_DOMAIN}`)
        console.log(`   Client ID: ${AUTH0_CLIENT_ID.substring(0, 8)}...`)
        console.log(`   Organization(s): ${AUTH0_ORGANIZATION_ID}`)
        console.log(`   Output file: ${options.output}`)
    }
}

// Estimate token usage for the export
const estimateTokenUsage = async (accessToken) => {
    console.log('🔍 Estimating token usage...\n')

    const orgIds = AUTH0_ORGANIZATION_ID.split(',').map((id) => id.trim())
    let totalEstimatedTokens = 1 // Initial token for access token
    let totalUsers = 0

    for (const orgId of orgIds) {
        try {
            // Get member count (1 token)
            const response = await axios.get(`https://${AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    per_page: 1, // Minimal request to get total count
                    page: 0,
                    include_totals: true
                }
            })

            const memberCount = response.data.total || response.data.length
            totalUsers += memberCount

            // Calculate tokens needed for this org
            const pagesNeeded = Math.ceil(memberCount / 100) // 100 users per page max
            const tokensForOrg = pagesNeeded // 1 token per page (roles included in response)
            totalEstimatedTokens += tokensForOrg

            console.log(`📊 Organization ${orgId}:`)
            console.log(`   Users: ${memberCount}`)
            console.log(`   Pages needed: ${pagesNeeded}`)
            console.log(`   Estimated tokens: ${tokensForOrg}`)
        } catch (error) {
            console.error(`❌ Could not estimate for org ${orgId}: ${error.message}`)
        }
    }

    console.log(`\n📋 TOTAL ESTIMATION:`)
    console.log(`   Total users: ${totalUsers}`)
    console.log(`   Total estimated tokens: ${totalEstimatedTokens}`)
    console.log(`   Remaining from 1000: ${1000 - totalEstimatedTokens}`)

    if (totalEstimatedTokens > 1000) {
        console.log(`\n⚠️  WARNING: Estimated usage (${totalEstimatedTokens}) exceeds your 1000 token limit!`)
        console.log(`   Consider using --max-users to limit the export`)
        const maxSafeUsers = Math.floor((1000 - orgIds.length) * 100) // Conservative estimate
        console.log(`   Suggested: --max-users ${maxSafeUsers}`)
    } else {
        console.log(`\n✅ Export should fit within your token limit`)
    }

    return { totalEstimatedTokens, totalUsers }
}

// Get access token for Auth0 Management API
const getAccessToken = async () => {
    if (options.verbose) console.log('🔐 Requesting access token...')

    try {
        const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
            client_id: AUTH0_CLIENT_ID,
            client_secret: AUTH0_CLIENT_SECRET,
            audience: `https://${AUTH0_DOMAIN}/api/v2/`,
            grant_type: 'client_credentials'
        })

        if (options.verbose) console.log('✅ Access token obtained')
        return response.data.access_token
    } catch (error) {
        console.error('❌ Error obtaining access token:')
        if (error.response) {
            console.error(`   Status: ${error.response.status}`)
            console.error(`   Error: ${error.response.data.error || 'Unknown error'}`)
            console.error(`   Description: ${error.response.data.error_description || 'No description'}`)
        } else {
            console.error(`   ${error.message}`)
        }
        throw error
    }
}

// Fetch ALL organization members with roles in a single efficient call
const getOrganizationMembersWithRoles = async (accessToken, orgId, currentUserCount = 0) => {
    if (options.verbose) console.log(`👥 Fetching members with roles for organization: ${orgId}`)

    const members = []
    let page = 0
    const perPage = 100 // Maximum allowed by Auth0
    let hasMore = true

    // Calculate how many users we can still fetch if there's a limit
    const remainingUserLimit = options.maxUsers ? options.maxUsers - currentUserCount : null

    try {
        while (hasMore) {
            // Use the most efficient endpoint that includes roles directly
            const response = await axios.get(`https://${AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    per_page: perPage,
                    page: page,
                    include_totals: true,
                    // Request roles to be included in the response - MOST EFFICIENT!
                    fields: 'user_id,email,name,picture,created_at,updated_at,last_login,roles',
                    include_fields: true
                }
            })

            const data = response.data
            const currentMembers = data.members || data

            // If roles aren't included directly, we'll fetch them in batch
            const membersWithRoles = await Promise.all(
                currentMembers.map(async (member) => {
                    if (member.roles && member.roles.length > 0) {
                        // Roles already included - no additional API call needed!
                        return {
                            ...member,
                            roles: member.roles.map((role) => ({
                                id: role.id,
                                name: role.name,
                                description: role.description || ''
                            }))
                        }
                    } else {
                        // Fallback: fetch roles if not included (uses 1 token per user)
                        try {
                            const rolesResponse = await axios.get(
                                `https://${AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members/${member.user_id}/roles`,
                                {
                                    headers: { Authorization: `Bearer ${accessToken}` }
                                }
                            )
                            return {
                                ...member,
                                roles: rolesResponse.data.map((role) => ({
                                    id: role.id,
                                    name: role.name,
                                    description: role.description || ''
                                }))
                            }
                        } catch (error) {
                            if (options.verbose) {
                                console.warn(
                                    `⚠️  Could not fetch roles for user ${member.user_id}: ${
                                        error.response?.data?.message || error.message
                                    }`
                                )
                            }
                            return { ...member, roles: [] }
                        }
                    }
                })
            )

            members.push(...membersWithRoles)

            if (options.verbose) {
                console.log(`   📄 Page ${page + 1}: ${currentMembers.length} members`)
            }

            // Check if we have more pages or hit user limits
            if (data.total && members.length >= data.total) {
                hasMore = false
            } else if (!currentMembers || currentMembers.length < perPage) {
                hasMore = false
            } else if (remainingUserLimit && members.length >= remainingUserLimit) {
                hasMore = false
                if (options.verbose) {
                    console.log(`   🛑 Stopped at user limit: ${remainingUserLimit} users`)
                }
            } else {
                page++
            }
        }

        if (options.verbose) console.log(`✅ Total members with roles fetched: ${members.length}`)
        return members
    } catch (error) {
        console.error(`❌ Error fetching organization members for ${orgId}:`)
        if (error.response) {
            console.error(`   Status: ${error.response.status}`)
            console.error(`   Error: ${error.response.data.error || 'Unknown error'}`)
        } else {
            console.error(`   ${error.message}`)
        }
        throw error
    }
}

// Convert data to CSV format
const convertToCSV = (data) => {
    if (data.length === 0) {
        return 'No data to export'
    }

    // CSV headers
    const headers = [
        'organization_id',
        'user_id',
        'email',
        'name',
        'picture',
        'roles_count',
        'roles_names',
        'roles_descriptions',
        'created_at',
        'updated_at',
        'last_login'
    ]

    // Convert data to CSV rows
    const csvRows = [headers.join(',')]

    data.forEach((user) => {
        const row = [
            escapeCsvField(user.organization_id),
            escapeCsvField(user.user_id),
            escapeCsvField(user.email),
            escapeCsvField(user.name || ''),
            escapeCsvField(user.picture || ''),
            user.roles.length,
            escapeCsvField(user.roles.map((r) => r.name).join('; ')),
            escapeCsvField(user.roles.map((r) => r.description || '').join('; ')),
            escapeCsvField(user.created_at || ''),
            escapeCsvField(user.updated_at || ''),
            escapeCsvField(user.last_login || '')
        ]
        csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
}

// Escape CSV field (handle commas, quotes, newlines)
const escapeCsvField = (field) => {
    if (field == null) return ''
    const stringField = String(field)
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
    }
    return stringField
}

// Main execution function
const main = async () => {
    try {
        console.log('🚀 Starting Auth0 Users Export...\n')

        // Validate configuration
        validateConfig()

        // Get access token
        const accessToken = await getAccessToken()

        // If only estimating, do that and exit
        if (options.estimateOnly) {
            await estimateTokenUsage(accessToken)
            return
        }

        // Process each organization
        const orgIds = AUTH0_ORGANIZATION_ID.split(',').map((id) => id.trim())
        const allUsers = []

        for (const orgId of orgIds) {
            if (options.verbose) console.log(`\n📋 Processing organization: ${orgId}`)

            // Get organization members WITH roles in efficient batches
            const membersWithRoles = await getOrganizationMembersWithRoles(accessToken, orgId, allUsers.length)

            // Transform data for CSV export (with optional user limit)
            let usersToProcess = membersWithRoles
            if (options.maxUsers && allUsers.length + usersToProcess.length > options.maxUsers) {
                usersToProcess = usersToProcess.slice(0, options.maxUsers - allUsers.length)
                if (options.verbose) {
                    console.log(`⚠️  Limiting to ${options.maxUsers} users total as requested`)
                }
            }

            usersToProcess.forEach((member) => {
                allUsers.push({
                    organization_id: orgId,
                    user_id: member.user_id,
                    email: member.email,
                    name: member.name,
                    picture: member.picture,
                    created_at: member.created_at,
                    updated_at: member.updated_at,
                    last_login: member.last_login,
                    roles: member.roles || []
                })
            })

            // Stop processing if we've reached the user limit
            if (options.maxUsers && allUsers.length >= options.maxUsers) {
                if (options.verbose) {
                    console.log(`✅ Reached maximum user limit of ${options.maxUsers}`)
                }
                break
            }
        }

        // Convert to CSV
        if (options.verbose) console.log('\n📊 Converting to CSV format...')
        const csvContent = convertToCSV(allUsers)

        // Write to file
        const outputPath = path.resolve(options.output)
        fs.writeFileSync(outputPath, csvContent, 'utf8')

        // Success message
        console.log('\n✅ Export completed successfully!')
        console.log(`📁 File saved to: ${outputPath}`)
        console.log(`👥 Total users exported: ${allUsers.length}`)
        console.log(`🏢 Organizations processed: ${orgIds.length}`)

        // Summary by organization
        if (orgIds.length > 1) {
            console.log('\n📊 Summary by organization:')
            orgIds.forEach((orgId) => {
                const orgUsers = allUsers.filter((user) => user.organization_id === orgId)
                console.log(`   ${orgId}: ${orgUsers.length} users`)
            })
        }
    } catch (error) {
        console.error('\n❌ Export failed:', error.message)
        process.exit(1)
    }
}

// Run the script
if (require.main === module) {
    main()
}

module.exports = { main, getAccessToken, getOrganizationMembersWithRoles, convertToCSV }
