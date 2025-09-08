import { PrismaClient } from '../generated/prisma-client'

const LOG_LEVEL = process.env.LOG_LEVEL

declare global {
    var prisma: PrismaClient | undefined
}

let prismaDebug = ['warn', 'error']
if (LOG_LEVEL === 'debug') prismaDebug = [...prismaDebug, ...['query', 'info']]

// @ts-ignore
export const prisma = global.prisma || new PrismaClient({ log: [] })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

const SOFT_DELETE_MODELS = ['Chat', 'Message', 'Prompt', 'Journey']

prisma.$use(async (params, next) => {
    if (SOFT_DELETE_MODELS.includes(params.model!)) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
            // Change to findFirst - you cannot filter
            // by anything except ID / unique with findUnique
            params.action = 'findFirst'
            // Add 'deleted' filter
            // ID filter maintained
            params.args.where['deleted'] = false
        }
        if (params.action === 'findMany') {
            // Find many queries
            if (params.args.where) {
                if (params.args.where.deleted == undefined) {
                    // Exclude deleted records if they have not been explicitly requested
                    params.args.where['deleted'] = false
                }
            } else {
                params.args['where'] = { deleted: false }
            }
        }
    }
    return next(params)
})

// Uncomment if you want to restrict updating "soft deleted" records
// prisma.$use(async (params, next) => {
//   if (SOFT_DELETE_MODELS.includes(params.model!)) {
//     // if (params.action == 'update') {
//     //   // Change to updateMany - you cannot filter
//     //   // by anything except ID / unique with findUnique
//     //   params.action = 'updateMany';
//     //   // Add 'deleted' filter
//     //   // ID filter maintained
//     //   params.args.where['deleted'] = false;
//     // }
//     // if (params.action == 'updateMany') {
//     //   if (params.args.where != undefined) {
//     //     params.args.where['deleted'] = false;
//     //   } else {
//     //     params.args['where'] = { deleted: false };
//     //   }
//     // }
//   }
//   return next(params);
// });

prisma.$use(async (params, next) => {
    // Check incoming query type
    if (SOFT_DELETE_MODELS.includes(params.model!)) {
        if (params.action == 'delete') {
            // Delete queries
            // Change action to an update
            params.action = 'update'
            params.args['data'] = { deleted: true }
        }
        if (params.action == 'deleteMany') {
            // Delete many queries
            params.action = 'updateMany'
            if (params.args.data != undefined) {
                params.args.data['deleted'] = true
            } else {
                params.args['data'] = { deleted: true }
            }
        }
    }
    return next(params)
})
