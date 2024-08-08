import { prisma } from '../../src/client'

const isDryRun = !process.argv.includes('--commit')

const convertFilter = (source: string, filterObj: any) => {
    return Object.entries(filterObj).reduce((acc, [filterKey, documents]) => {
        if (!Array.isArray(documents)) {
            acc[filterKey] = documents
        } else {
            switch (source) {
                case 'web':
                    if (filterKey === 'domain') {
                        acc[filterKey] = {
                            sources: documents.map((domain) => ({
                                label: domain,
                                filter: { domain }
                            }))
                        }
                    } else if (filterKey === 'url') {
                        acc[filterKey] = {
                            sources: documents.map((doc) => ({
                                documentId: doc.id,
                                label: doc.url,
                                filter: { url: doc.url }
                            }))
                        }
                    }
                    break
                case 'codebase':
                    acc[filterKey] = {
                        sources: documents.map((doc) => ({
                            label: doc.title || doc.repo,
                            filter: { repo: doc.title || doc.repo }
                        }))
                    }
                    break
                default:
                    if (filterKey === 'url') {
                        acc[filterKey] = {
                            sources: documents.map((doc) => ({
                                documentId: doc.id,
                                label: doc.title || doc.url,
                                filter: { url: doc.url }
                            }))
                        }
                    }
                    break
            }
        }
        return acc
    }, {} as any)
}

const convertDatasources = (filters: any) => {
    const datasources = Object.entries(filters.datasources || {}).reduce((acc, [source, sourceFilters]) => {
        const convertedFilter = convertFilter(source, sourceFilters)
        if (Object.keys(convertedFilter).length > 0) {
            acc[source as any] = convertedFilter
        }
        return acc
    }, {} as any)

    // console.log(
    //   'converted from\n',
    //   JSON.stringify(filters.datasources, null, 2),
    //   '\nti\n',
    //   JSON.stringify(datasources, null, 2)
    // );

    return {
        ...filters,
        datasources
    }
}

const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`
const red = (text: string) => `\x1b[31m${text}\x1b[0m`
const green = (text: string) => `\x1b[32m${text}\x1b[0m`

async function main() {
    const modelNames = ['chat', 'journey']
    let recordsCount = 0

    for (const modelName of modelNames) {
        const recordsWithFilters = await (prisma[modelName as any] as any).findMany({
            where: {
                filters: { not: null }
            }
        })

        for (const record of recordsWithFilters) {
            recordsCount++
            const updateFilters = convertDatasources(record.filters)
            console.log('\n')
            console.log(`Updating`)
            console.log(`model: ${yellow(modelName)}`)
            console.log(`record: ${yellow(record.id)}`)
            console.log(`field: ${yellow('filters')}`)
            console.log(red(JSON.stringify(record.filters, null, 2)))
            console.log(green(JSON.stringify(updateFilters, null, 2)))
            console.log('\n')
            if (isDryRun) continue
            await (prisma[modelName as any] as any).update({
                where: { id: record.id }, // Assuming the model has an 'id' field
                data: { filters: updateFilters } // Update the record with the modified filters
            })
        }
    }

    console.log(
        isDryRun
            ? `Dry run completed (${recordsCount} records). run with --commit flag to commit to the database`
            : 'Migration completed successfully!'
    )
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(`error during migration: ${e}`)
        await prisma.$disconnect()
        process.exit(1)
    })
