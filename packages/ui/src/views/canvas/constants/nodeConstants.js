export const blacklistCategoriesForAgentCanvas = ['Agents', 'Memory', 'Record Manager']

export const allowedAgentModel = {}

export const exceptions = {
  Memory: ['agentMemory']
}

export const tabOptions = [
  { label: 'All', icon: 'apps', size: 20 },
  { label: 'Utilities', icon: 'tool', size: 20 }
]

export function a11yProps(index) {
  return {
    id: `attachment-tab-${index}`,
    'aria-controls': `attachment-tabpanel-${index}`
  }
}
