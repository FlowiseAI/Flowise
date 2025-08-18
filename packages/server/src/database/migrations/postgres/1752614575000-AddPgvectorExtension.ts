import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPgvectorExtension1752614575000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // Check if pgvector extension is available on the server
            const availableExtensions = await queryRunner.query(`
                SELECT name, default_version 
                FROM pg_available_extensions 
                WHERE name = 'vector';
            `)

            if (availableExtensions.length === 0) {
                console.warn('⚠️  pgvector extension is not available on this PostgreSQL server.')
                console.warn('📋 To install pgvector:')
                console.warn('   1. Install pgvector on your PostgreSQL server')
                console.warn('   2. Run the install_pgvector_extension.js script from the project root')
                console.warn('   3. Or manually run: CREATE EXTENSION IF NOT EXISTS vector;')
                console.warn('🔧 For installation instructions, see: https://github.com/pgvector/pgvector#installation')
                return
            }

            // Check if extension is already installed
            const installedExtensions = await queryRunner.query(`
                SELECT extname, extversion 
                FROM pg_extension 
                WHERE extname = 'vector';
            `)

            if (installedExtensions.length > 0) {
                console.log(`✅ pgvector extension already installed (version: ${installedExtensions[0].extversion})`)
                return
            }

            // Install pgvector extension if it doesn't exist
            console.log('📦 Installing pgvector extension...')
            await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector;')

            // Verify extension was created successfully
            const result = await queryRunner.query(`
                SELECT extname, extversion 
                FROM pg_extension 
                WHERE extname = 'vector';
            `)

            if (result.length === 0) {
                console.warn('⚠️  pgvector extension installation failed. Check your database permissions.')
                console.warn('💡 You may need superuser privileges to install extensions.')
            } else {
                console.log(`✅ pgvector extension installed successfully (version: ${result[0].extversion})`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.warn('⚠️  Failed to install pgvector extension:', errorMessage)
            console.warn('📋 Manual installation required:')
            console.warn('   1. Ensure pgvector is installed on your PostgreSQL server')
            console.warn('   2. Connect as a superuser and run: CREATE EXTENSION IF NOT EXISTS vector;')
            console.warn('   3. Or use: node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js')
            console.warn('   3. Or use the install_pgvector_extension.js script')

            // Don't throw the error - let the migration continue
            // The AAI Vector node will handle the missing extension gracefully
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: We don't drop the extension in down() because:
        // 1. It might be used by existing vector tables
        // 2. Other applications might depend on it
        // 3. Extensions are typically kept during rollbacks
        console.log('ℹ️  pgvector extension not removed during migration rollback (intentional)')
    }
}
