import path from 'path'
import * as fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import readline from 'readline'

const readFile = (filePath: string) => {
    return new Promise(function (resolve, reject) {
        const lines: string[] = []
        var rl = readline.createInterface({
            input: fs.createReadStream(filePath)
        })

        rl.on('line', (line) => {
            lines.push(line)
        })

        rl.on('close', () => {
            // Add newlines to lines
            resolve(lines.join('\n'))
        })

        rl.on('error', (error) => {
            reject(`Error reading file ${filePath}: ${error}`)
        })
    })
}

const generateDateRange = (startDate: string, endDate: string) => {
    const start = startDate.split('-')
    const end = endDate.split('-')
    const startYear = parseInt(start[0], 10)
    const startMonth = parseInt(start[1], 10) - 1 // JS months are 0-indexed
    const startDay = parseInt(start[2], 10)
    const startHour = parseInt(start[3], 10)

    const endYear = parseInt(end[0], 10)
    const endMonth = parseInt(end[1], 10) - 1
    const endDay = parseInt(end[2], 10)
    const endHour = parseInt(end[3], 10)

    const result = []
    const startTime = new Date(startYear, startMonth, startDay, startHour)
    const endTime = new Date(endYear, endMonth, endDay, endHour)

    for (let time = startTime; time <= endTime; time.setHours(time.getHours() + 1)) {
        const year = time.getFullYear()
        const month = (time.getMonth() + 1).toString().padStart(2, '0')
        const day = time.getDate().toString().padStart(2, '0')
        const hour = time.getHours().toString().padStart(2, '0')
        result.push(`${year}-${month}-${day}-${hour}`)
    }

    return result
}

const getLogs = async (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: logService.getLogs - No start date or end date provided`)
    }

    if (startDate > endDate) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: logService.getLogs - Start date is greater than end date`)
    }

    try {
        var promises = []
        const files = generateDateRange(startDate, endDate)

        for (let i = 0; i < files.length; i++) {
            const date = files[i]
            const filePath = process.env.LOG_PATH
                ? path.resolve(process.env.LOG_PATH, `server.log.${date}`)
                : path.join(__dirname, '..', '..', '..', 'logs', `server.log.${date}`)
            if (fs.existsSync(filePath)) {
                promises.push(readFile(filePath))
            } else {
                // console.error(`File ${filePath} not found`)
            }

            if (i === files.length - 1) {
                const results = await Promise.all(promises)
                return results
            }
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: logService.getLogs - ${getErrorMessage(error)}`)
    }
}

export default {
    getLogs
}
