import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Persisted language preference (default to browser or 'en')
const savedLng = typeof window !== 'undefined' ? localStorage.getItem('app_lang') : null

const resources = {
  en: {
    translation: {
      landing: {
        hero: {
          title: 'Build, evaluate, and deploy AI agents visually',
          subtitle: 'Freia brings together chatflows, agents, datasets, evaluations, vector stores, tools and more in one cohesive UI.',
          ctaGetStarted: 'Get started',
          ctaCreateAccount: 'Create an account'
        },
        features: {
          visualChatflows: {
            title: 'Visual chatflows',
            desc: 'Design complex AI workflows with drag-and-drop nodes and connectors.'
          },
          agentsTools: {
            title: 'Agents & tools',
            desc: 'Compose multi-tool agents and manage execution traces effortlessly.'
          },
          datasetsEvals: {
            title: 'Datasets & evals',
            desc: 'Create datasets and run evaluations to measure quality and performance.'
          },
          vectorStores: {
            title: 'Vector stores',
            desc: 'Index and query documents using pluggable vector backends.'
          },
          secureAuth: {
            title: 'Secure auth',
            desc: 'Organization-ready auth with roles, SSO, API keys, and audit trails.'
          },
          deployAnywhere: {
            title: 'Deploy anywhere',
            desc: 'Run locally or in the cloud. Open-source friendly architecture.'
          }
        },
        cta: {
          title: 'Ready to explore Freia?',
          subtitle: 'Sign in to start building chatflows, connecting tools, and evaluating your AI use-cases.',
          goToSignin: 'Go to Sign in'
        }
      },
      auth: {
        signin: {
          title: 'Sign In',
          noAccount: "Don't have an account?",
          signUpForFree: 'Sign up for free',
          haveInvite: 'Have an invite code?',
          signUpForAccount: 'Sign up for an account',
          email: 'Email',
          password: 'Password',
          forgotPassword: 'Forgot password?',
          migrateExisting: 'Migrate from existing account?',
          login: 'Login',
          or: 'OR',
          resendVerification: 'Resend Verification Email',
          verificationSent: 'Verification email has been sent successfully.'
        },
        register: {
          title: 'Sign Up',
          alreadyHaveAccount: 'Already have an account?',
          displayName: 'Display Name',
          displayNameHint: 'Is used for display purposes only.',
          email: 'Email',
          emailHint: 'Kindly use a valid email address. Will be used as login id.',
          inviteCode: 'Invite Code',
          invitePlaceholder: 'Paste in the invite code.',
          inviteHint: 'Please copy the token you would have received in your email.',
          password: 'Password',
          passwordHint: 'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character.',
          confirmPassword: 'Confirm Password',
          confirmPasswordHint: 'Confirm your password. Must match the password typed above.',
          createAccount: 'Create Account',
          or: 'OR'
        },
        sso: {
          azure: 'Sign In With Microsoft',
          google: 'Sign In With Google',
          auth0: 'Sign In With Auth0 by Okta',
          github: 'Sign In With Github'
        }
      },
      chatflows: {
        addNew: 'Add New',
        listView: 'List View',
        empty: 'No Chatflows Yet',
        title: 'Chatflows',
        description: 'Build single-agent systems, chatbots and simple LLM flows',
        searchPlaceholder: 'Search Name or Category',
        cardView: 'Card View'
      },
      tools: {
        title: 'Tools',
        description: 'External functions or APIs the agent can use to take action',
        searchPlaceholder: 'Search Tools',
        addNewTool: 'Add New Tool',
        editTool: 'Edit Tool',
        empty: 'No Tools Created Yet',
        noToolsYet: 'No Tools Created Yet',
        toolName: 'Tool Name',
        toolDescription: 'Tool description',
        toolIconSource: 'Tool Icon Source',
        inputSchema: 'Input Schema',
        javascriptFunction: 'Javascript Function',
        howToUseFunction: 'How to use Function',
        seeExample: 'See Example',
        pasteJSON: 'Paste JSON',
        addItem: 'Add Item',
        useTemplate: 'Use Template',
        export: 'Export',
        delete: 'Delete',
        toolNamePlaceholder: 'My New Tool',
        toolDescPlaceholder: 'Description of what the tool does. This is for ChatGPT to determine when to use this tool.',
        toolIconPlaceholder: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/airtable.svg',
        toolNameTooltip: 'Tool name must be small capital letter with underscore. Ex: my_tool',
        toolDescTooltip: 'Description of what the tool does. This is for ChatGPT to determine when to use this tool.',
        inputSchemaTooltip: 'What is the input format in JSON?',
        javascriptFunctionTooltip: 'Function to execute when tool is being used. You can use properties specified in Input Schema as variables. For example, if the property is userid, you can use as $userid. Return value must be a string.'
      },
      users: {
        title: 'User Management',
        description: 'Manage users and their permissions',
        searchPlaceholder: 'Search Users',
        inviteUser: 'Invite User',
        noUsersYet: 'No Users Yet',
        emailName: 'Email/Name',
        assignedRoles: 'Assigned Roles',
        status: 'Status',
        lastLogin: 'Last Login',
        role: 'Role',
        workspace: 'Workspace',
        cancel: 'Cancel',
        sendInvite: 'Send Invite',
        updateInvite: 'Update Invite',
        save: 'Save',
        inviteUsers: 'Invite Users',
        selectUsers: 'Select Users',
        selectWorkspace: 'Select Workspace',
        selectRole: 'Select Role',
        roleToAssign: 'Role to Assign'
      },
        serverLogs: {
            title: 'Logs',
            timeRanges: {
                lastHour: 'Last hour',
                last4Hours: 'Last 4 hours',
                last24Hours: 'Last 24 hours',
                last2Days: 'Last 2 days',
                last7Days: 'Last 7 days',
                last14Days: 'Last 14 days',
                last1Month: 'Last 1 month',
                last2Months: 'Last 2 months',
                last3Months: 'Last 3 months',
                custom: 'Custom'
            },
            dateLabels: {
                from: 'From',
                to: 'To'
            },
            emptyState: 'No Logs Yet'
        },
        workspaceUsers: {
            title: 'Workspace Users',
        description: 'Manage workspace users and roles',
        searchPlaceholder: 'Search Users',
        addUser: 'Add User',
        removeUsers: 'Remove Users',
        noAssignedUsers: 'No Assigned Users Yet',
        emailName: 'Email/Name',
        role: 'Role',
        status: 'Status',
        lastLogin: 'Last Login',
        cancel: 'Cancel',
        sendInvite: 'Send Invite',
        updateInvite: 'Update Invite',
        updateRole: 'Update Role',
        organizationOwnerCannotRemove: 'Organization owner cannot be removed from workspace.',
        usersRemovedFromWorkspace: 'User(s) removed from workspace.',
        failedToUnlinkUsers: 'Failed to unlink users:',
        organizationOwner: 'ORGANIZATION OWNER',
        active: 'ACTIVE',
        invited: 'INVITED',
        inactive: 'INACTIVE',
        never: 'Never',
        edit: 'Edit',
        changeRole: 'Change Role',
        changeWorkspaceRole: 'Change Workspace Role - ',
        newRoleToAssign: 'New Role to Assign',
        selectRole: 'Select Role',
        workspaceUserDetailsUpdated: 'Workspace User Details Updated',
        failedToUpdateWorkspaceUser: 'Failed to update Workspace User:'
      },
      workspaceUsers: {
        title: 'Workspace Users',
        description: 'Manage workspace users and roles',
        searchPlaceholder: 'Search Users',
        addUser: 'Add User',
        removeUsers: 'Remove Users',
        noAssignedUsers: 'No Assigned Users Yet',
        emailName: 'Email/Name',
        role: 'Role',
        status: 'Status',
        lastLogin: 'Last Login',
        cancel: 'Cancel',
        sendInvite: 'Send Invite',
        updateInvite: 'Update Invite',
        updateRole: 'Update Role',
        organizationOwnerCannotRemove: 'Organization owner cannot be removed from workspace.',
        usersRemovedFromWorkspace: 'User(s) removed from workspace.',
        failedToUnlinkUsers: 'Failed to unlink users:',
        organizationOwner: 'ORGANIZATION OWNER',
        active: 'ACTIVE',
        invited: 'INVITED',
        inactive: 'INACTIVE',
        never: 'Never',
        edit: 'Edit',
        changeRole: 'Change Role',
        changeWorkspaceRole: 'Change Workspace Role - ',
        newRoleToAssign: 'New Role to Assign',
        selectRole: 'Select Role',
        workspaceUserDetailsUpdated: 'Workspace User Details Updated',
        failedToUpdateWorkspaceUser: 'Failed to update Workspace User:'
      },
      datasets: {
        title: 'Datasets',
        addNew: 'Add New',
        empty: 'No Datasets Yet',
        searchPlaceholder: 'Search Name',
        edit: 'Edit',
        delete: 'Delete',
        deleted: 'Dataset deleted',
        deleteFailed: 'Failed to delete dataset',
        created: 'New Dataset added',
        createFailed: 'Failed to add new Dataset',
        saved: 'Dataset saved',
        saveFailed: 'Failed to save Dataset',
        addDataset: 'Add Dataset',
        editDataset: 'Edit Dataset',
        uploadCsv: 'Upload CSV',
        firstRowHeaders: 'Treat First Row as headers in the upload file?'
      },
      docstore: {
        title: 'Document Store',
        description: 'Store and upsert documents for LLM retrieval (RAG)',
        addNew: 'Add New',
        addNewTitle: 'Add New Document Store',
        empty: 'No Document Stores Created Yet',
        searchPlaceholder: 'Search Name',
        created: 'New Document Store created.',
        createFailed: 'Failed to add new Document Store',
        updated: 'Document Store Updated!',
        updateFailed: 'Failed to update Document Store',
        refreshDocStore: 'Refresh Document Store',
        addDocumentLoader: 'Add Document Loader',
        moreActions: 'More Actions',
        viewEditChunks: 'View & Edit Chunks',
        upsertAllChunks: 'Upsert All Chunks',
        retrievalQuery: 'Retrieval Query',
        refresh: 'Refresh',
        refreshTooltip: 'Re-process all loaders and upsert all chunks',
        delete: 'Delete',
        chatflowsUsed: 'Chatflows Used:',
        noDocumentAdded: 'No Document Added Yet',
        tableHeaders: {
          loader: 'Loader',
          splitter: 'Splitter',
          sources: 'Source(s)',
          chunks: 'Chunks',
          chars: 'Chars',
          actions: 'Actions'
        },
        notifications: {
          storeDeleted: 'Store, Loader and associated document chunks deleted',
          storeDeleteFailed: 'Failed to delete Document Store',
          loaderDeleted: 'Loader and associated document chunks deleted',
          loaderDeleteFailed: 'Failed to delete Loader',
          selectDocumentLoader: 'Select Document Loader'
        },
        pendingProcessing: 'Some files are pending processing. Please Refresh to get the latest status.',
        none: 'None',
        noSource: 'No source',
        options: 'Options',
        previewProcess: 'Preview & Process',
        upsertChunks: 'Upsert Chunks',
        viewAPI: 'View API',
        loader: 'Loader',
        splitter: 'Splitter',
        sources: 'Source(s)',
        chunks: 'Chunks',
        chars: 'Chars',
        actions: 'Actions'
      },
      common: {
        language: 'Language',
        english: 'English',
        spanish: 'Spanish',
        create: 'Create',
        load: 'Load',
        cancel: 'Cancel',
        save: 'Save',
        add: 'Add',
        name: 'Name',
        description: 'Description',
        rows: 'Rows',
        lastUpdated: 'Last Updated',
        delete: 'Delete',
        edit: 'Edit',
        search: 'Search',
        clearSearch: 'Clear Search',
        new: 'NEW',
        cardView: 'Card View',
        listView: 'List View',
        addNew: 'Add New',
        back: 'Back'
      },
      agentflows: {
        title: 'Agentflows',
        description: 'Multi-agent systems, workflow orchestration',
        searchPlaceholder: 'Search Name or Category',
        v1: 'V1',
        v2: 'V2',
        deprecationNotice: 'V1 Agentflows are deprecated.',
        migrationRecommendation: 'We recommend migrating to V2 for improved performance and continued support.',
        noAgentsYet: 'No Agents Yet'
      },
      agentSettings: {
        viewMessages: 'View Messages',
        viewLeads: 'View Leads',
        configuration: 'Configuration',
        saveAsTemplate: 'Save As Template',
        duplicateAgents: 'Duplicate Agents',
        loadAgents: 'Load Agents',
        exportAgents: 'Export Agents',
        deleteAgents: 'Delete Agents'
      },
      agentflowGenerator: {
        generating: 'Generating your Agentflow...',
        placeholder: 'Describe your agent here',
        selectModel: 'Select model to generate agentflow',
        generate: 'Generate',
        examples: {
          webSearchReport: 'An agent that can autonomously search the web and generate report',
          summarizeDocument: 'Summarize a document',
          slackResponse: 'Generate response to user queries and send it to Slack',
          customerQueries: 'A team of agents that can handle all customer queries'
        }
      },
      variables: {
        title: 'Variables',
        description: 'Create and manage global variables',
        searchPlaceholder: 'Search Variables',
        howToUse: 'How To Use',
        addVariable: 'Add Variable',
        noVariables: 'No Variables Yet',
        name: 'Name',
        value: 'Value',
        type: 'Type',
        lastUpdated: 'Last Updated',
        created: 'Created',
        edit: 'Edit',
        delete: 'Delete',
        addVariableTitle: 'Add Variable',
        editVariableTitle: 'Edit Variable',
        variableName: 'Variable Name',
        variableType: 'Type',
        variableValue: 'Value',
        staticType: 'Static',
        runtimeType: 'Runtime',
        staticDescription: 'Variable value will be read from the value entered below',
        runtimeDescription: 'Variable value will be read from .env file',
        howToUseTitle: 'How To Use Variables',
        howToUseText1: 'Variables can be used in Custom Tool, Custom Function, Custom Loader, If Else Function with the $ prefix.',
        howToUseText2: 'Variables can also be used in Text Field parameter of any node. For example, in System Message of Agent:',
        howToUseText3: 'If variable type is Static, the value will be retrieved as it is. If variable type is Runtime, the value will be retrieved from .env file.',
        howToUseText4: 'You can also override variable values in API overrideConfig using',
        howToUseText5: 'Read more from',
        docs: 'docs',
        notifications: {
          variableAdded: 'New Variable added',
          variableSaved: 'Variable saved',
          variableAddFailed: 'Failed to add new Variable',
          variableSaveFailed: 'Failed to save Variable'
        }
      },
      apiKeys: {
        title: 'API Keys',
        description: 'Flowise API & SDK authentication keys',
        searchPlaceholder: 'Search API Keys',
        import: 'Import',
        createKey: 'Create Key',
        noApiKeys: 'No API Keys Yet',
        keyName: 'Key Name',
        apiKey: 'API Key',
        usage: 'Usage',
        updated: 'Updated',
        copy: 'Copy',
        show: 'Show',
        copied: 'Copied!',
        edit: 'Edit',
        delete: 'Delete',
        chatflowName: 'Chatflow Name',
        modifiedOn: 'Modified On',
        category: 'Category',
        keyNameLabel: 'Key Name',
        keyNamePlaceholder: 'My New Key',
        copyApiKey: 'Copy API Key',
        newApiKeyAdded: 'New API key added',
        failedToAddApiKey: 'Failed to add new API key',
        apiKeySaved: 'API Key saved',
        failedToSaveApiKey: 'Failed to save API key'
      },
      marketplaces: {
        title: 'Marketplace',
        description: 'Explore and use pre-built templates',
        searchPlaceholder: 'Search Name/Description/Node',
        filters: {
          tag: 'Tag',
          type: 'Type',
          framework: 'Framework'
        },
        tabs: {
          communityTemplates: 'Community Templates',
          myTemplates: 'My Templates'
        },
        views: {
          cardView: 'Card View',
          listView: 'List View'
        },
        badges: {
          popular: 'POPULAR',
          new: 'NEW'
        },
        types: {
          chatflow: 'Chatflow',
          agentflowV2: 'AgentflowV2',
          tool: 'Tool'
        },
        frameworks: {
          langchain: 'Langchain',
          llamaIndex: 'LlamaIndex'
        },
        messages: {
          noMarketplace: 'No Marketplace Yet',
          noCustomTemplates: 'No Saved Custom Templates'
        }
      },
      evaluations: {
        title: 'Evaluations',
        buttons: {
          newEvaluation: 'New Evaluation',
          delete: 'Delete',
          cancel: 'Cancel',
          startNewEvaluation: 'Start New Evaluation',
          refresh: 'Refresh',
          viewResults: 'View Results'
        },
        tableHeaders: {
          name: 'Name',
          latestVersion: 'Latest Version',
          averageMetrics: 'Average Metrics',
          lastEvaluated: 'Last Evaluated',
          flows: 'Flow(s)',
          dataset: 'Dataset',
          version: 'Version',
          lastRun: 'Last Run',
          status: 'Status'
        },
        childTableHeaders: {
          version: 'Version',
          lastRun: 'Last Run',
          averageMetrics: 'Average Metrics',
          status: 'Status'
        },
        metrics: {
          totalRuns: 'Total Runs',
          avgLatency: 'Avg Latency',
          passRate: 'Pass Rate',
          passRateChild: 'Pass rate',
          notAvailable: 'N/A'
        },
        confirmDialog: {
          deleteEvaluations: 'This will delete all versions of the evaluation.',
          deleteEvaluation: 'evaluation',
          deleteEvaluationsPlural: 'evaluations'
        },
        messages: {
          evaluationsDeleted: 'evaluations deleted',
          evaluationDeleted: 'evaluation deleted',
          failedToDeleteEvaluations: 'Failed to delete evaluations',
          failedToDeleteEvaluation: 'Failed to delete evaluation',
          failedToDeleteEvaluationSingle: 'Failed to delete Evaluation'
        },
        emptyState: 'No Evaluations Yet',
        autoRefresh: {
          disable: 'Disable auto-refresh',
          enable: 'Enable auto-refresh (every 5s)'
        }
      }
    }
  },
  es: {
    translation: {
      landing: {
        hero: {
          title: 'Crea, evalúa y despliega agentes de IA de forma visual',
          subtitle: 'Freia reúne chatflows, agentes, datasets, evaluaciones, almacenes vectoriales, herramientas y más en una sola interfaz.',
          ctaGetStarted: 'Comenzar',
          ctaCreateAccount: 'Crear una cuenta'
        },
        features: {
          visualChatflows: {
            title: 'Chatflows visuales',
            desc: 'Diseña flujos de trabajo de IA complejos con nodos y conectores de arrastrar y soltar.'
          },
          agentsTools: {
            title: 'Agentes y herramientas',
            desc: 'Compón agentes con múltiples herramientas y gestiona fácilmente las trazas de ejecución.'
          },
        	datasetsEvals: {
            title: 'Datasets y evaluaciones',
            desc: 'Crea datasets y ejecuta evaluaciones para medir calidad y rendimiento.'
          },
          vectorStores: {
            title: 'Almacenes vectoriales',
            desc: 'Indexa y consulta documentos usando backends vectoriales conectables.'
          },
          secureAuth: {
            title: 'Autenticación segura',
            desc: 'Autenticación lista para organizaciones con roles, SSO, claves API y auditorías.'
          },
          deployAnywhere: {
            title: 'Implementa en cualquier lugar',
            desc: 'Ejecuta localmente o en la nube. Arquitectura amigable con el código abierto.'
          }
        },
        cta: {
          title: '¿Listo para explorar Freia?',
          subtitle: 'Inicia sesión para empezar a crear chatflows, conectar herramientas y evaluar tus casos de uso de IA.',
          goToSignin: 'Ir a Iniciar sesión'
        }
      },
      auth: {
        signin: {
          title: 'Iniciar sesión',
          noAccount: '¿No tienes una cuenta?',
          signUpForFree: 'Regístrate gratis',
          haveInvite: '¿Tienes un código de invitación?',
          signUpForAccount: 'Crear una cuenta',
          email: 'Correo electrónico',
          password: 'Contraseña',
          forgotPassword: '¿Olvidaste tu contraseña?',
          migrateExisting: '¿Migrar desde una cuenta existente?',
          login: 'Acceder',
          or: 'O',
          resendVerification: 'Reenviar correo de verificación',
          verificationSent: 'El correo de verificación se ha enviado correctamente.'
        },
        register: {
          title: 'Regístrate',
          alreadyHaveAccount: '¿Ya tienes una cuenta?',
          displayName: 'Nombre para mostrar',
          displayNameHint: 'Se utiliza solo con fines de visualización.',
          email: 'Correo electrónico',
          emailHint: 'Usa un correo válido. Se utilizará como tu ID de inicio de sesión.',
          inviteCode: 'Código de invitación',
          invitePlaceholder: 'Pega el código de invitación.',
          inviteHint: 'Copia el token que recibiste en tu correo.',
          password: 'Contraseña',
          passwordHint: 'La contraseña debe tener al menos 8 caracteres e incluir una minúscula, una mayúscula, un dígito y un carácter especial.',
          confirmPassword: 'Confirmar contraseña',
          confirmPasswordHint: 'Debe coincidir con la contraseña anterior.',
          createAccount: 'Crear cuenta',
          or: 'O'
        },
        sso: {
          azure: 'Iniciar sesión con Microsoft',
          google: 'Iniciar sesión con Google',
          auth0: 'Iniciar sesión con Auth0 de Okta',
          github: 'Iniciar sesión con Github'
        }
      },
      chatflows: {
        addNew: 'Crear nuevo',
        listView: 'Vista de lista',
        empty: 'Aún no hay Chatflows',
        title: 'Flujos de chat',
        description: 'Crea sistemas de un solo agente, chatbots y flujos LLM simples',
        searchPlaceholder: 'Buscar Nombre o Categoría',
        cardView: 'Vista de tarjetas'
      },
      tools: {
        title: 'Herramientas',
        description: 'Funciones externas o APIs que el agente puede usar para actuar',
        searchPlaceholder: 'Buscar herramientas',
        addNewTool: 'Agregar nueva herramienta',
        editTool: 'Editar herramienta',
        empty: 'Aún no hay herramientas creadas',
        noToolsYet: 'Aún No Se Han Creado Herramientas',
        toolName: 'Nombre de la Herramienta',
        toolDescription: 'Descripción de la herramienta',
        toolIconSource: 'Fuente del Icono de la Herramienta',
        inputSchema: 'Esquema de Entrada',
        javascriptFunction: 'Función JavaScript',
        howToUseFunction: 'Cómo usar la Función',
        seeExample: 'Ver Ejemplo',
        pasteJSON: 'Pegar JSON',
        addItem: 'Agregar Elemento',
        useTemplate: 'Usar Plantilla',
        export: 'Exportar',
        delete: 'Eliminar',
        toolNamePlaceholder: 'Mi Nueva Herramienta',
        toolDescPlaceholder: 'Descripción de lo que hace la herramienta. Esto es para que ChatGPT determine cuándo usar esta herramienta.',
        toolIconPlaceholder: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/airtable.svg',
        toolNameTooltip: 'El nombre de la herramienta debe ser en minúsculas con guión bajo. Ej: mi_herramienta',
        toolDescTooltip: 'Descripción de lo que hace la herramienta. Esto es para que ChatGPT determine cuándo usar esta herramienta.',
        inputSchemaTooltip: '¿Cuál es el formato de entrada en JSON?',
        javascriptFunctionTooltip: 'Función a ejecutar cuando se usa la herramienta. Puedes usar propiedades especificadas en el Esquema de Entrada como variables. Por ejemplo, si la propiedad es userid, puedes usar como $userid. El valor de retorno debe ser una cadena.'
      },
      users: {
        title: 'Gestión de Usuarios',
        description: 'Gestionar usuarios y sus permisos',
        searchPlaceholder: 'Buscar Usuarios',
        inviteUser: 'Invitar Usuario',
        noUsersYet: 'Aún No Hay Usuarios',
        emailName: 'Email/Nombre',
        assignedRoles: 'Roles Asignados',
        status: 'Estado',
        lastLogin: 'Último Acceso',
        role: 'Rol',
        workspace: 'Espacio de Trabajo',
        cancel: 'Cancelar',
        sendInvite: 'Enviar Invitación',
        updateInvite: 'Actualizar Invitación',
        save: 'Guardar',
        inviteUsers: 'Invitar Usuarios',
        selectUsers: 'Seleccionar Usuarios',
        selectWorkspace: 'Seleccionar Espacio de Trabajo',
        selectRole: 'Seleccionar Rol',
        roleToAssign: 'Rol a Asignar'
      },
        serverLogs: {
            title: 'Registros',
            timeRanges: {
                lastHour: 'Última hora',
                last4Hours: 'Últimas 4 horas',
                last24Hours: 'Últimas 24 horas',
                last2Days: 'Últimos 2 días',
                last7Days: 'Últimos 7 días',
                last14Days: 'Últimos 14 días',
                last1Month: 'Último mes',
                last2Months: 'Últimos 2 meses',
                last3Months: 'Últimos 3 meses',
                custom: 'Personalizado'
            },
            dateLabels: {
                from: 'Desde',
                to: 'Hasta'
            },
            emptyState: 'Aún no hay registros'
        },
        workspaceUsers: {
            title: 'Usuarios del Espacio de Trabajo',
        description: 'Gestionar usuarios y roles del espacio de trabajo',
        searchPlaceholder: 'Buscar Usuarios',
        addUser: 'Agregar Usuario',
        removeUsers: 'Eliminar Usuarios',
        noAssignedUsers: 'Aún No Hay Usuarios Asignados',
        emailName: 'Email/Nombre',
        role: 'Rol',
        status: 'Estado',
        lastLogin: 'Último Acceso',
        cancel: 'Cancelar',
        sendInvite: 'Enviar Invitación',
        updateInvite: 'Actualizar Invitación',
        updateRole: 'Actualizar Rol',
        organizationOwnerCannotRemove: 'El propietario de la organización no puede ser eliminado del espacio de trabajo.',
        usersRemovedFromWorkspace: 'Usuario(s) eliminado(s) del espacio de trabajo.',
        failedToUnlinkUsers: 'Error al desvincular usuarios:',
        organizationOwner: 'PROPIETARIO DE LA ORGANIZACIÓN',
        active: 'ACTIVO',
        invited: 'INVITADO',
        inactive: 'INACTIVO',
        never: 'Nunca',
        edit: 'Editar',
        changeRole: 'Cambiar Rol',
        changeWorkspaceRole: 'Cambiar Rol del Espacio de Trabajo - ',
        newRoleToAssign: 'Nuevo Rol a Asignar',
        selectRole: 'Seleccionar Rol',
        workspaceUserDetailsUpdated: 'Detalles del Usuario del Espacio de Trabajo Actualizados',
        failedToUpdateWorkspaceUser: 'Error al actualizar Usuario del Espacio de Trabajo:'
      },
      datasets: {
        title: 'Datasets',
        addNew: 'Agregar nuevo',
        empty: 'Aún no hay datasets',
        searchPlaceholder: 'Buscar nombre',
        edit: 'Editar',
        delete: 'Eliminar',
        deleted: 'Dataset eliminado',
        deleteFailed: 'Error al eliminar dataset',
        created: 'Nuevo Dataset agregado',
        createFailed: 'Error al agregar nuevo Dataset',
        saved: 'Dataset guardado',
        saveFailed: 'Error al guardar Dataset',
        addDataset: 'Agregar Dataset',
        editDataset: 'Editar Dataset',
        uploadCsv: 'Subir CSV',
        firstRowHeaders: '¿Tratar la primera fila como encabezados en el archivo subido?'
      },
      docstore: {
        title: 'Almacén de documentos',
        description: 'Almacena y actualiza documentos para recuperación por LLM (RAG)',
        addNew: 'Agregar nuevo',
        addNewTitle: 'Agregar nuevo almacén de documentos',
        empty: 'Aún no hay almacenes de documentos',
        searchPlaceholder: 'Buscar nombre',
        created: 'Nuevo almacén de documentos creado.',
        createFailed: 'Error al agregar nuevo almacén de documentos',
        updated: '¡Almacén de documentos actualizado!',
        updateFailed: 'Error al actualizar almacén de documentos',
        refreshDocStore: 'Actualizar almacén de documentos',
        addDocumentLoader: 'Agregar cargador de documentos',
        moreActions: 'Más acciones',
        viewEditChunks: 'Ver y editar fragmentos',
        upsertAllChunks: 'Insertar todos los fragmentos',
        retrievalQuery: 'Consulta de recuperación',
        refresh: 'Actualizar',
        refreshTooltip: 'Reprocesar todos los cargadores e insertar todos los fragmentos',
        delete: 'Eliminar',
        chatflowsUsed: 'Chatflows utilizados:',
        noDocumentAdded: 'Aún no se ha agregado ningún documento',
        tableHeaders: {
          loader: 'Cargador',
          splitter: 'Divisor',
          sources: 'Fuente(s)',
          chunks: 'Fragmentos',
          chars: 'Caracteres',
          actions: 'Acciones'
        },
        notifications: {
          storeDeleted: 'Almacén, cargador y fragmentos de documentos asociados eliminados',
          storeDeleteFailed: 'Error al eliminar almacén de documentos',
          loaderDeleted: 'Cargador y fragmentos de documentos asociados eliminados',
          loaderDeleteFailed: 'Error al eliminar cargador',
          selectDocumentLoader: 'Seleccionar cargador de documentos'
        },
        pendingProcessing: 'Algunos archivos están pendientes de procesamiento. Por favor actualiza para obtener el estado más reciente.',
        none: 'Ninguno',
        noSource: 'Sin fuente',
        options: 'Opciones',
        previewProcess: 'Vista previa y procesar',
        upsertChunks: 'Insertar fragmentos',
        viewAPI: 'Ver API',
        loader: 'Cargador',
        splitter: 'Divisor',
        sources: 'Fuente(s)',
        chunks: 'Fragmentos',
        chars: 'Caracteres',
        actions: 'Acciones'
      },
      common: {
        language: 'Idioma',
        english: 'Inglés',
        spanish: 'Español',
        create: 'Crear',
        load: 'Cargar',
        cancel: 'Cancelar',
        save: 'Guardar',
        add: 'Agregar',
        name: 'Nombre',
        description: 'Descripción',
        rows: 'Filas',
        lastUpdated: 'Última actualización',
        delete: 'Eliminar',
        edit: 'Editar',
        search: 'Buscar',
        clearSearch: 'Limpiar búsqueda',
        new: 'NUEVO',
        cardView: 'Vista de Tarjetas',
        listView: 'Vista de Lista',
        addNew: 'Agregar Nuevo',
        back: 'Atrás'
      },
      variables: {
        title: 'Variables',
        description: 'Crear y gestionar variables globales',
        searchPlaceholder: 'Buscar Variables',
        howToUse: 'Cómo Usar',
        addVariable: 'Agregar Variable',
        noVariables: 'Aún No Hay Variables',
        name: 'Nombre',
        value: 'Valor',
        type: 'Tipo',
        lastUpdated: 'Última Actualización',
        created: 'Creado',
        edit: 'Editar',
        delete: 'Eliminar',
        addVariableTitle: 'Agregar Variable',
        editVariableTitle: 'Editar Variable',
        variableName: 'Nombre de Variable',
        variableType: 'Tipo',
        variableValue: 'Valor',
        staticType: 'Estático',
        runtimeType: 'Tiempo de Ejecución',
        staticDescription: 'El valor de la variable se leerá del valor ingresado a continuación',
        runtimeDescription: 'El valor de la variable se leerá del archivo .env',
        howToUseTitle: 'Cómo Usar Variables',
        howToUseText1: 'Las variables se pueden usar en Herramienta Personalizada, Función Personalizada, Cargador Personalizado, Función If Else con el prefijo $.',
        howToUseText2: 'Las variables también se pueden usar en el parámetro Campo de Texto de cualquier nodo. Por ejemplo, en Mensaje del Sistema del Agente:',
        howToUseText3: 'Si el tipo de variable es Estático, el valor se recuperará tal como está. Si el tipo de variable es Tiempo de Ejecución, el valor se recuperará del archivo .env.',
        howToUseText4: 'También puedes sobrescribir valores de variables en API overrideConfig usando',
        howToUseText5: 'Lee más en',
        docs: 'documentación',
        notifications: {
          variableAdded: 'Nueva Variable agregada',
          variableSaved: 'Variable guardada',
          variableAddFailed: 'Error al agregar nueva Variable',
          variableSaveFailed: 'Error al guardar Variable'
        }
      },
      apiKeys: {
        title: 'Claves API',
        description: 'Claves de autenticación de Flowise API y SDK',
        searchPlaceholder: 'Buscar Claves API',
        import: 'Importar',
        createKey: 'Crear Clave',
        noApiKeys: 'Aún No Hay Claves API',
        keyName: 'Nombre de Clave',
        apiKey: 'Clave API',
        usage: 'Uso',
        updated: 'Actualizado',
        copy: 'Copiar',
        show: 'Mostrar',
        copied: '¡Copiado!',
        edit: 'Editar',
        delete: 'Eliminar',
        chatflowName: 'Nombre del Chatflow',
        modifiedOn: 'Modificado el',
        category: 'Categoría',
        keyNameLabel: 'Nombre de Clave',
        keyNamePlaceholder: 'Mi Nueva Clave',
        copyApiKey: 'Copiar Clave API',
        newApiKeyAdded: 'Nueva clave API agregada',
        failedToAddApiKey: 'Error al agregar nueva clave API',
        apiKeySaved: 'Clave API guardada',
        failedToSaveApiKey: 'Error al guardar clave API'
      },
      marketplaces: {
        title: 'Mercado',
        description: 'Explora y usa plantillas prediseñadas',
        searchPlaceholder: 'Buscar Nombre/Descripción/Nodo',
        filters: {
          tag: 'Etiqueta',
          type: 'Tipo',
          framework: 'Framework'
        },
        tabs: {
          communityTemplates: 'Plantillas de la Comunidad',
          myTemplates: 'Mis Plantillas'
        },
        views: {
          cardView: 'Vista de Tarjetas',
          listView: 'Vista de Lista'
        },
        badges: {
          popular: 'POPULAR',
          new: 'NUEVO'
        },
        types: {
          chatflow: 'Chatflow',
          agentflowV2: 'AgentflowV2',
          tool: 'Herramienta'
        },
        frameworks: {
          langchain: 'Langchain',
          llamaIndex: 'LlamaIndex'
        },
        messages: {
          noMarketplace: 'Aún no hay Mercado',
          noCustomTemplates: 'No hay Plantillas Personalizadas Guardadas'
        }
      },
      agentflows: {
        title: 'Flujos de Agentes',
        description: 'Sistemas multi-agente, orquestación de flujos de trabajo',
        searchPlaceholder: 'Buscar Nombre o Categoría',
        v1: 'V1',
        v2: 'V2',
        deprecationNotice: 'Los Flujos de Agentes V1 están obsoletos.',
        migrationRecommendation: 'Recomendamos migrar a V2 para mejorar el rendimiento y soporte continuo.',
        noAgentsYet: 'Aún No Hay Agentes'
      },
      agentSettings: {
        viewMessages: 'Ver Mensajes',
        viewLeads: 'Ver Clientes Potenciales',
        configuration: 'Configuración',
        saveAsTemplate: 'Guardar como Plantilla',
        duplicateAgents: 'Duplicar Agentes',
        loadAgents: 'Cargar Agentes',
        exportAgents: 'Exportar Agentes',
        deleteAgents: 'Eliminar Agentes'
      },
      agentflowGenerator: {
        generating: 'Generando tu Agentflow...',
        placeholder: 'Describe tu agente aquí',
        selectModel: 'Selecciona modelo para generar agentflow',
        generate: 'Generar',
        examples: {
          webSearchReport: 'Un agente que puede buscar autónomamente en la web y generar reportes',
          summarizeDocument: 'Resumir un documento',
          slackResponse: 'Generar respuesta a consultas de usuarios y enviarla a Slack',
          customerQueries: 'Un equipo de agentes que puede manejar todas las consultas de clientes'
        }
      },
      evaluations: {
        title: 'Evaluaciones',
        buttons: {
          newEvaluation: 'Nueva Evaluación',
          delete: 'Eliminar',
          cancel: 'Cancelar',
          startNewEvaluation: 'Iniciar Nueva Evaluación',
          refresh: 'Actualizar',
          viewResults: 'Ver Resultados'
        },
        tableHeaders: {
          name: 'Nombre',
          latestVersion: 'Última Versión',
          averageMetrics: 'Métricas Promedio',
          lastEvaluated: 'Última Evaluación',
          flows: 'Flujo(s)',
          dataset: 'Dataset',
          version: 'Versión',
          lastRun: 'Última Ejecución',
          status: 'Estado'
        },
        childTableHeaders: {
          version: 'Versión',
          lastRun: 'Última Ejecución',
          averageMetrics: 'Métricas Promedio',
          status: 'Estado'
        },
        metrics: {
          totalRuns: 'Ejecuciones Totales',
          avgLatency: 'Latencia Promedio',
          passRate: 'Tasa de Éxito',
          passRateChild: 'Tasa de éxito',
          notAvailable: 'N/D'
        },
        confirmDialog: {
          deleteEvaluations: 'Esto eliminará todas las versiones de la evaluación.',
          deleteEvaluation: 'evaluación',
          deleteEvaluationsPlural: 'evaluaciones'
        },
        messages: {
          evaluationsDeleted: 'evaluaciones eliminadas',
          evaluationDeleted: 'evaluación eliminada',
          failedToDeleteEvaluations: 'Error al eliminar evaluaciones',
          failedToDeleteEvaluation: 'Error al eliminar evaluación',
          failedToDeleteEvaluationSingle: 'Error al eliminar Evaluación'
        },
        emptyState: 'Aún No Hay Evaluaciones',
        autoRefresh: {
          disable: 'Desactivar actualización automática',
          enable: 'Activar actualización automática (cada 5s)'
        }
      }
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: savedLng || (typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n