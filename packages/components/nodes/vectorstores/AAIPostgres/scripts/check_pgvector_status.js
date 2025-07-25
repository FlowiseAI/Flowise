#!/usr/bin/env node

// Script to check pgvector extension status in your AAI database
// This script only checks status and doesn't make any changes

require('dotenv').config()
const { Pool } = require('pg')

async function checkPgvectorStatus() {
    // Get connection parameters from environment variables (same as AAI node)
    const user =
        process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_USER ||
        process.env.POSTGRES_VECTORSTORE_USER ||
        process.env.POSTGRES_USER ||
        'postgres'

    const password =
        process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_PASSWORD ||
        process.env.POSTGRES_VECTORSTORE_PASSWORD ||
        process.env.POSTGRES_PASSWORD ||
        'postgres'

    const host =
        process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_HOST ||
        process.env.POSTGRES_VECTORSTORE_HOST ||
        process.env.POSTGRES_HOST ||
        'localhost'

    const database =
        process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_DATABASE ||
        process.env.POSTGRES_VECTORSTORE_DATABASE ||
        process.env.POSTGRES_DB ||
        process.env.POSTGRES_DATABASE ||
        'postgres'

    const port =
        process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_PORT || process.env.POSTGRES_VECTORSTORE_PORT || process.env.POSTGRES_PORT || '5432'

    const tableName = process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_TABLE_NAME || process.env.POSTGRES_VECTORSTORE_TABLE_NAME || 'documents'

    console.log('🔍 Checking pgvector extension status...')
    console.log('📍 Connection details:')
    console.log(`   Host: ${host}`)
    console.log(`   Database: ${database}`)
    console.log(`   User: ${user}`)
    console.log(`   Port: ${port}`)
    console.log(`   Table: ${tableName}`)
    console.log('')

    const pool = new Pool({
        user,
        password,
        host,
        database,
        port: parseInt(port),
        ssl: false // Adjust if needed
    })

    try {
        const client = await pool.connect()

        // 1. Test basic connection
        console.log('📋 Testing database connection...')
        const versionQuery = await client.query('SELECT version();')
        console.log(`✅ Connected to PostgreSQL`)
        console.log(`   Version: ${versionQuery.rows[0].version.split(' ')[1]}`)
        console.log('')

        // 2. Check available extensions
        console.log('📋 Checking available extensions...')
        const availableCheck = await client.query(`
            SELECT name, default_version, comment
            FROM pg_available_extensions 
            WHERE name = 'vector';
        `)

        if (availableCheck.rows.length === 0) {
            console.log('❌ pgvector extension is NOT available on this server')
            console.log('📋 Server-level installation required:')
            console.log('   macOS: brew install pgvector')
            console.log('   Ubuntu/Debian: sudo apt install postgresql-15-pgvector')
            console.log('   Docker: Use pgvector/pgvector:pg15 image')
            console.log('   Manual: https://github.com/pgvector/pgvector#installation')
        } else {
            console.log('✅ pgvector extension is available')
            console.log(`   Version: ${availableCheck.rows[0].default_version}`)
            console.log(`   Description: ${availableCheck.rows[0].comment}`)
        }
        console.log('')

        // 3. Check installed extensions
        console.log('📋 Checking installed extensions...')
        const installedCheck = await client.query(`
            SELECT extname, extversion, extrelocatable
            FROM pg_extension 
            WHERE extname = 'vector';
        `)

        if (installedCheck.rows.length === 0) {
            console.log('❌ pgvector extension is NOT installed in this database')
            if (availableCheck.rows.length > 0) {
                console.log('💡 Extension is available but needs to be enabled')
                console.log('   Run: CREATE EXTENSION IF NOT EXISTS vector;')
                console.log('   Or use: node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js')
            }
        } else {
            console.log('✅ pgvector extension is installed')
            console.log(`   Version: ${installedCheck.rows[0].extversion}`)
            console.log(`   Relocatable: ${installedCheck.rows[0].extrelocatable}`)
        }
        console.log('')

        // 4. Check table existence
        console.log(`📋 Checking vector table '${tableName}'...`)
        const tableCheck = await client.query(
            `
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_name = $1 AND table_schema = 'public';
        `,
            [tableName]
        )

        if (tableCheck.rows.length === 0) {
            console.log(`ℹ️  Table '${tableName}' does not exist yet`)
            console.log('💡 Table will be created automatically when you first upsert documents')
        } else {
            console.log(`✅ Table '${tableName}' exists`)

            // Check table structure
            const columnsCheck = await client.query(
                `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position;
            `,
                [tableName]
            )

            console.log('📊 Table structure:')
            columnsCheck.rows.forEach((row) => {
                const nullable = row.is_nullable === 'YES' ? 'nullable' : 'not null'
                const defaultVal = row.column_default ? ` (default: ${row.column_default})` : ''
                console.log(`   ${row.column_name}: ${row.data_type} (${nullable})${defaultVal}`)
            })

            // Check for vector columns
            const vectorColumns = columnsCheck.rows.filter((row) => row.data_type === 'USER-DEFINED')
            if (vectorColumns.length > 0) {
                console.log('🎯 Vector columns found:')
                vectorColumns.forEach((col) => {
                    console.log(`   ${col.column_name}: vector type`)
                })
            }
        }
        console.log('')

        // 5. Test vector functionality (only if extension is installed)
        if (installedCheck.rows.length > 0) {
            console.log('🧪 Testing vector functionality...')
            try {
                // Test basic vector operations
                const vectorTest = await client.query(`
                    SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance;
                `)
                console.log('✅ Vector operations work correctly')
                console.log(`   Test distance calculation: ${vectorTest.rows[0].distance}`)
            } catch (testError) {
                console.log('❌ Vector operations failed:', testError.message)
            }
        }

        client.release()

        // 6. Summary
        console.log('')
        console.log('📊 Summary:')
        console.log(`   Database Connection: ✅ Working`)
        console.log(`   pgvector Available: ${availableCheck.rows.length > 0 ? '✅ Yes' : '❌ No'}`)
        console.log(`   pgvector Installed: ${installedCheck.rows.length > 0 ? '✅ Yes' : '❌ No'}`)
        console.log(`   Vector Table: ${tableCheck.rows.length > 0 ? '✅ Exists' : 'ℹ️  Not created yet'}`)

        if (availableCheck.rows.length > 0 && installedCheck.rows.length > 0) {
            console.log('')
            console.log('🎉 pgvector is ready to use!')
            console.log('💡 Your AAI Vector (Postgres) node should work correctly.')
        } else if (availableCheck.rows.length > 0 && installedCheck.rows.length === 0) {
            console.log('')
            console.log('🔧 pgvector is available but not enabled.')
            console.log('💡 Run: node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js')
        } else {
            console.log('')
            console.log('❌ pgvector needs to be installed on your PostgreSQL server.')
            console.log('📋 See PGVECTOR_SETUP.md for installation instructions.')
        }
    } catch (error) {
        console.error('❌ Error:', error.message)
        console.error('')
        console.error('🔧 Troubleshooting:')
        console.error('1. Check your environment variables are set correctly')
        console.error('2. Ensure PostgreSQL is running and accessible')
        console.error('3. Verify database credentials and permissions')

        if (error.code === 'ECONNREFUSED') {
            console.error('4. PostgreSQL server is not running or not accessible')
        } else if (error.message.includes('authentication failed')) {
            console.error('4. Check your database username and password')
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
            console.error('4. The specified database does not exist')
        }
    } finally {
        await pool.end()
    }
}

// Run the script
checkPgvectorStatus().catch(console.error)
