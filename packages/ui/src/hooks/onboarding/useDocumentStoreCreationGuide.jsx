import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useOverlay } from '@/utils/overlay/useOverlay'
import { COMPLETE_STEP } from '@/store/actions'

/**
 * Hook for guided document store creation - Step by step overlay guide
 * Usage: Call startGuide() when user clicks "Add a Document Store" action
 *
 * This provides a tutorial for:
 * 1. Understanding document stores and RAG
 * 2. Creating a new document store
 * 3. Managing document stores
 * 4. Viewing document store details
 */
const useDocumentStoreCreationGuide = () => {
    const { start } = useOverlay()
    const dispatch = useDispatch()

    /**
     * Start the document store creation guide
     * Shows user how to create and manage document stores
     * Triggered when navigating to document stores with startGuide flag
     */
    const startGuide = useCallback(() => {
        const steps = [
            {
                id: 'docstore:welcome',
                target: '[data-onboarding="view-header-container"]',
                title: '📚 Welcome to Document Stores',
                description:
                    'Document stores are where you upload and manage documents for RAG (Retrieval-Augmented Generation) applications. They help your AI retrieve relevant information from your knowledge base.',
                placement: 'bottom',
                padding: 12,
                spotlight: true
            },
            {
                id: 'docstore:what-is-rag',
                target: '[data-onboarding="view-header-container"]',
                title: '🧠 What is RAG?',
                description:
                    'RAG allows your AI to access external knowledge by retrieving relevant documents before generating responses. This makes your chatbot more accurate and informed about your specific content.',
                placement: 'bottom',
                padding: 12,
                spotlight: true
            },
            {
                id: 'docstore:add-new',
                target: '[data-onboarding="add-docstore-button"]',
                title: '➕ Create Document Store',
                description:
                    'Click "Add New" to create your first document store. You\'ll be able to upload PDFs, text files, web pages, and more to build your knowledge base.',
                placement: 'left',
                padding: 8,
                spotlight: true
            },
            {
                id: 'docstore:creating',
                target: '[data-onboarding="add-docstore-button"]',
                title: '✏️ Creating Document Store',
                description:
                    'In the dialog, give your document store a name and description. Then you can start adding documents and configuring how they should be processed.',
                placement: 'left',
                padding: 8,
                spotlight: false,
                hidden: true
            },
            {
                id: 'docstore:click-card',
                target: '[data-onboarding="docstore-grid"] > div:first-child',
                title: '👆 Manage your document',
                description:
                    'Click on a document store card to open it. Inside, you can upload documents, configure text splitters, embedding models, and vector stores.',
                placement: 'top',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:selecting-card',
                target: '[data-onboarding="docstore-grid"] > div:first-child',
                title: '👆 Selecting your document',
                description:
                    'Select a document store card to open it. This allows you to manage its documents, configure settings, and view details.',
                placement: 'top',
                padding: 10,
                spotlight: true,
                hidden: true
            },
            {
                id: 'docstore:detail',
                target: '[data-onboarding="view-header-container"]',
                title: '🔍 Document Store Details',
                description:
                    'Here you can view the details of your document store, including its configuration, documents, and associated data.',
                placement: 'top',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:add-loader',
                target: '[data-onboarding="add-docstore-loader-button"]',
                title: '📂 Add Document Loaders',
                description:
                    'Document loaders help you upload and process different types of documents. Click "Add Document Loader" to see the available options.',
                placement: 'top',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:creating-add-loader',
                target: '[data-onboarding="add-docstore-loader-button"]',
                title: '📂 Creating Document Loaders',
                description:
                    'Document loaders allow you to upload and process various document types. In the dialog, you can choose the loader type and configure its settings.',
                placement: 'top',
                padding: 10,
                spotlight: false,
                hidden: true
            },
            {
                id: 'docstore:api-loader',
                target: '[data-onboarding="document-loader-list"] > div:first-child',
                title: '🌐 API Loader',
                description:
                    'Click on the API loader to configure it. This allows you to connect external data sources and automatically ingest documents into your store.',
                placement: 'right',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:selecting-api-loader',
                target: '[data-onboarding="document-loader-list"] > div:first-child',
                title: '🌐 Selecting API Loader',
                description:
                    'Select the API loader to configure it. This allows you to connect external data sources and automatically ingest documents into your store.',
                placement: 'right',
                padding: 10,
                spotlight: true,
                hidden: true
            },
            {
                id: 'docstore:api-loader-name-input',
                target: '[data-onboarding="docstore-loader-name-input"]',
                title: '✏️ Name Your Loader',
                description:
                    'Give your document loader a name that describes its purpose. This will help you identify it later when managing multiple loaders.',
                placement: 'bottom',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:api-loader-method-input',
                target: '[data-onboarding="docstore-input-method"]',
                title: '🔧 Configure API Method',
                description:
                    'Select the API method for your loader. In the example, we use the "GET" method to retrieve data from an external source.',
                placement: 'bottom',
                padding: 12,
                spotlight: true
            },
            {
                id: 'docstore:api-loader-url-input',
                target: '[data-onboarding="docstore-input-url"]',
                title: '🔗 Set API Endpoint',
                description: 'https://raw.githubusercontent.com/FlowiseAI/Flowise/refs/heads/main/CODE_OF_CONDUCT.md',
                placement: 'bottom',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:api-loader-text-splitter',
                target: '[data-onboarding="docstore-text-splitter"]',
                title: '🔪 Text Splitter',
                description:
                    'Configure the text splitter to divide your documents into manageable chunks for processing. In the example, we use a Markdown Text Splitter with a chunk size of 1000 and overlap of 200.',
                placement: 'bottom',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:preview-documents',
                target: '[data-onboarding="docstore-loader-preview-chunks-button"]',
                title: '👀 Preview Document Chunks',
                description:
                    'Before processing, you can preview how your documents will be split into chunks. This helps you ensure that your text splitter is configured correctly.',
                placement: 'bottom',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:previewing-documents',
                target: '[data-onboarding="docstore-loader-preview-chunks-button"]',
                title: '👀 Previewing Document Chunks',
                description:
                    'In the preview mode, you can see how your documents are being split into chunks based on your text splitter configuration. This allows you to make adjustments before processing.',
                placement: 'bottom',
                padding: 10,
                spotlight: false,
                hidden: true
            },
            {
                id: 'docstore:process-documents',
                target: '[data-onboarding="docstore-loader-process-button"]',
                title: '⚡ Process Documents',
                description:
                    'Once you\'re satisfied with the configuration, click "Process" to start ingesting your documents into the store. This may take a few moments depending on the size of your documents.',
                placement: 'left',
                padding: 10,
                spotlight: true
            },
            {
                id: 'docstore:processing-documents',
                target: '[data-onboarding="docstore-loader-process-button"]',
                title: '⚡ Processing Documents',
                description:
                    'While processing, your documents are being ingested into the store and prepared for retrieval. You can check the status in the document store details page.',
                placement: 'left',
                padding: 10,
                spotlight: false,
                hidden: true
            },
            {
                id: 'docstore:completion',
                target: '[data-onboarding="view-header-container"]',
                title: "🎉 You're Ready to Build!",
                description:
                    'Now you know how to create and manage document stores for RAG applications. Create your first store, upload documents, and connect it to your chatflows. Happy building!',
                placement: 'bottom',
                padding: 12,
                spotlight: false
            }
        ]

        // Start the guide with completion callback
        start(steps, () => {
            // Mark document store creation as completed in onboarding
            dispatch({ type: COMPLETE_STEP, payload: { step: 'documentStoreAdded' } })
        })
    }, [start, dispatch])

    return {
        startGuide
    }
}

export default useDocumentStoreCreationGuide
