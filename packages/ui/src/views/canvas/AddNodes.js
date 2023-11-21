import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    ClickAwayListener,
    Divider,
    InputAdornment,
    List,
    ListItemButton,
    ListItem,
    ListItemAvatar,
    ListItemText,
    OutlinedInput,
    Paper,
    Popper,
    Stack,
    Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import Transitions from 'ui-component/extended/Transitions'
import { StyledFab } from 'ui-component/button/StyledFab'

// icons
import { IconPlus, IconSearch, IconMinus, IconX } from '@tabler/icons'

// const
import { baseURL } from 'store/constant'
import { SET_COMPONENT_NODES } from 'store/actions'

// ==============================|| ADD NODES||============================== //
const translationsNodesDescription = {
    'Airtable Agent': 'Агент для ответов на запросы в таблице Airtable',
    AutoGPT: 'Автономный агент с цепочкой мыслей для самостоятельного выполнения задач',
    BabyAGI: 'Задачный автономный агент, создающий новые задачи и переупорядочивающий список задач в соответствии с поставленными целями',
    'CSV Agent': 'Агент для ответов на запросы в данных CSV',
    'Conversational Agent': 'Разговорный агент для модели чата. Будет использовать чат-специфические подсказки',
    'Conversational Retrieval Agent':
        'Агент, оптимизированный для извлечения в ходе разговора с использованием функциональных вызовов OpenAI',
    'MRKL Agent for Chat Models':
        'Агент, использующий фреймворк ReAct для принятия решений о том, какое действие предпринять, оптимизирован для использования с моделями чата',
    'MRKL Agent for LLMs':
        'Агент, использующий фреймворк ReAct для принятия решений о том, какое действие предпринять, оптимизирован для использования с LLMs',
    'OpenAI Assistant': 'Агент, использующий API OpenAI Assistant для выбора инструмента и аргументов для вызова',
    'OpenAI Function Agent': 'Агент, использующий функциональность OpenAI Function Calling для выбора инструмента и аргументов для вызова',
    'InMemory Cache': 'Кэширование ответа LLM в памяти, будет очищено при перезапуске приложения',
    'InMemory Embedding Cache': 'Кэширование созданных вложений в памяти, чтобы избежать необходимости их повторного вычисления',
    'Momento Cache': 'Кэширование ответа LLM с использованием Momento, распределенного, бессерверного кэша',
    'Redis Cache': 'Кэширование ответа LLM в Redis, полезно для обмена кэшем между несколькими процессами или серверами',
    'Redis Embeddings Cache': 'Кэширование созданных вложений в Redis, чтобы избежать необходимости их повторного вычисления',
    'Upstash Redis Cache': 'Кэширование ответа LLM в Upstash Redis, бессерверные данные для Redis и Kafka',
    'GET API Chain': 'Цепочка для выполнения запросов к API GET',
    'OpenAPI Chain': 'Цепочка, автоматически выбирающая и вызывающая API только на основе спецификации OpenAPI',
    'POST API Chain': 'Цепочка для выполнения запросов к API POST',
    'Conversation Chain': 'Цепочка для разговорных моделей с памятью',
    'Conversational Retrieval QA Chain':
        'Цепочка вопросно-ответного извлечения с использованием RetrievalQAChain для предоставления компонента истории чата',
    'LLM Chain': 'Цепочка для выполнения запросов к LLMs',
    'Multi Prompt Chain': 'Цепочка автоматически выбирает подходящую подсказку из нескольких шаблонов',
    'Multi Retrieval QA Chain': 'QA-цепочка, автоматически выбирающая подходящее хранилище векторов из нескольких извлекателей',
    'Retrieval QA Chain': 'QA-цепочка для ответа на вопрос на основе извлеченных документов',
    'Sql Database Chain': 'Ответы на вопросы по базе данных SQL',
    'VectorDB QA Chain': 'QA-цепочка для векторных баз данных',
    'AWS Bedrock': 'Оболочка вокруг больших языковых моделей AWS Bedrock, использующих конечную точку чата',
    'Azure ChatOpenAI': 'Оболочка вокруг больших языковых моделей Azure OpenAI, использующих конечную точку чата',
    NIBittensorChat: 'Оболочка вокруг больших языковых моделей Bittensor subnet 1',
    ChatAnthropic: 'Оболочка вокруг больших языковых моделей ChatAnthropic, использующих конечную точку чата',
    ChatGooglePaLM: 'Оболочка вокруг больших языковых моделей Google MakerSuite PaLM с использованием конечной точки чата',
    ChatGoogleVertexAI: 'Оболочка вокруг больших языковых моделей VertexAI, использующих конечную точку чата',
    ChatHuggingFace: 'Оболочка вокруг больших языковых моделей HuggingFace',
    ChatLocalAI: 'Используйте локальные языковые модели, такие как llama.cpp, gpt4all, используя LocalAI',
    ChatOllama: 'Завершение чата с использованием открытой модели LLM на Ollama',
    ChatOpenAI: 'Оболочка вокруг больших языковых моделей OpenAI, использующих конечную точку чата',
    'ChatOpenAI Custom': 'Пользовательская/подогнанная модель, использующая совместимый с OpenAI API чат',
    'API Loader': 'Загрузка данных из API',
    Airtable: 'Загрузка данных из таблицы Airtable',
    'Apify Website Content Crawler': 'Загрузка данных из Apify Website Content Crawler',
    'Cheerio Web Scraper': 'Загрузка данных с веб-страниц',
    Confluence: 'Загрузка данных из документа Confluence',
    'Csv File': 'Загрузка данных из CSV-файлов',
    'Docx File': 'Загрузка данных из DOCX-файлов',
    Figma: 'Загрузка данных из файла Figma',
    'Folder with Files': 'Загрузка данных из папки с несколькими файлами',
    GitBook: 'Загрузка данных из GitBook',
    Github: 'Загрузка данных из репозитория GitHub',
    'Json File': 'Загрузка данных из JSON-файлов',
    'Json Lines File': 'Загрузка данных из файлов JSON Lines',
    'Notion Database': 'Загрузка данных из базы данных Notion (каждая строка - отдельный документ со всеми свойствами в виде метаданных)',
    'Notion Folder': 'Загрузка данных из экспортированной и распакованной папки Notion',
    'Notion Page': 'Загрузка данных из страницы Notion (включая дочерние страницы, все в виде отдельных документов)',
    'Pdf File': 'Загрузка данных из PDF-файлов',
    'Plain Text': 'Загрузка данных из обычного текста',
    'Playwright Web Scraper': 'Загрузка данных с веб-страниц',
    'Puppeteer Web Scraper': 'Загрузка данных с веб-страниц',
    S3: 'Загрузка данных из бакетов S3',
    'SearchApi For Web Search': 'Загрузка данных из результатов поиска в реальном времени',
    'SerpApi For Web Search': 'Загрузка и обработка данных из результатов веб-поиска',
    'Subtitles File': 'Загрузка данных из файлов с субтитрами',
    'Text File': 'Загрузка данных из текстовых файлов',
    'Unstructured File Loader': 'Используйте Unstructured.io для загрузки данных из пути к файлу',
    'Unstructured Folder Loader': 'Используйте Unstructured.io для загрузки данных из папки',
    'VectorStore To Document': 'Поиск документов с баллами из векторного хранилища',
    'AWS Bedrock Embeddings': 'Модели вложения AWS Bedrock для генерации вложений для заданного текста',
    'Azure OpenAI Embeddings': 'API Azure OpenAI для генерации вложений для заданного текста',
    'Cohere Embeddings': 'API Cohere для генерации вложений для заданного текста',
    'Google PaLM Embeddings': 'API Google MakerSuite PaLM для генерации вложений для заданного текста',
    'GoogleVertexAI Embeddings': 'API Google VertexAI для генерации вложений для заданного текста',
    'HuggingFace Inference Embeddings': 'API HuggingFace Inference для генерации вложений для заданного текста',
    'LocalAI Embeddings': 'Используйте локальные модели вложения, такие как llama.cpp',
    'Ollama Embeddings': 'Генерация вложений для заданного текста с использованием открытой модели на Ollama',
    'OpenAI Embeddings': 'API OpenAI для генерации вложений для заданного текста',
    'OpenAI Embeddings Custom': 'API OpenAI для генерации вложений для заданного текста',
    'Azure OpenAI': 'Оболочка вокруг больших языковых моделей Azure OpenAI',
    NIBittensorLLM: 'Оболочка вокруг больших языковых моделей Bittensor subnet 1',
    Cohere: 'Оболочка вокруг больших языковых моделей Cohere',
    GooglePaLM: 'Оболочка вокруг больших языковых моделей Google MakerSuite PaLM',
    GoogleVertexAI: 'Оболочка вокруг больших языковых моделей GoogleVertexAI',
    'HuggingFace Inference': 'Оболочка вокруг больших языковых моделей HuggingFace',
    Ollama: 'Оболочка вокруг открытых исходных языковых моделей на Ollama',
    OpenAI: 'Оболочка вокруг больших языковых моделей OpenAI',
    Replicate: 'Используйте Replicate для выполнения моделей с открытым исходным кодом в облаке',
    'Buffer Memory': 'Запоминает предыдущие переписки напрямую',
    'Buffer Window Memory': 'Использует окно размером k для предоставления последних k обратных сообщений в качестве памяти',
    'Conversation Summary Memory': 'Суммирует разговор и сохраняет текущее краткое содержание в памяти',
    'DynamoDB Chat Memory': 'Сохраняет беседу в таблице DynamoDB',
    'Motorhead Memory': 'Используйте Motorhead Memory для хранения чатов',
    'Redis-Backed Chat Memory': 'Суммирует разговор и хранит память в сервере Redis',
    'Upstash Redis-Backed Chat Memory': 'Суммирует разговор и хранит память в сервере Upstash Redis',
    'Zep Memory': 'Суммирует разговор и хранит память в сервере Zep',
    'CSV Output Parser': 'Разбор вывода вызова LLM как списка значений, разделенных запятыми',
    'Custom List Output Parser': 'Разбор вывода вызова LLM как списка значений',
    'Structured Output Parser': 'Разбор вывода вызова LLM в заданную (JSON) структуру',
    'Chat Prompt Template': 'Схема для представления чат-промпта',
    'Few Shot Prompt Template': 'Шаблон запроса с несколькими примерами, который вы можете создать с примерами',
    'Prompt Template': 'Схема для представления основного запроса для языковой модели',
    'Hyde Retriever': 'Используйте HyDE retriever для извлечения из векторного хранилища',
    'Prompt Retriever': 'Храните шаблон запроса с именем и описанием для последующего запроса из MultiPromptChain',
    'Similarity Score Threshold Retriever': 'Верните результаты на основе минимального процента сходства',
    'Vector Store Retriever': 'Сохраните векторное хранилище как retriever для последующего запроса из MultiRetrievalQAChain',
    'Character Text Splitter': 'разбивает только по одному типу символа (по умолчанию "\\n\\n").',
    'Code Text Splitter': 'Разделяет документы на основе языкового синтаксиса',
    'HtmlToMarkdown Text Splitter': 'Преобразует Html в Markdown и затем разбивает ваш контент на документы на основе заголовков Markdown',
    'Markdown Text Splitter': 'Разделяет ваш контент на документы на основе заголовков Markdown',
    'Recursive Character Text Splitter': 'Разбивает документы рекурсивно по разным символам - начиная с "\\n\\n", затем "\\n", затем " "',
    'Token Text Splitter': 'Разделяет сырую текстовую строку, сначала преобразуя токены внутри одного блока обратно в текст.',
    'AI Plugin': 'Выполняйте действия с использованием URL-плагина ChatGPT',
    'BraveSearch API': 'Оболочка вокруг API BraveSearch - API в реальном времени для доступа к результатам поиска Brave',
    Calculator: 'Выполняйте вычисления по ответу',
    'Chain Tool': 'Используйте цепь как разрешенный инструмент для агента',
    'Custom Tool': 'Используйте пользовательский инструмент, созданный вами в Flowise в рамках чат-потока',
    'Google Custom Search': 'Оболочка вокруг API Google Custom Search - API в реальном времени для доступа к результатам поиска Google',
    'OpenAPI Toolkit': 'Загружайте спецификацию OpenAPI',
    'Read File': 'Читайте файл с диска',
    'Requests Get': 'Выполняйте HTTP GET-запросы',
    'Requests Post': 'Выполняйте HTTP POST-запросы',
    'Retriever Tool': 'Используйте извлекатель как разрешенный инструмент для агента',
    SearchApi: 'API в реальном времени для доступа к данным Google Search',
    'Serp API': 'Оболочка вокруг SerpAPI - API в реальном времени для доступа к результатам поиска Google',
    Serper: 'Оболочка вокруг Serper.dev - API поиска Google',
    'Web Browser': 'Дает агенту возможность посещать веб-сайты и извлекать информацию',
    'Write File': 'Записывайте файл на диск',
    'Zapier NLA': 'Доступ к приложениям и действиям на платформе Zapier через интерфейс естественного языка',
    'Chroma Load Existing Index': 'Загружайте существующий индекс из Chroma (т. е. документ был добавлен)',
    'Chroma Upsert Document': 'Добавляйте документы в Chroma',
    'Elasticsearch Load Existing Index': 'Загружайте существующий индекс из Elasticsearch (т. е. документ был добавлен)',
    'Elasticsearch Upsert Document': 'Добавляйте документы в Elasticsearch',
    'Faiss Load Existing Index': 'Загружайте существующий индекс из Faiss (т. е. документ был добавлен)',
    'Faiss Upsert Document': 'Добавляйте документы в Faiss',
    'In-Memory Vector Store':
        'Встроенное векторное хранилище, которое хранит вложения и выполняет линейный поиск наиболее похожих вложений.',
    'Milvus Load Existing collection': 'Загружайте существующую коллекцию из Milvus (т. е. документ был добавлен)',
    'Milvus Upsert Document': 'Добавляйте документы в Milvus',
    'OpenSearch Load Existing Index': 'Загружайте существующий индекс из OpenSearch (т. е. документ был добавлен)',
    'OpenSearch Upsert Document': 'Добавляйте документы в OpenSearch',
    'Pinecone Load Existing Index': 'Загружайте существующий индекс из Pinecone (т. е. документ был добавлен)',
    'Pinecone Upsert Document': 'Добавляйте документы в Pinecone',
    'Postgres Load Existing Index': 'Загружайте существующий индекс из Postgres с использованием pgvector (т. е. документ был добавлен)',
    'Postgres Upsert Document': 'Добавляйте документы в Postgres с использованием pgvector',
    'Qdrant Load Existing Index': 'Загружайте существующий индекс из Qdrant (т. е. документы были добавлены)',
    'Qdrant Upsert Document': 'Добавляйте документы в Qdrant',
    'Redis Load Existing Index': 'Загружайте существующий индекс из Redis (т. е. документ был добавлен)',
    'Redis Upsert Document': 'Добавляйте документы в Redis',
    'SingleStore Load Existing Table': 'Загружайте существующий документ из SingleStore',
    'SingleStore Upsert Document': 'Добавляйте документы в SingleStore',
    'Supabase Load Existing Index': 'Загружайте существующий индекс из Supabase (т. е. документ был добавлен)',
    'Supabase Upsert Document': 'Добавляйте документы в Supabase',
    'Vectara Load Existing Index': 'Загружайте существующий индекс из Vectara (т. е. документ был добавлен)',
    'Vectara Upload File': 'Загружайте файлы в Vectara',
    'Vectara Upsert Document': 'Добавляйте документы в Vectara',
    'Weaviate Load Existing Index': 'Загружайте существующий индекс из Weaviate (т. е. документ был добавлен)',
    'Weaviate Upsert Document': 'Добавляйте документы в Weaviate',
    'Zep Load Existing Index': 'Загружайте существующий индекс из Zep (т. е. документ был добавлен)',
    'Zep Upsert Document': 'Добавляйте документы в Zep'
}
const translationsNodes = {
    Agents: 'Агенты',
    Cache: 'Кэш',
    Chains: 'Цепочки',
    'Chat Models': 'Языковая модель для чатов',
    'Document Loaders': 'Работа с документами',
    Embeddings: 'Embeddings',
    LLMs: 'Языковая модель для агентов',
    Memory: 'Типы памяти',
    'Output Parsers': 'Output Parsers',
    Prompts: 'Подсказки для модели',
    Retrievers: 'Ретриверы',
    'Text Splitters': 'Обработчики текста',
    Tools: 'Дополнительные инструменты',
    'Vector Stores': 'Векторные хранилища'
}
const excludedNodesByLable = [
    'Airtable',
    'Apify Website Content Crawler',
    'Confluence',
    'VectorStore to Document',
    'AWS Bedrock',
    'Azure ChatOpenAi',
    'NIBittensorChat',
    'ChatAntrophic',
    'ChatGooglePaLM',
    'ChatGoogleVertexAI',
    'ChatLocalAI',
    'AWS Bedrock Embeddings',
    'Azure OpenAI Embeddings',
    'Google PaLM Embeddings',
    'Google VertexAI Embeddings',
    'LocalAI Embeddings',
    'AWS Bedrock',
    'Azure OpenAI',
    'NIBittersorLLM',
    'GooglePaLM',
    'GoogleVertexAI',
    'Motorheard Memory',
    'Upstash Redis-Backed Chat Memory',
    'BraveSearchAPI',
    'SerpAPI',
    'Milvus',
    'OpenSearch',
    'Pinecone',
    'Singlestore',
    'Supabase',
    'Vectara',
    'Weaviate'
]

