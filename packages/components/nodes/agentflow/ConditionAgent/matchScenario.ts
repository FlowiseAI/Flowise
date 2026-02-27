export type ConditionScenario = { scenario: string }

export const findBestScenarioIndex = (scenarios: ConditionScenario[], calledOutputName: string): number => {
    if (!Array.isArray(scenarios) || scenarios.length === 0) return -1

    const normalizedOutput = calledOutputName.toLowerCase().trim()

    // try exact match first
    let matchedScenarioIndex = scenarios.findIndex((scenario) => scenario.scenario.toLowerCase() === normalizedOutput)

    // fallback: check if LLM returned a partial/abbreviated scenario name
    if (matchedScenarioIndex === -1) {
        matchedScenarioIndex = scenarios.findIndex((scenario) => scenario.scenario.toLowerCase().startsWith(normalizedOutput))
    }

    // further fallback: substring match in either direction
    if (matchedScenarioIndex === -1) {
        matchedScenarioIndex = scenarios.findIndex(
            (scenario) =>
                scenario.scenario.toLowerCase().includes(normalizedOutput) || normalizedOutput.includes(scenario.scenario.toLowerCase())
        )
    }

    // last resort: if still no match, use the last scenario as an "else" branch
    if (matchedScenarioIndex === -1) {
        matchedScenarioIndex = scenarios.length - 1
    }

    return matchedScenarioIndex
}
