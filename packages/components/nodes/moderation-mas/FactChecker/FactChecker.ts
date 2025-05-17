import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { FactCheckerTool } from './core'

class FactChecker_Node implements INode {
  label = 'FactChecker'
  name = 'factChecker'
  version = 1.0
  type = 'Tool'
  icon = 'mas-factchecker.svg'
  category = 'MAS'
  description = 'Detect hallucination in text'
  baseClasses = getBaseClasses(FactCheckerTool)

  async init() {
    return new FactCheckerTool()
  }
}
module.exports = { nodeClass: FactChecker_Node }
