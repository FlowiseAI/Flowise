export const translationObject = {
    'If YAML link is provided, uploaded YAML File will be ignored and YAML link will be used instead':
        'Если указана ссылка YAML, загруженный файл YAML будет игнорироваться и вместо него будет использоваться ссылка YAML.',
    'State of the Union QA - useful for when you need to ask questions about the most recent state of the union address.':
        'Контроль качества Union QA — полезно, когда вам нужно задать вопросы о последнем состоянии адреса Union.',
    'Description of how API works. Please refer to more <a target="_blank" href="https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/chains/api/open_meteo_docs.py">examples</a>':
        'Описание работы API. Подробнее см. <a target="_blank" href="https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/chains/api/open_meteo_docs.py" >примеры</a>',
    'Prompt used to tell LLMs how to construct the URL. Must contains {api_docs} and {question}':
        'Подсказка, используемая для указания LLM, как создать URL-адрес. Должно содержать {api_docs} и {question}.',
    'You are given the below API Documentation:\n{api_docs}\nUsing this documentation, generate a json string with two keys: "url" and "data".\nThe value of "url" should be a string, which is the API url to call for answering the user question.\nThe value of "data" should be a dictionary of key-value pairs you want to POST to the url as a JSON body.\nBe careful to always use double quotes for strings in the json string.\nYou should build the json string in order to get a response that is as short as possible, while still getting the necessary information to answer the question. Pay attention to deliberately exclude any unnecessary pieces of data in the API call.\n\nQuestion:{question}\njson string:':
        'Вам предоставляется приведенная ниже документация по API:\n{api_docs}\nИспользуя эту документацию, сгенерируйте строку json с двумя ключами: "url" и "data".\nЗначение "url" должно быть строка, которая представляет собой URL-адрес API, к которому нужно обратиться для ответа на вопрос пользователя.\nЗначение "data" должно быть словарем пар ключ-значение, которые вы хотите отправить POST на URL-адрес в виде тела JSON.\nБудьте осторожны, всегда используйте двойные кавычки для строк в строке json.\nВам следует построить строку json, чтобы получить как можно более короткий ответ, но при этом получить необходимую информацию для ответа на вопрос. Обратите внимание на намеренное исключение любых ненужных фрагментов данных из вызова API.\n\nQuestion:{question}\njson string:',
    'Prompt used to tell LLMs how to return the API response. Must contains {api_response}, {api_url}, and {question}':
        'Подсказка, используемая для указания LLM, как вернуть ответ API. Должно содержать {api_response}, {api_url} и {question}.',
    'You are given the below API Documentation:\n{api_docs}\nUsing this documentation, generate a json string with two keys: "url" and "data".\nThe value of "url" should be a string, which is the API url to call for answering the user question.\nThe value of "data" should be a dictionary of key-value pairs you want to POST to the url as a JSON body.\nBe careful to always use double quotes for strings in the json string.\nYou should build the json string in order to get a response that is as short as possible, while still getting the necessary information to answer the question. Pay attention to deliberately exclude any unnecessary pieces of data in the API call.\n\nQuestion:{question}\njson string: {api_url_body}\n\nHere is the response from the API:\n\n{api_response}\n\nSummarize this response to answer the original question.\n\nSummary:':
        'Вам предоставляется приведенная ниже документация по API:\n{api_docs}\nИспользуя эту документацию, сгенерируйте строку json с двумя ключами: "url" и "data".\nЗначение "url" должно быть строка, которая представляет собой URL-адрес API, к которому нужно обратиться для ответа на вопрос пользователя.\nЗначение "data" должно быть словарем пар ключ-значение, которые вы хотите отправить POST на URL-адрес в виде тела JSON.\nБудьте осторожны, всегда используйте двойные кавычки для строк в строке json.\nВам следует построить строку json, чтобы получить как можно более короткий ответ, но при этом получить необходимую информацию для ответа на вопрос. Обратите внимание на то, чтобы намеренно исключить любые ненужные фрагменты данных из вызова API.\n\nQuestion:{question}\njson string: {api_url_body}\n\nВот ответ от API:\n\n{api_response}\n \nОбобщите этот ответ, чтобы ответить на исходный вопрос.\n\nОбобщение:',
    'Assistant is a large language model trained by OpenAI.\n\nAssistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.\n\nAssistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.\n\nOverall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist.':
        'Ассистент — это большая языковая модель, обученная OpenAI.\n\nАссистент предназначен для помощи в решении широкого спектра задач: от ответов на простые вопросы до предоставления подробных объяснений и обсуждений по широкому кругу тем. В качестве языковой модели Ассистент способен генерировать текст, похожий на человеческий, на основе полученных им входных данных, что позволяет ему участвовать в естественно звучащих разговорах и предоставлять ответы, которые являются связными и релевантными рассматриваемой теме.\n\nАссистент постоянно обучается и совершенствуется, а его возможности постоянно развиваются. Он способен обрабатывать и понимать большие объемы текста и может использовать эти знания для предоставления точных и информативных ответов на широкий круг вопросов. Кроме того, Ассистент может генерировать собственный текст на основе полученных им данных, что позволяет ему участвовать в обсуждениях и предоставлять объяснения и описания по широкому кругу тем.\n\nВ целом, Ассистент — это мощная система, которая может помочь с широкий спектр задач и предоставляют ценную информацию и информацию по широкому кругу тем. Если вам нужна помощь с конкретным вопросом или вы просто хотите поговорить на определенную тему, Ассистент всегда готов помочь.',
    'Number of top results to fetch. Default to 4': 'Количество лучших результатов для получения. По умолчанию 4',
    'my-first-namespace': 'мое-первое-пространство имен',
    'I want you to act as a document that I am having a conversation with. Your name is "AI Assistant". You will provide me with answers from the given info. If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. Refuse to answer any question not about the info. Never break character.':
        'Я хочу, чтобы вы действовали как документ, с которым я веду беседу. Вас зовут «ИИ-помощник». Вы предоставите мне ответы на основе предоставленной информации. Если ответа нет, скажите именно: «Хм, я не уверен» и после этого остановитесь. Отказывайтесь отвечать на любые вопросы, не касающиеся информации. Никогда не ломайте характер.',
    'Suitable for QA tasks over larger documents and can run the preprocessing step in parallel, reducing the running time':
        'Подходит для задач контроля качества больших документов и может выполнять этап предварительной обработки параллельно, сокращая время выполнения.',
    'Suitable for QA tasks over a large number of documents.': 'Подходит для задач контроля качества большого количества документов.',
    'Suitable for QA tasks over a small number of documents.': 'Подходит для задач контроля качества небольшого количества документов.',
    'Seperator to determine when to split the text, will override the default separator':
        'Разделитель, определяющий, когда разбивать текст, переопределяет разделитель по умолчанию.',
    'Agent will make call to this exact URL. If not specified, agent will try to figure out itself from AIPlugin if provided':
        'Агент выполнит вызов именно по этому URL-адресу. Если не указано, агент попытается определить себя с помощью AIPlugin, если он предоставлен.',
    'A portal to the internet. Use this when you need to get specific content from a website. \nInput should be a  url (i.e. https://www.google.com). The output will be the text response of the GET request.':
        'Портал в Интернет. Используйте это, когда вам нужно получить определенный контент с веб-сайта. \nВвод должен быть URL-адресом (например, https://www.google.com). Результатом будет текстовый ответ на запрос GET.',
    'Acts like a prompt to tell agent when it should use this tool':
        'Действует как подсказка, сообщающая агенту, когда ему следует использовать этот инструмент.',
    'JSON body for the POST request. If not specified, agent will try to figure out itself from AIPlugin if provided':
        'Тело JSON для запроса POST. Если не указано, агент попытается определить себя с помощью AIPlugin, если он предоставлен.',
    'Use this when you want to POST to a website.\nInput should be a json string with two keys: "url" and "data".\nThe value of "url" should be a string, and the value of "data" should be a dictionary of \nkey-value pairs you want to POST to the url as a JSON body.\nBe careful to always use double quotes for strings in the json string\nThe output will be the text response of the POST request.':
        'Используйте это, если вы хотите отправить POST на веб-сайт.\nВвод должен быть строкой json с двумя ключами: «url» и «data».\nЗначение «url» должно быть строкой, а значение значение "data" должно представлять собой словарь пар \nключ-значение, которые вы хотите отправить POST по URL-адресу в виде тела JSON.\nБудьте внимательны и всегда используйте двойные кавычки для строк в строке json.\nВыводом будет текст ответ на POST-запрос.',
    'You are a helpful assistant that write codes': 'Вы полезный помощник, который пишет коды',
    'Include whole document into the context window': 'Включить весь документ в контекстное окно',
    'Claude 2 latest major version, automatically get updates to the model as they are released':
        'Последняя основная версия Claude 2, автоматически получает обновления модели по мере их выпуска.',
    'Claude 2 latest full version': 'Клод 2 последняя полная версия',
    'Claude Instant latest major version, automatically get updates to the model as they are released':
        'Последняя основная версия Claude Instant, автоматическое получение обновлений модели по мере их выпуска.',
    'One document per page': 'Один документ на странице',
    'One document per file': 'Один документ в файле',
    input: 'ввод данных',
    'When should agent uses to retrieve documents': 'Когда агент должен использовать для получения документов',
    'Searches and returns documents regarding the state-of-the-union.': 'Ищет и возвращает документы касающиеся state-of-the-union.',
    chat_history: 'история чата',
    'The file key can be read from any Figma file URL: https://www.figma.com/file/:key/:title. For example, in https://www.figma.com/file/12345/Website, the file key is 12345':
        'Ключ файла можно прочитать по любому URL-адресу файла Figma: https://www.figma.com/file/:key/:title. Например, в https://www.figma.com/file/12345/Website ключ файла — 12345.',
    'A list of Node IDs, seperated by comma. Refer to official guide on how to get Node IDs':
        'Список идентификаторов узлов, разделенных запятой. Обратитесь к официальному руководству о том, как получить идентификаторы узлов.',
    'If left empty, a default BufferMemory will be used': 'Если оставить пустым, будет использоваться BufferMemory по умолчанию.',
    'Array of custom separators to determine when to split the text, will override the default separators':
        'Массив пользовательских разделителей, определяющий, когда разбивать текст, переопределяет разделители по умолчанию.',
    'Only needed when accessing private repo': 'Требуется только при доступе к частному репо',
    'An array of paths to be ignored': 'Массив путей, которые следует игнорировать',
    'The maximum number of retries that can be made for a single call, with an exponential backoff between each attempt. Defaults to 2.':
        'Максимальное количество повторов, которое можно сделать для одного вызова, с экспоненциальной задержкой между каждой попыткой. По умолчанию 2.',
    'What is a good name for a company that makes {product}?': 'Какое имя подойдет компании, производящей {продукт}?',
    'If using own inference endpoint, leave this blank': 'Если вы используете собственную конечную точку вывода, оставьте это поле пустым.',
    'Using your own inference endpoint': 'Использование собственной конечной точки вывода',
    'Temperature parameter may not apply to certain model. Please check available model parameters':
        'Параметр температуры может не применяться к определенной модели. Пожалуйста, проверьте доступные параметры модели',
    'Max Tokens parameter may not apply to certain model. Please check available model parameters':
        'Параметр Max Tokens может не применяться к определенной модели. Пожалуйста, проверьте доступные параметры модели',
    'Top Probability parameter may not apply to certain model. Please check available model parameters':
        'Параметр Top Probability может не применяться к определенной модели. Пожалуйста, проверьте доступные параметры модели',
    'Top K parameter may not apply to certain model. Please check available model parameters':
        'Параметр Top K может не применяться к определенной модели. Пожалуйста, проверьте доступные параметры модели',
    'Frequency Penalty parameter may not apply to certain model. Please check available model parameters':
        'Параметр «штраф за частоту» может не применяться к определенной модели. Пожалуйста, проверьте доступные параметры модели',
    'Name Your Chain': 'Назовите свою сеть',
    'Adjusts randomness of outputs, greater than 1 is random and 0 is deterministic, 0.75 is a good starting value.':
        'Регулирует случайность выходных данных: значение больше 1 — случайное, 0 — детерминированное, 0,75 — хорошее начальное значение.',
    'When decoding text, samples from the top p percentage of most likely tokens; lower to ignore less likely tokens':
        'При декодировании текста выбираются образцы из верхнего процента наиболее вероятных токенов; ниже, чтобы игнорировать менее вероятные токены',
    'Maximum number of tokens to generate. A word is generally 2-3 tokens':
        'Максимальное количество токенов для генерации. Слово обычно состоит из 2-3 токенов.',
    'Penalty for repeated words in generated text; 1 is no penalty, values greater than 1 discourage repetition, less than 1 encourage it. (minimum: 0.01; maximum: 5)':
        'Штраф за повторение слов в генерируемом тексте; 1 не означает штрафа, значения больше 1 препятствуют повторению, меньше 1 поощряют его. (минимум: 0,01; максимум: 5)',
    'Each model has different parameters, refer to the specific model accepted inputs. For example: <a target="_blank" href="https://replicate.com/a16z-infra/llama13b-v2-chat/api#inputs">llama13b-v2</a>':
        'Каждая модель имеет разные параметры, обратитесь к принятым входным данным конкретной модели. Например: <a target="_blank" href="https://reulate.com/a16z-infra/llama13b-v2-chat/api#inputs">llama13b-v2</a>',
    "Cannot Process! Input violates OpenAI's content moderation policies.":
        'Невозможно обработать! Ввод нарушает политику модерации контента OpenAI.',
    'In the event that the first call fails, will make another call to the model to fix any errors.':
        'В случае сбоя первого вызова будет выполнен еще один вызов модели для исправления ошибок.',
    'The temperature of the model. Increasing the temperature will make the model answer more creatively. (Default: 0.8). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Температура модели. Повышение температуры заставит модель отвечать более творчески. (По умолчанию: 0,8). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. (Default: 0.9). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Работает совместно с топ-к. Более высокое значение (например, 0,95) приведет к созданию более разнообразного текста, а более низкое значение (например, 0,5) приведет к созданию более сфокусированного и консервативного текста. (По умолчанию: 0,9). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative. (Default: 40). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Уменьшает вероятность генерации ерунды. Более высокое значение (например, 100) даст более разнообразные ответы, а более низкое значение (например, 10) будет более консервативным. (По умолчанию: 40). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Включите выборку Миростата, чтобы контролировать недоумение. (по умолчанию: 0, 0 = отключено, 1 = Миростат, 2 = Миростат 2.0). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive. (Default: 0.1) Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Влияет на то, насколько быстро алгоритм реагирует на обратную связь из сгенерированного текста. Более низкая скорость обучения приведет к более медленной корректировке, а более высокая скорость обучения сделает алгоритм более отзывчивым. (По умолчанию: 0,1) См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values ">документы</a> для более подробной информации',
    'Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text. (Default: 5.0) Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Управляет балансом между согласованностью и разнообразием выходных данных. Меньшее значение приведет к более сфокусированному и связному тексту. (По умолчанию: 5.0) См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values ">документы</a> для более подробной информации',
    'Sets the size of the context window used to generate the next token. (Default: 2048) Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Устанавливает размер контекстного окна, используемого для генерации следующего токена. (По умолчанию: 2048) См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values ">документы</a> для более подробной информации',
    'The number of GQA groups in the transformer layer. Required for some models, for example it is 8 for llama2:70b. Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more detail':
        'Количество групп GQA на уровне трансформатора. Требуется для некоторых моделей, например для llama2:70b это 8. См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'The number of layers to send to the GPU(s). On macOS it defaults to 1 to enable metal support, 0 to disable. Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Количество слоев для отправки на графические процессоры. В macOS по умолчанию установлено значение 1, чтобы включить металлическую поддержку, и 0, чтобы отключить. См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Sets the number of threads to use during computation. By default, Ollama will detect this for optimal performance. It is recommended to set this value to the number of physical CPU cores your system has (as opposed to the logical number of cores). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Устанавливает количество потоков, используемых во время вычислений. По умолчанию Оллама обнаружит это для обеспечения оптимальной производительности. Рекомендуется установить это значение равным количеству физических ядер ЦП в вашей системе (в отличие от логического количества ядер). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Sets how far back for the model to look back to prevent repetition. (Default: 64, 0 = disabled, -1 = num_ctx). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Устанавливает, как далеко назад модель должна оглянуться, чтобы предотвратить повторение. (По умолчанию: 64, 0 = отключено, -1 = num_ctx). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. (Default: 1.1). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Устанавливает, насколько строго наказывать повторения. Более высокое значение (например, 1,5) будет более строго наказывать повторения, а более низкое значение (например, 0,9) будет более мягким. (По умолчанию: 1.1). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Sets the stop sequences to use. Use comma to seperate different sequences. Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Устанавливает используемые последовательности остановки. Используйте запятую для разделения различных последовательностей. См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Tail free sampling is used to reduce the impact of less probable tokens from the output. A higher value (e.g., 2.0) will reduce the impact more, while a value of 1.0 disables this setting. (Default: 1). Refer to <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">docs</a> for more details':
        'Бесхвостовая выборка используется для уменьшения влияния менее вероятных токенов на выходные данные. Более высокое значение (например, 2,0) уменьшит влияние еще больше, а значение 1,0 отключает этот параметр. (По умолчанию: 1). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</ а> подробнее',
    'Configure JWT authentication on your Zep instance (Optional)': 'Настройте аутентификацию JWT на вашем экземпляре Zep (необязательно)',
    'if empty, chatId will be used automatically': 'если пусто, ChatId будет использоваться автоматически',
    'Window of size k to surface the last k back-and-forths to use as memory.':
        'Окно размера k для отображения последних k взад и вперед для использования в качестве памяти.',
    text: 'текст',
    'This is the summary of the following conversation:\n{summary}': 'Это краткое изложение следующего разговора:\n{summary}',
    human: 'человек',
    'Only needed when using Qdrant cloud hosted': 'Требуется только при использовании облачного хостинга Qdrant.',

    'Description of what the prompt does and when it should be used': 'Описание того, что делает подсказка и когда ее следует использовать',
    'Good for answering questions about physics': 'Хорошо подходит для ответов на вопросы по физике',
    "You are a very smart physics professor. You are great at answering questions about physics in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.":
        'Вы очень умный профессор физики. У вас отлично получается кратко и понятно отвечать на вопросы по физике. Когда вы не знаете ответа на вопрос, вы признаете, что не знаете.',
    "You are a very smart history professor. You are great at answering questions about history in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.":
        'Вы очень умный профессор истории. У вас отлично получается кратко и понятно отвечать на вопросы по истории. Когда вы не знаете ответа на вопрос, вы признаете, что не знаете.',
    'netflix movies': 'Netflix фильмы',
    'Good for answering questions about netflix movies': 'Хорошо подходит для ответов на вопросы о фильмах Netflix.',
    'Description of when to use the vector store retriever':
        'Описание того, когда следует использовать средство извлечения векторного хранилища',
    'Only needed if you have chroma on cloud services with X-Api-key':
        'Требуется только в том случае, если у вас есть цветность в облачных сервисах с X-Api-ключом.',
    'AI Paper QA - useful for when you need to ask questions about the AI-Generated Content paper.':
        'AI Paper QA — полезно, когда вам нужно задать вопросы о документе, созданном искусственным интеллектом.',
    'State of the Union QA - useful for when you need to ask questions about the president speech and most recent state of the union address.':
        'Контроль качества состояния союза — полезно, когда вам нужно задать вопросы о последнем состоянии адреса союза.',
    'Selecting this option will delete the existing index and recreate a new one when upserting':
        'Выбор этой опции приведет к удалению существующего индекса и воссозданию нового при обновлении.',
    'Name of the field (column) that contains the actual content': 'Имя поля (столбца), содержащего фактическое содержимое',
    'Name of the field (column) that contains the metadata of the document': 'Имя поля (столбца), содержащего метаданные документа',
    'Name of the field (column) that contains the vector': 'Имя поля (столбца), содержащего вектор',
    'Path to load faiss.index file': 'Путь для загрузки файла faiss.index',

    'Messages can contain text, images, or files. In some cases, you may want to prevent others from downloading the files. Learn more from OpenAI File Annotation <a target="_blank" href="https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages">docs</a>':
        'Сообщения могут содержать текст, изображения или файлы. В некоторых случаях вы можете захотеть запретить другим загружать файлы. Узнайте больше из аннотации к файлу OpenAI <a target="_blank" href="https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages">docs </а>',
    'You are a helpful assistant that translates {input_language} to {output_language}.':
        'Вы полезный помощник, который переводит {input_language} на {output_language}.',
    'Query to retrieve documents from vector database. If not specified, user question will be used':
        'Запрос на получение документов из векторной базы данных. Если не указано, будет использоваться вопрос пользователя.',
    'Minumum score for embeddings documents to be included': 'Минимальный балл для включенных вложений документов',
    'Needed when using SingleStore cloud hosted': 'Требуется при использовании облачного хостинга SingleStore.',
    embeddings: 'вложения',
    content: 'содержание',
    vector: 'вектор',
    metadata: 'метаданные',
    'JSON structure for LLM to return': 'Структура JSON для возврата LLM',
    "answer to the user's question": 'ответ на вопрос пользователя',
    'sources used to answer the question, should be websites': 'источниками, используемыми для ответа на вопрос, должны быть веб-сайты',
    'File to upload to Vectara. Supported file types: https://docs.vectara.com/docs/api-reference/indexing-apis/file-upload/file-upload-filetypes':
        'Файл для загрузки в Vectara. Поддерживаемые типы файлов: https://docs.vectara.com/docs/api-reference/indexing-apis/file-upload/file-upload-filetypes.',
    'Filter to apply to Vectara metadata.': 'Фильтр, применяемый к метаданным Vectara.',
    'Number of sentences to fetch before the matched sentence. Defaults to 2.':
        'Количество предложений, которые необходимо получить перед совпадающим предложением. По умолчанию 2.',
    'Number of sentences to fetch after the matched sentence. Defaults to 2.':
        'Количество предложений, которые необходимо получить после совпадающего предложения. По умолчанию 2.',
    'Improves retrieval accuracy by adjusting the balance (from 0 to 1) between neural search and keyword-based search factors.':
        'Повышает точность поиска за счет регулировки баланса (от 0 до 1) между нейронным поиском и факторами поиска на основе ключевых слов.',
    'Crawl relative links from HTML URL': 'Сканировать относительные ссылки из URL-адреса HTML',
    'Select a method to retrieve relative links': 'Выберите метод получения относительных ссылок',
    'Scrape relative links from XML sitemap URL': 'Очистить относительные ссылки из URL-адреса XML-карты сайта',
    'If not specified, the first CHAT_MESSAGE_ID will be used as sessionId':
        'Если не указано, первый CHAT_MESSAGE_ID будет использоваться в качестве sessionId.',
    'Omit this parameter to make sessions never expire': 'Опустите этот параметр, чтобы сеансы никогда не истекали.',
    'Language Model': 'Языковая Модель',
    'Base Id': 'ID по умолчанию',
    'Base URL': 'URL по умолчанию',
    Size: 'Размер',
    Embeddings: 'Вложения',
    'Auto Summary': 'Автоматическое резюме',
    'Table Id': 'ID таблицы',
    'Connect Credential': 'Подключить учетные данные',
    'Allowed Tools': 'Доступные инструменты',
    'Vector Store Retriever': 'Векторный магазин Ретривер',
    'Chat Model': 'Чат модель',
    'AutoGPT Name': 'Имя AutoGPT',
    'AutoGPT Role': 'Роль AutoGPT',
    'Maximum Loop': 'Максимум циклов',
    'Select Assistant': 'Выбор Ассистента',
    'Base Path': 'Базовый путь',
    'Example Prompt': 'Пример запроса',
    Cache: 'Кэш',
    Memory: 'Память',
    'Base Chain': 'Базовая цепочка',
    'Chain Name': 'Имя цепочки',
    'System Message': 'Системное сообщение',
    'Memory Key': 'Ключ памяти',
    'API Documentation': 'Документация по API',
    'Task Loop': 'Цикл задачи',
    'Chunk Size': 'Размер фрагмента',
    'Return Source Documents': 'Вернуть исходные документы',
    Document: 'Документ',
    'Text Splitter': 'Разделитель текста',
    URL: 'URL',
    Template: 'Шаблон',
    'Base Path to store': 'Базовый путь для хранения',
    'Txt File': 'TXT-файл',
    Metadata: 'Метаданные',
    Usage: 'Использование',
    'Chunk Overlap': 'Перекрытие фрагментов',
    'Custom Separators': 'Пользовательские разделители',
    'Pdf File': 'PDF-файл',
    'Format Prompt Values': 'Форматирование значений запроса',
    Temperature: 'Температура',
    'Max Tokens': 'Максимальное количество токенов',
    'Top Probability': 'Вероятность верхних результатов',
    'Frequency Penalty': 'Штраф за частоту',
    'Presence Penalty': 'Штраф за наличие',
    Timeout: 'Таймаут',
    BasePath: 'Базовый путь',
    'ChatOpenAI Model': 'Модель ChatGPT OpenAI',
    Headers: 'Заголовки',
    'URL Prompt': 'URL-запрос',
    'Answer Prompt': 'Запрос на ответ',
    'Pinecone Index': 'Индекс Pinecone',
    'Pinecone Namespace': 'Пространство имен Pinecone',
    'Pinecone Metadata Filter': 'Фильтр метаданных Pinecone',
    'Strip New Lines': 'Удалить новые строки',
    'Batch Size': 'Размер пакета',
    Body: 'Тело',
    Description: 'Описание',
    'Plugin Url': 'URL плагина',
    'Use Legacy Build': 'Использовать предыдущую сборку',
    'Repo Link': 'Ссылка на репозиторий',
    Branch: 'Ветка',
    'Max Concurrency': 'Максимальная параллельность',
    Recursive: 'Рекурсивно',
    'Ignore Paths': 'Игнорировать пути',
    'Max Retries': 'Максимальное количество повторов',
    'Output Parser': 'Парсер вывода',
    'Prompt System Message': 'Системное сообщение запроса',
    'Prompt Description': 'Описание запроса',
    'Retriever Name': 'Имя извлекателя',
    'Retriever Description': 'Описание извлекателя',
    'Vector Store': 'Векторное хранилище',
    'Collection Name': 'Имя коллекции',
    'Chroma URL': 'URL Chroma',
    'Minimum Score (%)': 'Минимальный балл (%)',
    Query: 'Запрос',
    Database: 'База данных',
    Autofix: 'Автопоправка',
    'JSON Structure': 'Структура JSON',
    'Human Message': 'Сообщение для человека',
    File: 'Файл',
    'Sentences Before': 'Предложения перед',
    'Sentences After': 'Предложения после',
    Lambda: 'Лямбда',
    'Input Key': 'Ключ ввода',
    'Chain Option': 'Опция цепочки',
    'Get Relative Links Method': 'Метод получения относительных ссылок',
    'Model Name': 'Имя модели',
    'Chain Description': 'Описание цепочки',
    'Return Direct': 'Прямой возврат',
    BaseOptions: 'Базовые опции',
    'Base Path to load': 'Базовый путь для загрузки',
    'Context Window Size': 'Размер контекстного окна',
    'Number of GQA groups': 'Количество групп GQA',
    'Number of GPU': 'Количество графических процессоров GPU',
    'Number of Thread': 'количество потоков',
    'Repeat Last N': 'Повторить последнюю N',
    'Repeat Penalty': 'Повторный штраф',
    'Stop Sequence': 'Остановить последовательность',
    'Tail Free Sampling': 'Выборка без хвоста',
    'Select Tool': 'Выбрать инструмент',
    Model: 'Модель',
    Prompt: 'Промпт',
    'File Key': 'Ключ файла',
    'Node IDs': 'Айди узлов',
    'Additional Inputs': 'Дополнительные входы',
    'Штраф за повторение': 'Штраф за повторение',
    'Error Message': 'Сообщение ошибки',
    'Input Moderation': 'Модерация ввода',
    'Get Relative Links Limit': 'Получить лимит относительных ссылок',
    'Selector (CSS)': 'Селектор (CSS)',
    'Session Id': 'ID сессии',
    'Session Timeouts': 'Таймауты сеансов',
    Examples: 'Примеры',
    'Example Separator': 'Пример разделителя',
    'Template Format': 'Формат шаблона',
    Suffix: 'Суффикс',
    Prefix: 'Префикс',
    'Csv File': 'Csv Файл',
    'Custom Parameters': 'Пользовательские параметры',
    Endpoint: 'Точка вывода',
    'Auto Summary Template': 'Шаблон автоматического сводного отчета',
    'Human Prefix': 'Человеческий префикс',
    'Output Key': 'Ключ вывода',
    'AI Prefix': 'AI префикс',
    'Vector Dimension': 'Векторное измерение',
    'Additional Collection Cofiguration': 'Дополнительная конфигурация коллекции',
    'Qdrant Search Filter': 'Поисковый фильтр Qdrant',
    Similarity: 'Сходство',
    'Qdrant Collection Name': 'Название коллекции Qdrant',
    'Qdrant Server URL': 'URL-адрес сервера Qdrant',
    'Prompt Name': 'Имя Промпта',
    'Prompt Retriever': 'Промпт ретривер',
    'Chroma Metadata Filter': 'Фильтр метаданных Chroma',
    'Table Name': 'Имя таблицы',
    'Query Name': 'Имя запроса',
    'Supabase Metadata Filter': 'Фильтр метаданных Supabase',
    Text: 'Текст',
    'Replace Index on Upsert': 'Заменить индекс при Upsert',
    'Index Name': 'Имя индекса',
    'Metadata Field': 'Поле метаданных',
    'Content Field': 'Поле контента',
    'Vector Field': 'Векторное поле',
    'OpenAI/Azure Chat Model': 'Модель чата OpenAI/Azure',
    'Content Column Name': 'Имя столбца содержимого',
    'Vector Column Name': 'Имя векторного столбца',
    'Metadata Column Name': 'Имя столбца метаданных',
    Host: 'Хост',
    'Connection string or file path (sqlite only)': 'Строка подключения или путь к файлу (только sqlite)',
    "Sample table's rows info": 'Информация о строках таблицы примера',
    'Ignore Tables': 'Игнорировать таблицы',
    'Include Tables': 'Включить таблицы',
    'Custom Prompt': 'Пользовательский промпт',
    'Metadata Filter': 'Фильтр метаданных',
    'YAML Link': 'YAML Ссылка',
    'YAML File': 'YAML Файл',
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
        'OpenAI Assistant, который имеет инструкции и может использовать модели, инструменты и знания для ответа на запросы пользователей.',
    'Engage with data sources such as YouTube Transcripts, Google, and more through intelligent Q&A interactions':
        'Взаимодействуйте с такими источниками данных, как YouTube Transcripts, Google и другими, посредством интеллектуального взаимодействия с вопросами и ответами.',
    'Generate image using Replicate Stability text-to-image generative AI model':
        'Создайте изображение с помощью генеративной модели искусственного интеллекта Replication Stability для преобразования текста в изображение.',
    'Use Anthropic Claude with 200k context window to ingest whole document for QnA':
        'Используйте Anthropic Claude с контекстным окном размером 200 тыс., чтобы вставить весь документ для QnA.',
    'QnA chain using Ollama local LLM, LocalAI embedding model, and Faiss local vector store':
        'Цепочка QnA с использованием локального LLM Ollama, модели внедрения LocalAI и локального векторного хранилища Faiss',
    'Detect text that could generate harmful output and prevent it from being sent to the language model':
        'Обнаруживайте текст, который может генерировать вредоносный вывод, и предотвращайте его отправку в языковую модель.',
    'Upsert multiple files with metadata and filter by it using conversational retrieval QA chain':
        'Вставьте несколько файлов с метаданными и отфильтруйте их с помощью цепочки контроля качества диалогового поиска.',
    'Use long term memory like Zep to differentiate conversations between users with sessionId':
        'Используйте долговременную память, например Zep, чтобы различать разговоры между пользователями с идентификатором sessionId.',
    'A chain that automatically picks an appropriate retriever from multiple different vector databases':
        'Цепочка, которая автоматически выбирает подходящего ретривера из нескольких различных баз данных векторов.',
    'An agent that uses ReAct logic to decide what action to take':
        'Агент, который использует логику ReAct, чтобы решить, какое действие предпринять.'
}
