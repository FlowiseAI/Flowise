import { z } from 'zod'
import { INode } from '../../../src/Interface'
import { DynamicStructuredTool } from '../CustomTool/core'

const code = `
const now = new Date();
                
// Format date as YYYY-MM-DD
const date = now.toISOString().split('T')[0];

// Get time in HH:MM:SS format
const time = now.toTimeString().split(' ')[0];

// Get day of week
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const day = days[now.getDay()];

// Get timezone information
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneOffset = now.getTimezoneOffset();
const timezoneOffsetHours = Math.abs(Math.floor(timezoneOffset / 60));
const timezoneOffsetMinutes = Math.abs(timezoneOffset % 60);
const timezoneOffsetFormatted = 
    (timezoneOffset <= 0 ? '+' : '-') + 
    timezoneOffsetHours.toString().padStart(2, '0') + ':' + 
    timezoneOffsetMinutes.toString().padStart(2, '0');

return {
    date,
    time,
    day,
    timezone,
    timezoneOffset: timezoneOffsetFormatted,
    iso8601: now.toISOString(),
    unix_timestamp: Math.floor(now.getTime() / 1000)
};
`

class CurrentDateTime_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'CurrentDateTime'
        this.name = 'currentDateTime'
        this.version = 1.0
        this.type = 'CurrentDateTime'
        this.icon = 'currentDateTime.svg'
        this.category = 'Tools'
        this.description = 'Get todays day, date and time.'
        this.baseClasses = [this.type, 'Tool']
    }

    async init(): Promise<any> {
        const obj = {
            name: 'current_date_time',
            description: 'Useful to get current day, date and time.',
            schema: z.object({}),
            code: code
        }

        let dynamicStructuredTool = new DynamicStructuredTool(obj)

        return dynamicStructuredTool
    }
}

module.exports = { nodeClass: CurrentDateTime_Tools }
