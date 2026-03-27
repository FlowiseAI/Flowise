import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useOverlay } from '@/utils/overlay/useOverlay'
import { COMPLETE_STEP } from '@/store/actions'
import agentflowConnectNodes from '@/assets/images/agentflow-connect-nodes.gif'
import agentflowConnectRouterAgents from '@/assets/images/agentflow-connect-router-agents.gif'

/**
 * Hook for guided agent flow (v2) creation - Multi-agent system tutorial
 * Usage: Call startGuide() when user clicks "Build an Agent Flow" action
 *
 * This provides a comprehensive tutorial for building a customer service routing system:
 * 1. Start Node - Entry point
 * 2. Router Agent - Main coordinator that routes queries
 * 3. Billing Agent - Handles billing-related queries
 * 4. General Agent - Handles general inquiries
 *
 * This demonstrates a real-world multi-agent pattern where specialized agents
 * handle different types of customer requests.
 */
const useAgentFlowCreationGuide = () => {
    const { start } = useOverlay()
    const dispatch = useDispatch()

    /**
     * Start the comprehensive agent flow creation guide
     * Shows user how to build a multi-agent customer service system
     * Triggered automatically when navigating from QuickStart or via guide button
     */
    const startGuide = useCallback(() => {
        const steps = [
            {
                id: 'agent-creation:welcome',
                target: '[data-onboarding="guide-button"]',
                title: '🤖 Welcome to Agent Flows',
                description:
                    "Let's build a customer service routing system! We'll create a router agent that directs queries to specialized agents (Billing, General). Start by exploring the node panel.",
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:start-node-intro',
                target: '[data-onboarding="startAgentflow"]',
                title: '🚦 Start Node',
                description: 'Every agent flow needs a starting point. This is where incoming queries will enter the system.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:add-router-agent',
                target: '[data-onboarding="node-panel"]',
                title: '🔀 Add Router Agent',
                description:
                    'Now add a Router Agent (or Supervisor Agent). This agent will analyze incoming queries and route them to the appropriate specialized agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:adding-router-agent',
                target: '[data-onboarding="node-panel"]',
                title: '🔀 Find Router Agent Node',
                description: 'In the node panel, search for "Router" or "Supervisor" to find the router agent node.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:drag-condition-agent',
                target: '[data-onboarding="node-panel-popper"]',
                title: '🔀 Find Condition Agent',
                description: 'In the node panel, search for "Condition Agent" to find the router agent node.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:dragging-condition-agent',
                target: '[data-onboarding="node-panel-popper"]',
                title: '🔀 Drag Condition Agent',
                description: 'Drag the Condition Agent from the node panel to the canvas.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            // Configure the router agent to route based on keywords in the query (billing, general)
            {
                id: 'agent-creation:configure-condition-agent',
                target: '[data-onboarding="guide-button"]',
                title: '🔀 Configure Condition Agent',
                description: `
                    Click on the Condition Agent to configure it. This will allow the router agent to analyze each incoming query and determine which specialized agent should handle it.
                `,
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:rename-condition-agent',
                target: '[data-onboarding="edit-name-button"]',
                title: '✏️ Rename Condition Agent',
                description: 'Click the edit button to rename the Condition Agent to something more descriptive. (e.g. "Router Agent")',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:renaming-condition-agent',
                target: '[data-onboarding="edit-name-button"]',
                title: '✏️ Renaming Condition Agent',
                description: 'You are currently renaming the Condition Agent. Enter a new name and press Enter to save.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:save-condition-agent',
                target: '[data-onboarding="save-name-button"]',
                title: '💾 Save Condition Agent Name',
                description: 'Click the save button to save the new name for the Condition Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:select-model-condition-agent',
                target: '[data-onboarding="conditionAgentModel"]',
                title: '🔀 Select the Model',
                description:
                    'In the configuration panel, select the LLM model you want to use for routing (e.g., ChatOpenAI) and provide necessary parameters (like API key).',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:expand-model-parameters-condition-agent',
                target: '[data-onboarding="conditionAgentModel"] > div > div:last-child',
                title: '🔀 Expand Model Parameters',
                description:
                    'Expand the model parameters section to add API keys or other necessary configuration for the model powering your router agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:configure-credentials-condition-agent',
                target: '[data-onboarding="credential"]',
                title: '🔑 Configure Credentials',
                description: 'Provide the necessary API keys or credentials for the model powering your router agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:fill-instructions-condition-agent',
                target: '[data-onboarding="conditionAgentInstructions"]',
                title: '🔀 Fill in Routing Instructions',
                description:
                    'You are a router agent that directs customer queries to specialized agents based on the query content:\n- If query contains "billing", route to Billing Agent\n- Otherwise, route to General Agent\n\nEach route should be defined as the scenario for when to route to each agent.\n- Billing Agent: Handles payment questions, invoices, pricing\n- General Agent: Handles general inquiries about the company, products, etc.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // Find scenario input and fill in routing instructions for the router agent
            {
                id: 'agent-creation:fill-in-billing-scenario-condition-agent',
                target: '[data-onboarding="conditionAgentScenarios"] > div > div:nth-child(2)',
                title: '🔀 Fill in Billing Scenario',
                description: `User is asking about billing`,
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:fill-in-general-scenario-condition-agent',
                target: '[data-onboarding="conditionAgentScenarios"] > div > div:nth-child(3)',
                title: '🔀 Fill in General Scenario',
                description: `User is asking a general question`,
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:condition-agent-configured',
                target: '[data-onboarding="guide-button"]',
                title: '🔀 Router Agent Configured',
                description:
                    'Great! You have configured the router agent to analyze incoming queries and route them based on their content. Click outside the configuration panel to close it.',
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:connect-nodes',
                target: '[data-onboarding="guide-button"]',
                title: '🔗 Connect Your Agents',
                description:
                    'Now connect the nodes: Start → Condition Agent, then Condition Agent. Drag from the right side of the Start node to the left side of the Condition Agent to create a connection. This defines the flow of how queries will be processed.',
                placement: 'top-left',
                imageSrc: agentflowConnectNodes,
                padding: 10,
                spotlight: false
            },
            {
                id: 'agent-creation:add-billing-agent',
                target: '[data-onboarding="node-panel"]',
                title: '💰 Add Billing Agent',
                description:
                    'Add an Agent node for handling billing queries. This specialized agent will handle questions about payments, invoices, and pricing. Search for "Worker" or "Agent" nodes.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:adding-billing-agent',
                target: '[data-onboarding="node-panel"]',
                title: '💰 Adding Billing Agent',
                description: 'Adding the billing agent to the canvas.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:drag-billing-agent',
                target: '[data-onboarding="node-panel-popper"]',
                title: '💰 Find Agent Node',
                description: 'In the node panel, search for "Agent" to find the specialized agent node.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:dragging-billing-agent',
                target: '[data-onboarding="node-panel-popper"]',
                title: '💰 Dragging Billing Agent',
                description: 'Dragging the Billing Agent node onto the canvas.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:configure-billing-agent',
                target: '[data-onboarding="guide-button"]',
                title: '💰 Configure Billing Agent',
                description: `
                    Click on the Billing Agent to configure it.
                `,
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:rename-billing-agent',
                target: '[data-onboarding="edit-name-button"]',
                title: '✏️ Rename Billing Agent',
                description: 'Click the edit button to rename the Billing Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:renaming-billing-agent',
                target: '[data-onboarding="edit-name-button"]',
                title: '✏️ Renaming Billing Agent',
                description: 'You are currently renaming the Billing Agent. Enter a new name and press Enter to save.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:save-billing-agent',
                target: '[data-onboarding="save-name-button"]',
                title: '💾 Save Billing Agent Name',
                description: 'Click the save button to save the new name for the Billing Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // Select the model
            {
                id: 'agent-creation:select-model-billing-agent',
                target: '[data-onboarding="agentModel"]',
                title: '💰 Select the Model for Billing Agent',
                description:
                    'In the configuration panel, select the LLM model you want to use for the Billing Agent (e.g., ChatOpenAI) and provide necessary parameters (like API key).',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:expand-model-parameters-billing-agent',
                target: '[data-onboarding="agentModel"] > div > div:last-child',
                title: '🔀 Expand Model Parameters',
                description:
                    'Expand the model parameters section to add API keys or other necessary configuration for the model powering your billing agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:configure-credentials-billing-agent',
                target: '[data-onboarding="credential"]',
                title: '🔑 Configure Credentials',
                description: 'Provide the necessary API keys or credentials for the model powering your billing agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // Fill the agent message
            {
                id: 'agent-creation:add-messages-billing-agent',
                target: '[data-onboarding="agentMessages"] > div:first-child',
                title: '💰 Add message for Billing Agent',
                description: 'Click the "Add Message" button to add a message that defines the role of the Billing Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:add-role-billing-agent',
                target: '[data-onboarding="role"]',
                title: '💰 Select Role for message for Billing Agent',
                description: 'Select the Role as "assistant".',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:add-content-billing-agent',
                target: '[data-onboarding="content"]',
                title: '💰 Add content for message for Billing Agent',
                description:
                    'You are a helpful assistant that specializes in answering billing questions about payments, invoices, and pricing.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // You're done at configuring the billing agent
            {
                id: 'agent-creation:billing-agent-configured',
                target: '[data-onboarding="guide-button"]',
                title: '💰 Billing Agent Configured',
                description: 'You have successfully configured the Billing Agent.',
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:add-general-agent',
                target: '[data-onboarding="node-panel"]',
                title: '💬 Add General Agent',
                description:
                    "Add a third Agent node for general inquiries. This agent will be the fallback for questions that don't fit billing categories.",
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:adding-general-agent',
                target: '[data-onboarding="node-panel"]',
                title: '💬 Adding General Agent',
                description: 'Adding a third Agent node for general inquiries.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:drag-general-agent',
                target: '[data-onboarding="node-panel-popper"]',
                title: '💬 Drag General Agent',
                description: 'Drag the "Agent" node from the node panel to the canvas.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:dragging-general-agent',
                target: '[data-onboarding="node-panel-popper"]',
                title: '💬 Dragging General Agent',
                description: 'Dragging the "Agent" node from the node panel to the canvas.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:configure-general-agent',
                target: '[data-onboarding="guide-button"]',
                title: '💬 Configure General Agent',
                description: `
                    Click on the General Agent to configure it.
                `,
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:rename-general-agent',
                target: '[data-onboarding="edit-name-button"]',
                title: '✏️ Rename General Agent',
                description: 'Click the edit button to rename the General Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:renaming-general-agent',
                target: '[data-onboarding="edit-name-button"]',
                title: '✏️ Renaming General Agent',
                description: 'You are currently renaming the General Agent. Enter a new name and press Enter to save.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'agent-creation:save-general-agent',
                target: '[data-onboarding="save-name-button"]',
                title: '💾 Save General Agent Name',
                description: 'Click the save button to save the new name for the General Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // Select the model
            {
                id: 'agent-creation:select-model-general-agent',
                target: '[data-onboarding="agentModel"]',
                title: '💬 Select the Model for General Agent',
                description:
                    'In the configuration panel, select the LLM model you want to use for the General Agent (e.g., ChatOpenAI) and provide necessary parameters (like API key).',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:expand-model-parameters-general-agent',
                target: '[data-onboarding="agentModel"] > div > div:last-child',
                title: '🔀 Expand Model Parameters',
                description:
                    'Expand the model parameters section to add API keys or other necessary configuration for the model powering your general agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:configure-credentials-general-agent',
                target: '[data-onboarding="credential"]',
                title: '🔑 Configure Credentials',
                description: 'Provide the necessary API keys or credentials for the model powering your general agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // Fill the agent message
            {
                id: 'agent-creation:add-messages-general-agent',
                target: '[data-onboarding="agentMessages"] > div:first-child',
                title: '💰 Add message for General Agent',
                description: 'Click the "Add Message" button to add a message that defines the role of the General Agent.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:add-role-general-agent',
                target: '[data-onboarding="role"]',
                title: '💰 Select Role for message for General Agent',
                description: 'Select the Role as "assistant".',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:add-content-general-agent',
                target: '[data-onboarding="content"]',
                title: '💰 Add content for message for General Agent',
                description: 'You are a helpful assistant that specializes in answering general questions.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            // You're done at configuring the general agent
            {
                id: 'agent-creation:general-agent-configured',
                target: '[data-onboarding="guide-button"]',
                title: '💬 General Agent Configured',
                description: 'You have successfully configured the General Agent.',
                placement: 'right',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:connect-router-to-agents',
                target: '[data-onboarding="guide-button"]',
                title: '🔗 Connect Router to Agents',
                description:
                    'Now connect the Condition Agent to both specialized agents: Billing and General. This completes the flow of how queries will be routed.',
                placement: 'top-left',
                imageSrc: agentflowConnectRouterAgents,
                padding: 10,
                spotlight: false
            },
            {
                id: 'agent-creation:save-flow',
                target: '[data-onboarding="save-button"]',
                title: '💾 Save Your Agent Flow',
                description:
                    'Save your multi-agent system! Give it a descriptive name like "Customer Service Router" so you can find it easily later.',
                placement: 'left',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:saving-flow',
                target: '[data-onboarding="save-button"]',
                title: '💾 Saving Agent Flow',
                description:
                    "Saving your agent flow... Once saved, you'll be able to test how the router directs queries to different specialized agents.",
                placement: 'left',
                padding: 8,
                spotlight: false,
                hidden: true
            },
            // Open the Validation pop-up and validate the flow to check for any issues before testing
            {
                id: 'agent-creation:open-validation',
                target: '[data-onboarding="validate-nodes-button"]',
                title: '✅ Validate Your Agent Flow',
                description:
                    'Before testing, it\'s a good idea to validate your flow to check for any configuration issues. Click the "Validate Nodes" button to open the validation pop-up.',
                placement: 'left',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:openning-validation',
                target: '[data-onboarding="validate-nodes-button"]',
                title: '✅ Opening Validation Pop-up',
                description: 'Opening the validation pop-up...',
                placement: 'left',
                padding: 8,
                spotlight: false,
                hidden: true
            },
            // Validate the flow
            {
                id: 'agent-creation:validate-flow',
                target: '[data-onboarding="validate-nodes-confirm-button"]',
                title: '✅ Validate Your Agent Flow',
                description:
                    'Click the "Validate Flow" button to check for any issues in your flow. This will ensure that all nodes are properly configured and connected.',
                placement: 'left',
                padding: 8,
                spotlight: true
            },
            {
                id: 'agent-creation:validating-flow',
                target: '[data-onboarding="validate-nodes-confirm-button"]',
                title: '✅ Validating Agent Flow',
                description: 'Validating your agent flow... Fix any issues if validation fails.',
                placement: 'left',
                padding: 8,
                spotlight: false,
                hidden: true
            },
            {
                id: 'agent-creation:validation-no-issue',
                target: '[data-onboarding="guide-button"]',
                title: '✅ Validation Passed!',
                description: 'Great job! Your agent flow has no issues. You are ready to test your multi-agent system.',
                placement: 'top-left',
                padding: 8,
                spotlight: false
            },
            {
                id: 'agent-creation:test-flow',
                target: '[data-onboarding="chat-button"]',
                title: '🚀 Test Your Agent System',
                description:
                    'Ready to test? Click the chat button and try different queries: "How much does this cost?" (billing), "Tell me about your company" (general).',
                placement: 'left',
                padding: 10,
                spotlight: true
            },
            {
                id: 'agent-creation:testing-flow',
                target: '[data-onboarding="chat-button"]',
                title: '🚀 Testing Your Agents',
                description:
                    'Watch how the router agent analyzes each query and routes it to the appropriate specialist. This is the power of multi-agent collaboration!',
                placement: 'left',
                padding: 10,
                spotlight: false,
                hidden: true
            },
            {
                id: 'agent-creation:completion',
                target: '[data-onboarding="guide-button"]',
                title: '✅ Agent System Complete!',
                description:
                    "Congratulations! You've built a multi-agent system. You can expand this by adding more specialized agents, tools, or memory. Explore agent patterns in the templates! 🎉",
                placement: 'top-left',
                padding: 12,
                spotlight: false
            }
        ]

        // Start the guide with completion callback
        start(steps, () => {
            // Mark agent flow creation as completed in onboarding
            dispatch({ type: COMPLETE_STEP, payload: { step: 'agentFlowCreated' } })
        })
    }, [start, dispatch])

    return {
        startGuide
    }
}

export default useAgentFlowCreationGuide
