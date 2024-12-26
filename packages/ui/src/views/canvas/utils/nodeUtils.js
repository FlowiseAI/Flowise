import { blacklistCategoriesForAgentCanvas, allowedAgentModel, exceptions } from '../constants/nodeConstants'

export const addException = (nodesData) => {
  let nodes = []
  for (const category in exceptions) {
    const nodeNames = exceptions[category]
    nodes.push(...nodesData.filter((nd) => nd.category === category && nodeNames.includes(nd.name)))
  }
  return nodes
}

export const getSearchedNodes = (value, nodesData, isAgentCanvas) => {
  const searchValue = value.toLowerCase()
  const matchesSearch = (nd) => {
    const passesName = nd.name.toLowerCase().includes(searchValue)
    const passesLabel = nd.label.toLowerCase().includes(searchValue)
    const passesCategory = nd.category.toLowerCase().includes(searchValue)
    return passesName || passesCategory || passesLabel
  }

  if (isAgentCanvas) {
    const nodes = nodesData.filter((nd) => !blacklistCategoriesForAgentCanvas.includes(nd.category))
    nodes.push(...addException(nodesData))
    return nodes.filter(matchesSearch)
  }

  const nodes = nodesData.filter((nd) => nd.category !== 'Multi Agents' && nd.category !== 'Sequential Agents')
  return nodes.filter(matchesSearch)
}

export const groupByTags = (nodes, tabValue = 0) => {
  const langchainNodes = nodes.filter((nd) => !nd.tags)
  const utilitiesNodes = nodes.filter((nd) => nd.tags && nd.tags.includes('Utilities'))

  if (tabValue === 0) return langchainNodes
  return utilitiesNodes
}

export const filterNodes = (value, tabValue, nodesData, isAgentCanvas, setNodes, setCategoryExpanded, scrollTop) => {
  if (!value && value !== '') return

  setTimeout(() => {
    if (value) {
      const returnData = getSearchedNodes(value, nodesData, isAgentCanvas)
      groupNodesByCategory(returnData, isAgentCanvas, tabValue, setNodes, setCategoryExpanded, true)
      scrollTop()
    } else {
      groupNodesByCategory(nodesData, isAgentCanvas, tabValue, setNodes, setCategoryExpanded)
      scrollTop()
    }
  }, 500)
}

export const groupNodesByCategory = (nodes, isAgentCanvas, tabValue, setNodes, setCategoryExpanded, isFilter = false) => {
  if (isAgentCanvas) {
    const accordianCategories = {}
    const result = nodes.reduce((r, a) => {
      r[a.category] = r[a.category] || []
      r[a.category].push(a)
      accordianCategories[a.category] = isFilter
      return r
    }, Object.create(null))

    const filteredResult = {}
    for (const category in result) {
      // Filter out blacklisted categories
      if (!blacklistCategoriesForAgentCanvas.includes(category)) {
        // Filter out LlamaIndex nodes
        const nodes = result[category].filter((nd) => !nd.tags || !nd.tags.includes('LlamaIndex'))
        if (!nodes.length) continue

        // Only allow specific models for specific categories
        if (Object.keys(allowedAgentModel).includes(category)) {
          const allowedModels = allowedAgentModel[category]
          filteredResult[category] = nodes.filter((nd) => allowedModels.includes(nd.name))
        } else {
          filteredResult[category] = nodes
        }
      }

      // Allow exceptions
      if (Object.keys(exceptions).includes(category)) {
        filteredResult[category] = addException(nodes)
      }
    }
    setNodes(filteredResult)
    accordianCategories['Multi Agents'] = true
    accordianCategories['Sequential Agents'] = true
    accordianCategories['Memory'] = true
    setCategoryExpanded(accordianCategories)
  } else {
    const taggedNodes = groupByTags(nodes, tabValue)
    const accordianCategories = {}
    const result = taggedNodes.reduce((r, a) => {
      r[a.category] = r[a.category] || []
      r[a.category].push(a)
      accordianCategories[a.category] = isFilter
      return r
    }, Object.create(null))

    const filteredResult = {}
    for (const category in result) {
      if (category === 'Multi Agents' || category === 'Sequential Agents') {
        continue
      }
      filteredResult[category] = result[category]
    }
    setNodes(filteredResult)
    setCategoryExpanded(accordianCategories)
  }
}
