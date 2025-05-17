import { Tool } from '@langchain/core/tools'
import { randomBool } from '../utils'

export class FactCheckerTool extends Tool {
  name = 'factChecker'
  description = 'Probabilistic hallucination detector'


  
  async _call(input: string) {
    // 20% 输入被标为 hallucination
    return randomBool(0.2) ? 'hallucination' : 'clean'
  }
}
