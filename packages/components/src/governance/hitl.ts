import * as readline from 'readline'

export interface HumanDecision {
    approved: boolean
    who: string
}

export const waitForHumanApproval = async (toolName: string, toolInput: any, reason: string): Promise<HumanDecision> => {
    return new Promise((resolve) => {
        // Print approval request clearly to terminal
        process.stdout.write('\n' + '='.repeat(60) + '\n')
        process.stdout.write('⚠️  HUMAN APPROVAL REQUIRED\n')
        process.stdout.write('='.repeat(60) + '\n')
        process.stdout.write(`Tool     : ${toolName}\n`)
        process.stdout.write(`Args     : ${JSON.stringify(toolInput, null, 2)}\n`)
        process.stdout.write(`Reason   : ${reason}\n`)
        process.stdout.write('='.repeat(60) + '\n')

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.question('Approve? (yes/no): ', (answer) => {
            rl.close()
            const approved = answer.trim().toLowerCase() === 'yes'
            process.stdout.write(`[Governance] Human decision: ${approved ? 'APPROVED ✅' : 'REJECTED ❌'}\n`)
            process.stdout.write('='.repeat(60) + '\n\n')
            resolve({
                approved,
                who: 'human-via-cli'
            })
        })
    })
}
