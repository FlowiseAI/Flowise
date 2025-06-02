import { StatusCodes } from 'http-status-codes'
import { v4 as uuidV4 } from 'uuid'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { IUser, AppCsvParseRunsStatus } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { AppCsvParseRuns } from '../../database/entities/AppCsvParseRuns'
import { getS3Config } from 'flowise-components'

const slugify = (text?: string) =>
    text
        ?.toLowerCase()
        ?.replace(/ /g, '-')
        ?.replace(/[^\w-]+/g, '')

const getUniqueDocumentPath = ({ organizationId, title }: { organizationId: string; title: string }) =>
    `${organizationId}/${slugify(title)}-${uuidV4()}`

const getAllCsvParseRuns = async (user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const csvParseRuns = await appServer.AppDataSource.getRepository(AppCsvParseRuns).find({
            where: {
                userId: user.id,
                organizationId: user.organizationId
            },
            order: {
                startedAt: 'DESC'
            }
        })
        return JSON.parse(JSON.stringify(csvParseRuns))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.getAllCsvParseRuns - ${getErrorMessage(error)}`
        )
    }
}

const getCsvParseRunById = async (csvParseRunId: string, user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns).findOne({
            where: {
                id: csvParseRunId,
                userId: user.id,
                organizationId: user.organizationId
            }
        })

        if (!csvParseRun) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `CsvParseRun ${csvParseRunId} not found`)
        }

        return JSON.parse(JSON.stringify(csvParseRun))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.getCsvParseRunById - ${getErrorMessage(error)}`
        )
    }
}

const createCsvParseRun = async (user: IUser, body: any) => {
    try {
        const appServer = getRunningExpressApp()

        const { name, configuration, chatflowChatId, rowsRequested, file, includeOriginalColumns, csvParseRunId } = body

        let originalCsvUrl

        if (file) {
            const uniqueDocumentPath = getUniqueDocumentPath({ organizationId: user.organizationId, title: name })
            const key = `csv-parse-runs/${uniqueDocumentPath}.csv`
            // Convert data URL to Buffer
            const base64Data = file.replace(/^data:text\/csv;base64,/, '')
            const fileBuffer = Buffer.from(base64Data, 'base64')

            // Upload file to S3
            const s3 = new S3Client({
                region: process.env.S3_STORAGE_REGION ?? '',
                credentials: {
                    accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID ?? '',
                    secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY ?? ''
                }
            })
            await s3.send(
                new PutObjectCommand({
                    Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                    Key: key,
                    Body: fileBuffer,
                    ContentType: 'text/csv'
                })
            )
            originalCsvUrl = `s3://${process.env.S3_STORAGE_BUCKET_NAME}/${key}`
        } else if (csvParseRunId) {
            const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns).findOne({
                where: {
                    id: csvParseRunId,
                    userId: user.id,
                    organizationId: user.organizationId
                }
            })

            if (!csvParseRun) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `CsvParseRun ${csvParseRunId} not found`)
            }
            originalCsvUrl = csvParseRun?.originalCsvUrl
        } else {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Error: csvParserService.createCsvParseRun - No file or csvParseRunId provided`
            )
        }

        const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .insert()
            .values({
                userId: user.id,
                organizationId: user.organizationId,
                name,
                configuration,
                originalCsvUrl,
                chatflowChatId,
                rowsRequested,
                includeOriginalColumns,
                startedAt: new Date(),
                status: AppCsvParseRunsStatus.PENDING,
                errorMessages: []
            })
            .execute()
        return JSON.parse(JSON.stringify(csvParseRun))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.createCsvParseRun - ${getErrorMessage(error)}`
        )
    }
}

const getProcessedCsvSignedUrl = async (csvParseRunId: string, user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns).findOne({
            where: {
                id: csvParseRunId,
                userId: user.id,
                organizationId: user.organizationId
            }
        })

        if (!csvParseRun) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `CsvParseRun ${csvParseRunId} not found`)
        }

        const { s3Client, Bucket } = getS3Config()

        const getCmd = new GetObjectCommand({
            Bucket,
            Key: csvParseRun.processedCsvUrl
        })
        const signedUrl = await getSignedUrl(s3Client, getCmd, {
            expiresIn: 60 * 60 * 24 // 1 day
        })
        return signedUrl
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.getProcessedCsvSignedUrl - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllCsvParseRuns,
    getCsvParseRunById,
    createCsvParseRun,
    getProcessedCsvSignedUrl
}
