import Airtable from 'airtable'

import { inngest } from './client'

import chunkArray from '../utilities/chunkArray'

import type { EventVersionHandler } from './EventVersionHandler'
import type { AirtableRecord } from 'types'

const AIRTABLE_VIEW_ID = 'viw0CqPKmPU2HNfel'
const AIRTABLE_BASE_ID = 'tblTAWf8YYAqckiMH'

const PINECONE_VECTORS_BATCH_SIZE = 2
// TODO: Move this to a config file from the settings
const getNLPSummary = (record: AirtableRecord) => {
    const string = `${record.fields['Summary']} ${record.fields['Description']}
    reported by ${record.fields['Reporter']} and assigned to ${record.fields['Assignee']}
    QA/Quality Assurance by ${record.fields['QA Person'] || 'Unknown'}
    Linked to Issues: ${record.fields['Linked Issues'] || 'None'}
    Status: ${record.fields['Status']}
    `
    return string
}

const getAirtablePineconeObject = async (airtableRecords: AirtableRecord[]) => {
    const vectors = (
        await Promise.all(
            airtableRecords.map(async (record) => {
                if (!record) {
                    return []
                }

                const nlpSummary = getNLPSummary(record)

                return [
                    {
                        uid: `Airtable_${record.id}`,
                        text: nlpSummary,
                        metadata: {
                            source: 'airtable',
                            url: `https://lastrev.atlassian.net/browse/${record.fields['Issue Key']}`,
                            text: nlpSummary,
                            table: AIRTABLE_BASE_ID,
                            view: AIRTABLE_VIEW_ID,
                            summary: record.fields['Summary'],
                            description: record.fields['Description'],
                            reporter: record.fields['Reporter'],
                            assignee: record.fields['Assignee'],
                            qaPerson: record.fields['QA Person'] || 'Unknown',
                            linkedIssues: record.fields['Linked Issues'] || 'None',
                            status: record.fields['Status']
                        }
                    }
                ]

                return []
            })
        )
    )
        .flat()
        .filter(Boolean)

    return vectors
}

const embedVectors = async (event: any, vectors: any[]) => {
    let outVectors: void[] = []

    if (vectors?.length && vectors?.every((x: any) => !!x)) {
        outVectors = await Promise.all(
            chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map((batchVectors, i) => {
                return inngest.send({
                    v: '1',
                    ts: new Date().valueOf(),
                    name: 'pinecone/vectors.upserted',
                    data: {
                        _page: i,
                        _total: vectors.length,
                        _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                        vectors: batchVectors,
                        organizationId: event?.user?.currentOrganizationId
                    },
                    user: event.user
                })
            })
        )
    }

    return outVectors
}

const getAirtableRecords = (base: any): Promise<AirtableRecord[]> => {
    return new Promise((resolve, reject) => {
        const allRecords: AirtableRecord[] = []

        base(AIRTABLE_BASE_ID)
            .select({
                view: AIRTABLE_VIEW_ID
            })
            .eachPage(
                (records: AirtableRecord[], fetchNextPage: () => void) => {
                    console.log('airtable' + ' records: ' + records.length)
                    allRecords.push(...records)
                    fetchNextPage()
                },
                (err: any) => {
                    if (err) {
                        console.error(err)
                        reject(err)
                    } else {
                        resolve(allRecords)
                    }
                }
            )
    })
}

export const processAirtable: EventVersionHandler<{
    apiKey: string
    baseId: string
}> = {
    event: 'airtable/app.sync',
    v: '1',
    handler: async ({ event }) => {
        const { apiKey, baseId } = event.data
        const base = new Airtable({
            apiKey
        }).base(baseId)

        console.log('airtable' + ' event: ' + event)
        try {
            const allRecords: AirtableRecord[] = await getAirtableRecords(base)
            console.log('airtable' + ' allRecords: ' + allRecords.length)
            const pinconeObjs = await getAirtablePineconeObject(allRecords)
            console.log('airtable' + ' pinecone: ' + pinconeObjs.length)
            const embeddedVectors = await embedVectors(event, pinconeObjs)
            console.log('airtable' + ' embeddedVectors: ' + embeddedVectors.length)
        } catch (error) {
            console.error(`[airtable/app.sync] ${error}`)
        }
    }
}
