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
        empty: 'No Tools Created Yet'
      },
      datasets: {
        title: 'Datasets',
        addNew: 'Add New',
        empty: 'No Datasets Yet',
        searchPlaceholder: 'Search Name'
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
        updateFailed: 'Failed to update Document Store'
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
        empty: 'Aún no hay herramientas creadas'
      },
      datasets: {
        title: 'Datasets',
        addNew: 'Agregar nuevo',
        empty: 'Aún no hay datasets',
        searchPlaceholder: 'Buscar nombre'
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
        updateFailed: 'Error al actualizar almacén de documentos'
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