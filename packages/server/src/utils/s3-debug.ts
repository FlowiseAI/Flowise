/**
 * S3 Configuration Debug Helper
 * This module provides detailed logging for S3 storage configuration
 * to help diagnose startup issues.
 */

import logger from './logger'

export function debugS3Configuration(): void {
    const storageType = process.env.STORAGE_TYPE
    const bucketName = process.env.S3_STORAGE_BUCKET_NAME
    const region = process.env.S3_STORAGE_REGION
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const endpointUrl = process.env.S3_ENDPOINT_URL
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE

    logger.info('=== S3 Storage Configuration Debug ===')
    logger.info(`STORAGE_TYPE: ${storageType || 'NOT SET (defaults to local)'}`)

    if (storageType === 's3') {
        logger.info('S3 Storage is enabled, checking configuration...')

        // Critical configuration
        if (!bucketName) {
            logger.error('❌ S3_STORAGE_BUCKET_NAME is NOT SET - This is REQUIRED for S3 storage!')
            logger.error('   The application will fail to start without a bucket name.')
        } else {
            logger.info(`✅ S3_STORAGE_BUCKET_NAME: ${bucketName}`)
        }

        // Region configuration
        if (!region) {
            logger.info(`ℹ️  S3_STORAGE_REGION: NOT SET (will default to 'us-east-1')`)
        } else {
            logger.info(`✅ S3_STORAGE_REGION: ${region}`)
        }

        // Authentication configuration
        if (accessKeyId && secretAccessKey) {
            logger.info('✅ S3 Credentials: Using explicit AWS credentials (Access Key ID and Secret Access Key)')
            logger.info(`   Access Key ID: ${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}`)
        } else if (!accessKeyId && !secretAccessKey) {
            logger.info('ℹ️  S3 Credentials: Using IAM role or instance profile (no explicit credentials set)')
            logger.info('   This is the recommended approach for ECS/EC2 deployments')
        } else if (accessKeyId && !secretAccessKey) {
            logger.error('⚠️  S3_STORAGE_ACCESS_KEY_ID is set but S3_STORAGE_SECRET_ACCESS_KEY is missing!')
            logger.error('   Both must be set together or neither should be set (to use IAM roles)')
        } else if (!accessKeyId && secretAccessKey) {
            logger.error('⚠️  S3_STORAGE_SECRET_ACCESS_KEY is set but S3_STORAGE_ACCESS_KEY_ID is missing!')
            logger.error('   Both must be set together or neither should be set (to use IAM roles)')
        }

        // Optional configuration
        if (endpointUrl) {
            logger.info(`ℹ️  S3_ENDPOINT_URL: ${endpointUrl} (custom S3-compatible endpoint)`)
            if (forcePathStyle === 'true') {
                logger.info('   S3_FORCE_PATH_STYLE: true (using path-style URLs)')
            }
        }

        // Summary
        logger.info('=== S3 Configuration Summary ===')
        const issues = []

        if (!bucketName) {
            issues.push('Missing S3_STORAGE_BUCKET_NAME (CRITICAL)')
        }

        if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
            issues.push('Incomplete credential configuration')
        }

        if (issues.length > 0) {
            logger.error(`❌ Found ${issues.length} configuration issue(s):`)
            issues.forEach((issue, index) => {
                logger.error(`   ${index + 1}. ${issue}`)
            })
            logger.error('The application may fail to start or function properly.')
        } else {
            logger.info('✅ S3 configuration appears valid')
            logger.info(`   Bucket: ${bucketName}`)
            logger.info(`   Region: ${region || 'us-east-1 (default)'}`)
            logger.info(`   Auth: ${accessKeyId ? 'Explicit credentials' : 'IAM role/instance profile'}`)
        }
    } else if (storageType === 'local') {
        logger.info('Local storage is configured')
    } else if (storageType === 'gcs') {
        logger.info('Google Cloud Storage is configured')
    } else if (!storageType) {
        logger.info('No storage type specified, defaulting to local storage')
    } else {
        logger.warn(`Unknown storage type: ${storageType}`)
    }

    logger.info('=== End S3 Configuration Debug ===')
}

// Export a function to check if S3 is properly configured
export function isS3ConfigValid(): boolean {
    const storageType = process.env.STORAGE_TYPE

    if (storageType !== 's3') {
        return true // Not using S3, so config is valid
    }

    const bucketName = process.env.S3_STORAGE_BUCKET_NAME
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY

    // Must have bucket name
    if (!bucketName) {
        return false
    }

    // Credentials must be both set or both unset
    if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
        return false
    }

    return true
}
