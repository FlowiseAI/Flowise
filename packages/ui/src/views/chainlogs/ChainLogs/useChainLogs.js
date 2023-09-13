import { useState, useEffect } from 'react'
import { getAllChainLogs } from 'api/chainlogs'
import useApi from 'hooks/useApi'

export function useChainLogs({ pageSizes }) {
    const { data, loading, request } = useApi(getAllChainLogs)
    const [term, setTerm] = useState('')
    const [sort, setSort] = useState('DESC')
    const [sortBy, setSortBy] = useState('createdDate')

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(pageSizes[0])
    const [filters, setFilters] = useState('')

    const getParams = ({ searchFields, term, page, pageSize, sort, sortBy, filters }) => ({
        page,
        pageSize,
        sortOrders: sort,
        sortFields: sortBy,
        search: term,
        searchFields: searchFields || 'question,text',
        filters
    })

    useEffect(() => {
        const params = getParams({ term, sort, page, pageSize, sortBy, filters })
        request({ params })
    }, [term, sort, page, pageSize, sortBy, filters]) // eslint-disable-line

    const refetch = () => {
        const params = getParams({ term, sort, page, pageSize, sortBy, filters })
        request({ params })
    }

    function onChangeTerm(term) {
        // if (term && filters) setFilters('')
        setTerm(term)
    }

    function onChangePage(_event, newPage) {
        setPage(newPage)
    }

    function onChangePaeSize(size) {
        setPageSize(size)
    }

    function handleFilter(payload) {
        setFilters(payload)
    }

    function handleRequestSort(property) {
        const isCurrent = sortBy === property
        const isAsc = isCurrent && sort === 'ASC'

        if (isCurrent && sort === 'DESC') {
            setSort('')
            return
        }

        const newSort = isAsc ? 'DESC' : 'ASC'
        setSort(newSort)
        setSortBy(property)
    }

    return {
        loading,
        data: data?.data,
        meta: data?.meta,

        filters,

        sort,
        setSort,
        sortBy,
        setSortBy,

        page,
        setPage,
        pageSize,
        setPageSize,

        onChangeTerm,
        onChangePage,
        onChangePaeSize,
        handleRequestSort,
        handleFilter,
        refetch
    }
}