const AddNodes = ({ nodesData, node }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    const [searchValue, setSearchValue] = useState('')
    const [nodes, setNodes] = useState({})
    const [open, setOpen] = useState(false)
    const [categoryExpanded, setCategoryExpanded] = useState({})

    const anchorRef = useRef(null)
    const prevOpen = useRef(open)
    const ps = useRef()

    const scrollTop = () => {
        const curr = ps.current
        if (curr) {
            curr.scrollTop = 0
        }
    }

    const getSearchedNodes = (value) => {
        const passed = nodesData.filter((nd) => {
            const passesQuery = nd.name.toLowerCase().includes(value.toLowerCase())
            const passesCategory = nd.category.toLowerCase().includes(value.toLowerCase())
            return passesQuery || passesCategory
        })
        return passed
    }

    const filterSearch = (value) => {
        setSearchValue(value)
        setTimeout(() => {
            if (value) {
                const returnData = getSearchedNodes(value)
                groupByCategory(returnData, true)
                scrollTop()
            } else if (value === '') {
                groupByCategory(nodesData)
                scrollTop()
            }
        }, 500)
    }

    const groupByCategory = (nodes, isFilter) => {
        const accordianCategories = {}
        const result = nodes.reduce(function (r, a) {
            r[a.category] = r[a.category] || []
            r[a.category].push(a)
            accordianCategories[a.category] = isFilter ? true : false
            return r
        }, Object.create(null))
        setNodes(result)
        setCategoryExpanded(accordianCategories)
    }

    const handleAccordionChange = (category) => (event, isExpanded) => {
        const accordianCategories = { ...categoryExpanded }
        accordianCategories[category] = isExpanded
        setCategoryExpanded(accordianCategories)
    }

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const onDragStart = (event, node) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
    }

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }

        prevOpen.current = open
    }, [open])

    useEffect(() => {
        if (node) setOpen(false)
    }, [node])

    useEffect(() => {
        if (nodesData) {
            groupByCategory(nodesData)
            dispatch({ type: SET_COMPONENT_NODES, componentNodes: nodesData })
        }
    }, [nodesData, dispatch])

    return (
        <>
            <StyledFab
                sx={{ left: 20, top: 20 }}
                ref={anchorRef}
                size='small'
                color='primary'
                aria-label='add'
                title='Add Node'
                onClick={handleToggle}
            >
                {open ? <IconMinus /> : <IconPlus />}
            </StyledFab>
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [-40, 14]
                            }
                        }
                    ]
                }}
                sx={{ zIndex: 1000 }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    <Box sx={{ p: 2 }}>
                                        <Stack>
                                            <Typography variant='h4'>Узлы</Typography>
                                        </Stack>
                                        <OutlinedInput
                                            sx={{ width: '100%', pr: 2, pl: 2, my: 2 }}
                                            id='input-search-node'
                                            value={searchValue}
                                            onChange={(e) => filterSearch(e.target.value)}
                                            placeholder='Поиск Узлов'
                                            startAdornment={
                                                <InputAdornment position='start'>
                                                    <IconSearch stroke={1.5} size='1rem' color={theme.palette.grey[500]} />
                                                </InputAdornment>
                                            }
                                            endAdornment={
                                                <InputAdornment
                                                    position='end'
                                                    sx={{
                                                        cursor: 'pointer',
                                                        color: theme.palette.grey[500],
                                                        '&:hover': {
                                                            color: theme.palette.grey[900]
                                                        }
                                                    }}
                                                    title='Clear Search'
                                                >
                                                    <IconX
                                                        stroke={1.5}
                                                        size='1rem'
                                                        onClick={() => filterSearch('')}
                                                        style={{
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                </InputAdornment>
                                            }
                                            aria-describedby='search-helper-text'
                                            inputProps={{
                                                'aria-label': 'weight'
                                            }}
                                        />
                                        <Divider />
                                    </Box>
                                    <PerfectScrollbar
                                        containerRef={(el) => {
                                            ps.current = el
                                        }}
                                        style={{ height: '100%', maxHeight: 'calc(100vh - 320px)', overflowX: 'hidden' }}
                                    >
                                        <Box sx={{ p: 2 }}>
                                            <List
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 370,
                                                    py: 0,
                                                    borderRadius: '10px',
                                                    [theme.breakpoints.down('md')]: {
                                                        maxWidth: 370
                                                    },
                                                    '& .MuiListItemSecondaryAction-root': {
                                                        top: 22
                                                    },
                                                    '& .MuiDivider-root': {
                                                        my: 0
                                                    },
                                                    '& .list-container': {
                                                        pl: 7
                                                    }
                                                }}
                                            >
                                                {Object.keys(nodes)
                                                    .sort()
                                                    .map((category) => (
                                                        <Accordion
                                                            expanded={categoryExpanded[category] || false}
                                                            onChange={handleAccordionChange(category)}
                                                            key={category}
                                                            disableGutters
                                                        >
                                                            <AccordionSummary
                                                                expandIcon={<ExpandMoreIcon />}
                                                                aria-controls={`nodes-accordian-${category}`}
                                                                id={`nodes-accordian-header-${category}`}
                                                            >
                                                                <Typography variant='h5'>{translationsNodes[category]}</Typography>
                                                            </AccordionSummary>
                                                            <AccordionDetails>
                                                                {nodes[category].map(
                                                                    (node, index) =>
                                                                        !excludedNodesByLable.includes(node.label) && (
                                                                            <div
                                                                                key={node.name}
                                                                                onDragStart={(event) => onDragStart(event, node)}
                                                                                draggable
                                                                            >
                                                                                <ListItemButton
                                                                                    sx={{
                                                                                        p: 0,
                                                                                        borderRadius: `${customization.borderRadius}px`,
                                                                                        cursor: 'move'
                                                                                    }}
                                                                                >
                                                                                    <ListItem alignItems='center'>
                                                                                        <ListItemAvatar>
                                                                                            <div
                                                                                                style={{
                                                                                                    width: 50,
                                                                                                    height: 50,
                                                                                                    borderRadius: '50%',
                                                                                                    backgroundColor: 'white'
                                                                                                }}
                                                                                            >
                                                                                                <img
                                                                                                    style={{
                                                                                                        width: '100%',
                                                                                                        height: '100%',
                                                                                                        padding: 10,
                                                                                                        objectFit: 'contain'
                                                                                                    }}
                                                                                                    alt={node.name}
                                                                                                    src={`${baseURL}/api/v1/node-icon/${node.name}`}
                                                                                                />
                                                                                            </div>
                                                                                        </ListItemAvatar>
                                                                                        <ListItemText
                                                                                            sx={{ ml: 1 }}
                                                                                            primary={node.label}
                                                                                            secondary={
                                                                                                translationsNodesDescription[node.label]
                                                                                            }
                                                                                        />
                                                                                    </ListItem>
                                                                                </ListItemButton>
                                                                                {index === nodes[category].length - 1 ? null : <Divider />}
                                                                            </div>
                                                                        )
                                                                )}
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    ))}
                                            </List>
                                        </Box>
                                    </PerfectScrollbar>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </>
    )
}

AddNodes.propTypes = {
    nodesData: PropTypes.array,
    node: PropTypes.object
}

export default AddNodes
