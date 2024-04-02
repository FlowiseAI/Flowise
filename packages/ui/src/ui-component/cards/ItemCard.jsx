import PropTypes from 'prop-types'

// material-ui
import { styled } from '@mui/material/styles'
import { Box, Grid, Typography } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import SkeletonChatflowCard from '@/ui-component/cards/Skeleton/ChatflowCard'
import moment from 'moment'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    maxHeight: '300px',
    maxWidth: '300px',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line'
}))

const CreatedAT = styled('div')({
    position: 'absolute',
    right: '0',
    padding: '5px 20px',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '14px',
    letterSpacing: '-0.01em',
    color: '#3E444A',
    opacity: '50%'
})
// ===========================|| CONTRACT CARD ||=========================== //
const translateDescriptions = {
    'Flowise Docs Github QnA using conversational retrieval QA chain':
        'Flowise Docs Github QnA с использованием диалоговой цепочки контроля качества',

    'A conversational agent for a chat model which utilize chat specific prompts':
        'Диалоговый агент для модели чата, в которой используются подсказки, специфичные для чата.',

    'Use OpenAI Function Agent and Chain to automatically decide which API to call, generating url and body request from conversation':
        'Используйте агент и цепочку функций OpenAI, чтобы автоматически решать, какой API вызывать, генерируя URL-адрес и запрос тела из разговора.',

    'Given API docs, agent automatically decide which API to call, generating url and body request from conversation':
        'Учитывая документацию API, агент автоматически решает, какой API вызывать, генерируя URL-адрес и запрос тела из разговора».',

    'Output antonym of given user input using few-shot prompt template built with examples':
        'Вывод антонима заданного пользовательского ввода с использованием шаблона подсказки с несколькими кадрами, построенного на примерах»',

    'Use AutoGPT - Autonomous agent with chain of thoughts for self-guided task completion':
        'Используйте AutoGPT — автономный агент с цепочкой мыслей для самостоятельного выполнения задач».',

    'Use BabyAGI to create tasks and reprioritize for a given objective':
        'Используйте BabyAGI для создания задач и изменения приоритетов для заданной цели»',

    'Analyse and summarize CSV data': 'Анализируйте и обобщайте данные CSV',

    'Use ChatGPT Plugins within LangChain abstractions with GET and POST Tools':
        'Используйте плагины ChatGPT в абстракциях LangChain с помощью инструментов GET и POST».',

    'Use Anthropic Claude with 100k context window to ingest whole document for QnA':
        'Используйте Anthropic Claude с контекстным окном 100 тыс., чтобы вставить весь документ для QnA"',

    'Agent optimized for vector retrieval during conversation and answering questions based on previous dialogue.':
        'Агент оптимизирован для поиска векторов во время разговора и ответов на вопросы, основанные на предыдущем диалоге».',

    'Text file QnA using conversational retrieval QA chain': 'Текстовый файл QnA с использованием диалоговой поисковой цепочки QA"',

    'Simple LLM Chain using HuggingFace Inference API on falcon-7b-instruct model':
        'Простая цепочка LLM с использованием API вывода HuggingFace на модели falcon-7b-instruct"',

    'QnA chain using local LLM, Embedding models, and Faiss local vector store':
        'Цепочка QnA с использованием локального LLM, моделей внедрения и локального векторного хранилища Faiss»',

    'Use long term memory Zep to differentiate conversations between users with sessionId':
        'Используйте долговременную память Zep, чтобы различать разговоры между пользователями с идентификатором сеанса"',

    'An agent that uses the React Framework to decide what action to take':
        'Агент, который использует React Framework, чтобы решить, какое действие предпринять».',

    'Load existing index with metadata filters and feed into conversational retrieval QA chain':
        'Загрузить существующий индекс с фильтрами метаданных и передать его в цепочку контроля качества диалогового поиска.',

    'Upsert multiple files with metadata filters and feed into conversational retrieval QA chain':
        'Загрузить существующий индекс с фильтрами метаданных и передать его в цепочку контроля качества диалогового поиска.',

    'A chain that automatically picks an appropriate prompt from multiple prompts':
        'Цепочка, которая автоматически выбирает подходящего ретривера из нескольких различных баз данных векторов».',

    'Use the agent to choose between multiple different vector databases, with the ability to use other tools':
        'Используйте агент для выбора между несколькими различными базами данных векторов с возможностью использования других инструментов».',

    "An agent that uses OpenAI's Function Calling functionality to pick the tool and args to call":
        'Агент, который использует функцию вызова функций OpenAI, чтобы выбрать инструмент и аргументы для вызова.',

    'Use chat history to rephrase user question, and answer the rephrased question using retrieved docs from vector store':
        'Используйте историю чата, чтобы перефразировать вопрос пользователя, и отвечайте на перефразированный вопрос, используя документы, полученные из векторного хранилища"',

    'Use output from a chain as prompt for another chain':
        'Использовать выходные данные цепочки в качестве приглашения для другой цепочки"',

    'Use Replicate API that runs Llama 13b v2 model with LLMChain':
        'Используйте API-интерфейс репликации, который запускает модель Llama 13b v2 с LLMChain».',

    'Answer questions over a SQL database': 'Отвечать на вопросы по базе данных SQL"',

    'Basic example of Conversation Chain with built-in memory - works exactly like ChatGPT':
        'Базовый пример цепочки разговоров со встроенной памятью — работает точно так же, как ChatGPT».',

    'Basic example of stateless (no memory) LLM Chain with a Prompt Template and LLM Model':
        'Базовый пример цепочки LLM без сохранения состояния (без памяти) с шаблоном подсказки и моделью LLM»',

    'Language translation using LLM Chain with a Chat Prompt Template and Chat Model':
        'Языковой перевод с использованием LLM Chain с шаблоном подсказки для чата и моделью чата»',

    'A simple LLM chain that uses Vectara to enable conversations with uploaded files':
        'Простая цепочка LLM, которая использует Vectara для общения с загруженными файлами',

    'Conversational Agent with ability to visit a website and extract information':
        'Разговорный агент с возможностью посещения веб-сайта и извлечения информации',

    'Scrape web pages for QnA with long term memory Motorhead and return source documents':
        'Собирать веб-страницы для QnA с долговременной памятью Motorhead и возвращать исходные документы»',

    "An agent that uses Zapier NLA to accesss apps and actions on Zapier's platform":
        'Агент, который использует Zapier NLA для доступа к приложениям и действиям на платформе Zapier».',

    'Return response as a specified JSON structure instead of a string/text':
        'Вернуть ответ в виде указанной структуры JSON вместо строки/текста.',

    'Return response as a list (array) instead of a string/text': 'Вернуть ответ в виде списка (массива) вместо строки/текста.',
    'Send message to Discord channel': 'Отправить сообщение в канал Discord',
    'Add new contact to Hubspot': 'Добавить новый контакт в Hubspot',
    'Get the stocks that has biggest price/volume moves, e.g. actives, gainers, losers, etc.':
        'Найдите акции с наибольшими изменениями цены/объема, например. активы, выигравшие, проигравшие и т. д.',
    'Add column1, column2 to Airtable': 'Добавьте столбец1, столбец2 в Airtable',
    'Useful to get todays day, date and time.': 'Полезно, чтобы получить сегодняшний день, дату и время.',
    'Send message to Slack channel': 'Отправить сообщение в канал Slack',
    'Send email using SendGrid': 'Отправить email используя SendGrid',
    'Useful when you need to send message to Discord': 'Полезно, когда вам нужно отправить сообщение в Discord',
    'Send message to Teams channel': 'Отправить сообщение в канал Teams',

    'OpenAI Assistant that has instructions and can leverage models, tools, and knowledge to respond to user queries':
        ' OpenAI Assistant, который имеет инструкции и может использовать модели, инструменты и знания для ответа на запросы пользователей.'
}
const ItemCard = ({ isLoading, data, images, onClick }) => {
    console.log(data)
    return (
        <>
            {isLoading ? (
                <SkeletonChatflowCard />
            ) : (
                <CardWrapper border={false} content={false} onClick={onClick} sx={{ border: '1px solid #E8EAEC' }}>
                    {data.createdDate && <CreatedAT>{moment(data.createdDate).format('. DD.MM.YYYY, h:mm a')}</CreatedAT>}
                    <Box sx={{ p: 2.25 }}>
                        <Grid container direction='column'>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}
                            >
                                {data.iconSrc && (
                                    <div
                                        style={{
                                            width: 35,
                                            height: 35,
                                            marginRight: 10,
                                            borderRadius: '50%',
                                            background: `url(${data.iconSrc})`,
                                            backgroundSize: 'contain',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'center center'
                                        }}
                                    ></div>
                                )}
                                {!data.iconSrc && data.color && (
                                    <div
                                        style={{
                                            width: 35,
                                            height: 35,
                                            marginRight: 10,
                                            borderRadius: '50%',
                                            background: data.color
                                        }}
                                    ></div>
                                )}
                                <Typography
                                    sx={{ fontSize: '1.5rem', fontWeight: 500, overflowWrap: 'break-word', whiteSpace: 'pre-line' }}
                                >
                                    {data.templateName || data.name}
                                </Typography>
                            </div>
                            {data.description && (
                                <span style={{ marginTop: 10, overflowWrap: 'break-word', whiteSpace: 'pre-line' }}>
                                    {translateDescriptions[data.description] || data.description}
                                </span>
                            )}
                            {images && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        marginTop: 5
                                    }}
                                >
                                    {images.map((img) => (
                                        <div
                                            key={img}
                                            style={{
                                                width: 35,
                                                height: 35,
                                                marginRight: 5,
                                                borderRadius: '50%',
                                                backgroundColor: 'white',
                                                marginTop: 5
                                            }}
                                        >
                                            <img
                                                style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                                alt=''
                                                src={img}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Grid>
                    </Box>
                </CardWrapper>
            )}
        </>
    )
}

ItemCard.propTypes = {
    isLoading: PropTypes.bool,
    data: PropTypes.object,
    images: PropTypes.array,
    onClick: PropTypes.func
}

export default ItemCard
