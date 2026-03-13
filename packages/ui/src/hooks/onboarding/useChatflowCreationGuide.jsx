import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useOverlay } from '@/utils/overlay/useOverlay'
import { COMPLETE_STEP } from '@/store/actions'
import chatflowConnectNodes from '@/assets/images/chatflow-connect-nodes.gif'

/**
 * Hook for guided chatflow creation - Step by step overlay guide
 * Usage: Call startGuide() when user clicks "Create a Chatflow" action
 *
 * This provides a comprehensive tutorial for:
 * 1. Understanding the node panel
 * 2. Adding nodes to canvas
 * 3. Connecting nodes
 * 4. Configuring nodes
 * 5. Saving the chatflow
 * 6. Testing the chatflow
 */
const useChatflowCreationGuide = () => {
    const { start } = useOverlay()
    const dispatch = useDispatch()

    /**
     * Start the comprehensive chatflow creation guide
     * Shows user how to build their first complete chatflow
     * Triggered by clicking the guide button at bottom-right
     */
    const startGuide = useCallback(() => {
        const steps = [
            {
                id: 'chatflow-creation:welcome',
                target: '[data-onboarding="guide-button"]',
                title: '🤖 Welcome to Chatflow',
                description: "Let's build a chatflow! I will guide you through the process step by step. Click next to get started.",
                placement: 'top-left',
                padding: 8,
                spotlight: false
            },
            {
                id: 'chatflow-creation:node-panel-intro',
                target: '[data-onboarding="node-panel"]',
                title: '📦 Browse Nodes',
                description:
                    'This is your node panel. Browse through different categories to find building blocks for your AI workflow. Each node represents a specific function like chat models, document loaders, or tools.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:browsing-node-panel',
                target: '[data-onboarding="node-panel"]',
                title: '📦 Browsing Nodes',
                description:
                    'This is your node panel. Browse through different categories to find building blocks for your AI workflow. Each node represents a specific function like chat models, document loaders, or tools.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:drag-node',
                target: '[data-onboarding="node-panel-popper"]',
                title: '🎯 Drag & Drop',
                description: 'Click and drag any node from this panel onto the canvas. Try adding a "Conversational Agent" node first.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:dragging-node',
                target: '[data-onboarding="node-panel-popper"]',
                title: '🎯 Dragging & Dropping',
                description: 'Click and drag any node from this panel onto the canvas. Try adding a "Conversational Agent" node first.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:canvas-tips',
                target: '[data-onboarding="guide-button"]',
                title: '🎨 Canvas Navigation Tips',
                description: 'Use your mouse wheel to zoom in/out. Click and drag nodes to reposition them.',
                placement: 'top-right',
                padding: 10,
                spotlight: false
            },
            {
                id: 'chatflow-creation:add-second-node',
                target: '[data-onboarding="node-panel"]',
                title: '➕ Add Second Node',
                description:
                    'Try adding a second node to your canvas. This will allow you to create connections and build a functional chatflow.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:adding-second-node',
                target: '[data-onboarding="node-panel"]',
                title: '➕ Adding Second Node',
                description:
                    'Try adding a second node to your canvas. This will allow you to create connections and build a functional chatflow.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:add-chat-model',
                target: '[data-onboarding="node-panel-popper"]',
                title: '💬 Add a Chat Model',
                description:
                    'Try adding a "ChatOpenAI" node to your chatflow. This node allows your chatflow to interact with users using natural language.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:adding-chat-model',
                target: '[data-onboarding="node-panel-popper"]',
                title: '💬 Adding a Chat Model',
                description:
                    'Try adding a "ChatOpenAI" node to your chatflow. This node allows your chatflow to interact with users using natural language.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:configure-conversational-agent',
                target: '[data-onboarding="guide-button"]',
                title: '⚙️ Configure Conversational Agent',
                description:
                    'Click "ChatOpenAI" node on the canvas to open its configuration panel. Set API keys, parameters, and customize behavior. Most nodes require some configuration.',
                placement: 'top-right',
                padding: 10,
                spotlight: false
            },
            {
                id: 'chatflow-creation:connect-credential',
                target: '[data-onboarding="credential"]',
                title: '⚙️ Connect Credential',
                description:
                    'After adding a chat model node, you need to connect a credential to it. Click the credential dropdown and select "Create New" options to add your API key to enable the node.',
                placement: 'top',
                padding: 10,
                spotlight: false
            },
            {
                id: 'chatflow-creation:input-credential-name',
                target: '[data-onboarding="dialog-credential-name"]',
                title: '📝 Name Your Credential',
                description:
                    'Give your credential a meaningful name so you can easily identify it later. This is especially helpful if you have multiple credentials for different services.',
                placement: 'top',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:input-credential-api-key',
                target: '[data-onboarding="credential-api-key"]',
                title: '🔑 Enter API Key',
                description:
                    'Enter your API key for the selected credential. This key allows the node to authenticate and interact with the external service.',
                placement: 'top',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:save-credential',
                target: '[data-onboarding="dialog-credential-confirm-button"]',
                title: '💾 Save Credential',
                description:
                    'Click the confirm button to save your credential. This will store your API key and other settings for future use.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:saving-credential',
                target: '[data-onboarding="dialog-credential-confirm-button"]',
                title: '💾 Saving Credential',
                description: 'Your credential is being saved. Please wait a moment.',
                placement: 'bottom',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:credential-saved',
                target: '[data-onboarding="credential"]',
                title: '💾 Credential Saved and Selected',
                description:
                    'Your credential has been saved and selected for your chat model node. You can now proceed to connect more nodes or test your chatflow.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:add-third-node',
                target: '[data-onboarding="node-panel"]',
                title: '➕ Add Third Node',
                description:
                    'Try adding a third node to your canvas. This will give you more options for creating connections and building out your chatflow logic.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:adding-third-node',
                target: '[data-onboarding="node-panel"]',
                title: '➕ Adding Third Node',
                description:
                    'Try adding a third node to your canvas. This will give you more options for creating connections and building out your chatflow logic.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:add-memory',
                target: '[data-onboarding="node-panel-popper"]',
                title: '🧠 Add Memory',
                description:
                    'Try adding a "Buffer Memory" node to your chatflow. Memory nodes help your chatflow remember context and improve interactions.',
                placement: 'right',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:adding-memory',
                target: '[data-onboarding="node-panel-popper"]',
                title: '🧠 Adding Memory',
                description:
                    'Try adding a "Buffer Memory" node to your chatflow. Memory nodes help your chatflow remember context and improve interactions.',
                placement: 'right',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'chatflow-creation:connect-nodes',
                target: '[data-onboarding="guide-button"]',
                title: '🔗 Connect Nodes',
                description:
                    "After adding nodes, connect them by clicking and dragging from one node's output port (right side) to another's input port (left side). This creates the data flow between components.",
                imageSrc: chatflowConnectNodes,
                placement: 'top-left',
                padding: 10,
                spotlight: false
            },
            {
                id: 'chatflow-creation:connecting-nodes',
                target: '[data-onboarding="guide-button"]',
                title: '🔗 Connecting Nodes',
                description:
                    "After adding nodes, connect them by clicking and dragging from one node's output port (right side) to another's input port (left side). This creates the data flow between components.",
                imageSrc: chatflowConnectNodes,
                placement: 'top-left',
                padding: 10,
                spotlight: false,
                hidden: true
            },
            {
                id: 'chatflow-creation:save-flow',
                target: '[data-onboarding="save-button"]',
                title: '💾 Save Your Work',
                description:
                    "Click this save button to store your chatflow. Give it a meaningful name so you can find it later. Don't forget to save regularly!",
                placement: 'left',
                padding: 8,
                spotlight: true
            },
            {
                id: 'chatflow-creation:saving-flow',
                target: '[data-onboarding="save-button"]',
                title: '💾 Saving Your Chatflow',
                description:
                    'Make sure to save your chatflow before testing. Click the save button to ensure your work is stored. You can always come back and edit it later.',
                placement: 'left',
                padding: 8,
                spotlight: false,
                hidden: true
            },
            {
                id: 'chatflow-creation:test-flow',
                target: '[data-onboarding="chat-button"]',
                title: '🚀 Test Your Chatflow',
                description:
                    'Ready to test? Click the chat button to open the testing panel. Send messages to interact with your chatflow and see the results!',
                placement: 'left',
                padding: 10,
                spotlight: true
            },
            {
                id: 'chatflow-creation:testing-flow',
                target: '[data-onboarding="chat-button"]',
                title: '🚀 Testing Your Chatflow',
                description:
                    'In the testing panel, type messages to interact with your chatflow. This helps you see how it responds and debug any issues.',
                placement: 'left',
                padding: 10,
                spotlight: false,
                hidden: true
            },
            {
                id: 'chatflow-creation:completion',
                target: '[data-onboarding="guide-button"]',
                title: "✅ You're All Set!",
                description:
                    "That's it! You now know how to build chatflows. Experiment with different nodes, explore templates, and check the documentation for advanced features. Happy building! 🎉",
                placement: 'top-left',
                padding: 12,
                spotlight: false
            }
        ]

        // Start the guide with completion callback
        start(steps, () => {
            // Mark chatflow creation as completed in onboarding
            dispatch({ type: COMPLETE_STEP, payload: { step: 'chatflowCreated' } })
        })
    }, [start, dispatch])

    return {
        startGuide
    }
}

export default useChatflowCreationGuide
