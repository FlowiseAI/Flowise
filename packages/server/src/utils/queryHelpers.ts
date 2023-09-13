import { isEmpty } from 'lodash'
import { FindManyOptions, ILike, ObjectLiteral, Repository } from 'typeorm'

type tGetDataByQueries<T extends ObjectLiteral> = {
    repository: Repository<T>
    searchTerm?: string
    searchColumns?: (keyof T)[]
    sortColumns?: Record<keyof T, 'ASC' | 'DESC'>
    filters?: Record<keyof T, any>
    page?: number
    pageSize?: number
}

/**
 * Get data from DB by queries
 *
 * @param {Repository<T>} repository - The repository to fetch data from.
 * @param {string} [searchTerm] - An optional search term to filter the data.
 * @param {keyof T[]} [searchColumns] - An optional list of columns to apply the search term.
 * @param {Record<keyof T, 'ASC' | 'DESC'>} [sortColumns] - An optional object to sort the data.
 * @param {number} [page] - An optional page number for pagination.
 * @param {number} [pageSize] - An optional page size for pagination.
 *
 * @returns {Promise<{ data: T[]; meta: any }>} - Returns a promise that resolves to an object with the data and meta information.
 *
 * @example
 *    const result = await searchAndSort(
 *    chainLogRepository,
 *    'searchTerm',
 *    ['question', 'text'],
 *    { 'chatId': 'ASC', 'createdDate': 'DESC' },
 *    1,
 *    10
 *    );
 *
 *      filters={"column1":"value1","column2":"value2"}
 */

async function getDataByQueries<T extends ObjectLiteral>({
    repository,
    searchTerm = '',
    searchColumns = [],
    sortColumns,
    page = 1,
    pageSize = 15,
    filters = {} as Record<keyof T, any>
}: tGetDataByQueries<T>): Promise<{ data: T[]; meta: any }> {
    let options: FindManyOptions<T> = {
        skip: (page - 1) * pageSize,
        take: pageSize
    }

    const filterConditions: any = Object.entries(filters).reduce((conditions, [key, value]) => {
        // @ts-ignore
        conditions[key] = value
        return conditions
    }, {})

    const combinedConditions = searchColumns.map((column) => {
        return { [column]: ILike(`%${searchTerm}%`), ...filterConditions }
    })

    if (combinedConditions.length > 0) {
        options.where = combinedConditions
    } else if (!isEmpty(filterConditions)) {
        options.where = filterConditions
    }

    if (!isEmpty(sortColumns)) {
        options.order = Object.entries(sortColumns).reduce((result, [column, direction]) => ({ ...result, [column]: direction }), {})
    }

    if (combinedConditions.length > 0) {
        options.where = combinedConditions
    }

    const [result, total] = await repository.findAndCount(options)
    const lastPage = Math.ceil(total / pageSize) || 1
    const nextPage = page >= lastPage ? null : page + 1
    const prevPage = page <= 1 ? null : page - 1

    return {
        data: result,
        meta: {
            totalItems: total,
            itemsPerPage: pageSize,
            currentPage: page,
            lastPage,
            nextPage,
            prevPage
        }
    }
}

function prepareQueryParametersForLists(query: any) {
    const searchTerm = query.search as string
    const page = Number(query?.page) || 1
    const pageSize = Number(query?.pageSize) || 15
    const searchColumns: any = (query.searchFields as string)?.split(',')
    const sortFields = query?.sortFields ? query.sortFields?.split(',') : []
    const sortOrders = (query.sortOrders as string)?.split(',') || []
    const filters: any = query.filters ? JSON.parse(query.filters) : {} // Assuming filters are provided as JSON strings

    const sortColumns: Record<string, 'ASC' | 'DESC'> = sortFields.reduce((result: Record<string, any>, field: any, index: number) => {
        result[field] = sortOrders[index] as 'ASC' | 'DESC'
        return result
    }, {})

    return { searchTerm, page, pageSize, searchColumns, sortColumns, filters }
}

export { getDataByQueries, prepareQueryParametersForLists }
