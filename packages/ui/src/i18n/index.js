// Simple i18n system for Brazilian Portuguese translation
const translations = {
    'pt-BR': {
        // Navigation and Menu Items
        'menu.chatflows': 'Fluxos de Chat',
        'menu.agentflows': 'Fluxos de Agente',
        'menu.executions': 'Execuções',
        'menu.assistants': 'Assistentes',
        'menu.marketplaces': 'Mercados',
        'menu.tools': 'Ferramentas',
        'menu.credentials': 'Credenciais',
        'menu.variables': 'Variáveis',
        'menu.apiKeys': 'Chaves de API',
        'menu.documentStores': 'Armazenamentos de Documentos',
        'menu.evaluations': 'Avaliações',
        'menu.datasets': 'Conjuntos de Dados',
        'menu.evaluators': 'Avaliadores',
        'menu.settings': 'Configurações',
        'menu.users': 'Usuários',
        'menu.roles': 'Funções',
        'menu.workspaces': 'Espaços de Trabalho',
        'menu.loginActivity': 'Atividade de Login',
        'menu.others': 'Outros',
        'menu.files': 'Arquivos',

        // Common UI Actions
        'common.search': 'Pesquisar',
        'common.searchPlaceholder': 'Pesquisar',
        'common.save': 'Salvar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Excluir',
        'common.edit': 'Editar',
        'common.add': 'Adicionar',
        'common.yes': 'Sim',
        'common.no': 'Não',
        'common.ok': 'OK',
        'common.close': 'Fechar',
        'common.back': 'Voltar',
        'common.next': 'Próximo',
        'common.previous': 'Anterior',
        'common.loading': 'Carregando...',
        'common.retry': 'Tentar Novamente',
        
        // Users
        'users.title': 'Usuários',
        'users.noUsersYet': 'Nenhum Usuário Ainda',
        'users.editUser': 'Editar Usuário',
        'users.emailName': 'Email/Nome',
        'users.assignedRoles': 'Funções Atribuídas',
        'users.status': 'Status',
        'users.lastLogin': 'Último Login',
        'users.role': 'Função',
        'users.workspace': 'Espaço de Trabalho',
        
        // Files
        'files.title': 'Arquivos',
        'files.noFilesYet': 'Nenhum Arquivo Ainda',
        'files.searchFile': 'Pesquisar Arquivo',
        
        // Common Empty States
        'empty.noDataYet': 'Nenhum Dado Ainda',
        'empty.noItemsYet': 'Nenhum Item Ainda',
        
        // Assistant Menu Items
        'assistant.viewMessages': 'Ver Mensagens',
        'assistant.viewLeads': 'Ver Leads',
        'assistant.configuration': 'Configuração',
        'assistant.deleteAssistant': 'Excluir Assistente',
        
        // Settings
        'settings.general': 'Geral',
        'settings.appearance': 'Aparência',
        'settings.security': 'Segurança',
        'settings.integrations': 'Integrações',
        
        // Page Titles and Meta
        'page.title': 'Flowise - Construa Agentes de IA, Visualmente',
        'page.description': 'Plataforma de desenvolvimento de IA generativa de código aberto para construir agentes de IA, orquestração de LLM e muito mais',
        'page.keywords': 'react, material-ui, automação de fluxo de trabalho, llm, inteligência-artificial',
        'page.noScriptMessage': 'Você precisa habilitar o JavaScript para executar este aplicativo.',
        
        // Status
        'status.active': 'Ativo',
        'status.inactive': 'Inativo',
        'status.pending': 'Pendente',
        'status.completed': 'Concluído',
        'status.failed': 'Falhou',
        
        // Actions
        'action.create': 'Criar',
        'action.update': 'Atualizar',
        'action.remove': 'Remover',
        'action.copy': 'Copiar',
        'action.export': 'Exportar',
        'action.import': 'Importar',
        'action.download': 'Baixar',
        'action.upload': 'Enviar',
        'action.configure': 'Configurar',
        'action.test': 'Testar',
        'action.run': 'Executar',
        'action.stop': 'Parar',
        'action.pause': 'Pausar',
        'action.resume': 'Retomar',
        'action.deploy': 'Implantar',
        'action.view': 'Visualizar',
        'action.preview': 'Prévia',
        'action.duplicate': 'Duplicar',
        'action.share': 'Compartilhar',
        'action.publish': 'Publicar',
        
        // Validation and Error Messages
        'error.required': 'Este campo é obrigatório',
        'error.invalid': 'Valor inválido',
        'error.notFound': 'Não encontrado',
        'error.unauthorized': 'Não autorizado',
        'error.serverError': 'Erro do servidor',
        'error.networkError': 'Erro de rede',
        'error.tryAgain': 'Tente novamente',
        
        // Success Messages
        'success.saved': 'Salvo com sucesso',
        'success.deleted': 'Excluído com sucesso',
        'success.created': 'Criado com sucesso',
        'success.updated': 'Atualizado com sucesso',
        'success.deployed': 'Implantado com sucesso',
        'success.published': 'Publicado com sucesso'
    }
}

// Get current language (for now, default to pt-BR)
const getCurrentLanguage = () => {
    // For now, always return pt-BR. In the future, this could check
    // localStorage, user preferences, or browser language
    return 'pt-BR'
}

// Simple translation function
export const t = (key, defaultValue = key) => {
    const lang = getCurrentLanguage()
    const langTranslations = translations[lang]
    
    if (!langTranslations) {
        return defaultValue
    }
    
    // Support nested keys like 'menu.chatflows'
    const keys = key.split('.')
    let value = langTranslations
    
    for (const k of keys) {
        if (value && typeof value === 'object' && value[k] !== undefined) {
            value = value[k]
        } else {
            return defaultValue
        }
    }
    
    return typeof value === 'string' ? value : defaultValue
}

// Export all translations for debugging
export { translations }

export default t