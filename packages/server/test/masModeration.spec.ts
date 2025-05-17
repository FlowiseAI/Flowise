import { FactCheckerTool } from '../../components/nodes/moderation-mas/FactChecker/core'

describe('FactChecker basic accuracy', () => {
  it('should flag ~20% posts', async () => {
    const tool = new FactCheckerTool()
    const total = 100
    let flagged = 0
    for (let i = 0; i < total; i++) {
      const r = await tool._call('test')
      if (r === 'hallucination') flagged++
    }
    expect(flagged).toBeGreaterThan(10)
    expect(flagged).toBeLessThan(30)
  })
})
