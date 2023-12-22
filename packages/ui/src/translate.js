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
    Input: 'Ввод данных',
    Output: 'Ввывод данных',
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
    Label: 'Метка',
    Type: 'Тип',
    Name: 'Имя',
    label: 'Метка',
    type: 'Тип',
    name: 'Имя',
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
        'Агент, который использует логику ReAct, чтобы решить, какое действие предпринять.',
    'Upstash Redis REST URL': 'Upstash Redis REST URL',
    Token: 'Токен',
    'Upstash Redis REST Token': 'Токен REST Upstash Redis',
    'Vectara Customer ID': 'ID клиента Vectara',
    'Vectara Corpus ID': 'ID корпуса Vectara',
    'Vectara API Key': 'Ключ API Vectara',
    'Weaviate API Key': 'Ключ API Weaviate',
    'Zapier NLA Api Key': 'Ключ API Zapier NLA',
    'Qdrant API Key': 'Ключ API Qdrant',
    'Redis Host': 'Хост Redis',
    Port: 'Порт',
    '<REDIS_USERNAME>': '<REDIS_USERNAME>',
    '<REDIS_PASSWORD>': '<REDIS_PASSWORD>',
    'Redis URL': 'URL Redis',
    'Replicate Api Key': 'Ключ API Replicate',
    'SearchApi API Key': 'Ключ API SearchApi',
    'Serp Api Key': 'Ключ API Serp',
    'Serper Api Key': 'Ключ API Serper',
    '<SINGLESTORE_USERNAME>': '<SINGLESTORE_USERNAME>',
    '<SINGLESTORE_PASSWORD>': '<SINGLESTORE_PASSWORD>',
    'Supabase API Key': 'Ключ API Supabase',
    User: 'Пользователь',
    '<POSTGRES_USERNAME>': '<POSTGRES_USERNAME>',
    Password: 'Пароль',
    '<POSTGRES_PASSWORD>': '<POSTGRES_PASSWORD>',
    'APP ID': 'ID приложения',
    '<LLMonitor_APP_ID>': '<LLMonitor_APP_ID>',
    'Milvus User': 'Пользователь Milvus',
    'Milvus Password': 'Пароль Milvus',
    'ATLAS Connection URL': 'URL подключения ATLAS',
    'mongodb+srv://<user>:<pwd>@cluster0.example.mongodb.net/?retryWrites=true&w=majority':
        'mongodb+srv://<user>:<pwd>@cluster0.example.mongodb.net/?retryWrites=true&w=majority',
    'Client ID': 'ID клиента',
    'Notion Integration Token': 'Токен интеграции Notion',
    'OpenAI Api Key': 'Ключ API OpenAI',
    'OpenAPI Token': 'Токен OpenAPI',
    'Auth Token. For example: Bearer <TOKEN>': 'Токен авторизации. Например: Bearer <TOKEN>',
    'Pinecone Api Key': 'Ключ API Pinecone',
    'Pinecone Environment': 'Окружение Pinecone',
    'Elasticsearch Endpoint': 'Конечная точка Elasticsearch',
    'Elasticsearch API Key': 'Ключ API Elasticsearch',
    'Cloud ID': 'ID облака',
    'ElasticSearch User': 'Пользователь ElasticSearch',
    'ElasticSearch Password': 'Пароль ElasticSearch',
    '<FIGMA_ACCESS_TOKEN>': '<FIGMA_ACCESS_TOKEN>',
    '<GITHUB_ACCESS_TOKEN>': '<GITHUB_ACCESS_TOKEN>',
    'Google Application Credential File Path': 'Путь к файлу учетных данных Google Application',
    'your-path/application_default_credentials.json': 'your-path/application_default_credentials.json',
    'Google Credential JSON Object': 'JSON-объект учетных данных Google',
    'JSON object of your google application credential. You can also use the file path (either one)':
        'JSON-объект учетных данных вашего приложения Google. Вы также можете использовать путь к файлу (любой из них)',
    '`{': '`{',
    'Project ID': 'ID проекта',
    'Project ID of GCP. If not provided, it will be read from the credential file':
        'ID проекта GCP. Если не указан, будет прочитан из файла учетных данных',
    'MakerSuite API Key': 'Ключ API MakerSuite',
    'Google Custom Search Api Key': 'Ключ API пользовательского поиска Google',
    'Programmable Search Engine ID': 'ID программного поисковика',
    'HuggingFace Api Key': 'Ключ API HuggingFace',
    'Secret Key': 'Секретный ключ',
    'sk-lf-abcdefg': 'sk-lf-abcdefg',
    'Public Key': 'Публичный ключ',
    'pk-lf-abcdefg': 'pk-lf-abcdefg',
    'API Key': 'Ключ API',
    '<LANGSMITH_API_KEY>': '<LANGSMITH_API_KEY>',
    'Access Key': 'Ключ доступа',
    'Secret Access Key': 'Секретный ключ доступа',
    'Access Token': 'Токен доступа',
    '<AIRTABLE_ACCESS_TOKEN>': '<AIRTABLE_ACCESS_TOKEN>',
    'Anthropic Api Key': 'Ключ API Anthropic',
    'Apify API': 'API Apify',
    'AWS Access Key': 'Ключ доступа AWS',
    '<AWS_ACCESS_KEY_ID>': '<AWS_ACCESS_KEY_ID>',
    'The access key for your AWS account.': 'Ключ доступа к вашему аккаунту AWS.',
    'AWS Secret Access Key': 'Секретный ключ доступа AWS',
    '<AWS_SECRET_ACCESS_KEY>': '<AWS_SECRET_ACCESS_KEY>',
    'The secret key for your AWS account.': 'Секретный ключ для вашего аккаунта AWS.',
    'AWS Session Key': 'Ключ сессии AWS',
    '<AWS_SESSION_TOKEN>': '<AWS_SESSION_TOKEN>',
    'The session key for your AWS account. This is only needed when you are using temporary credentials.':
        'Ключ сессии для вашего аккаунта AWS. Необходим только при использовании временных учетных данных.',
    'Azure OpenAI Api Key': 'Ключ API Azure OpenAI',
    '`Refer to <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/quickstart?tabs=command-line&pivots=rest-api#set-up">official guide</a> on how to create API key on Azure OpenAI`':
        '`Ссылка на <a target="_blank" href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/quickstart?tabs=command-line&pivots=rest-api#set-up">официальное руководство</a> по созданию ключа API на Azure OpenAI`',
    'Azure OpenAI Api Instance Name': 'Имя экземпляра API Azure OpenAI',
    'YOUR-INSTANCE-NAME': 'YOUR-INSTANCE-NAME',
    'Azure OpenAI Api Deployment Name': 'Имя развертывания API Azure OpenAI',
    'YOUR-DEPLOYMENT-NAME': 'YOUR-DEPLOYMENT-NAME',
    'Azure OpenAI Api Version': 'Версия API Azure OpenAI',
    '2023-06-01-preview': '2023-06-01-preview',
    '': '',
    'BraveSearch Api Key': 'Ключ API BraveSearch',
    'Chroma Api Key': 'Ключ API Chroma',
    'Cohere Api Key': 'Ключ API Cohere',
    '<CONFLUENCE_ACCESS_TOKEN>': '<CONFLUENCE_ACCESS_TOKEN>',
    Username: 'Имя пользователя',
    '<CONFLUENCE_USERNAME>': '<CONFLUENCE_USERNAME>',
    'Please refer to the <a target="_blank" href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a> for instructions on how to create an API key, and visit the <a target="_blank" href="https://programmablesearchengine.google.com/controlpanel/create">Search Engine Creation page</a> to learn how to generate your Search Engine ID.':
        'Пожалуйста, обратитесь к <a target="_blank" href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a> за инструкциями по созданию ключа API, и посетите <a target="_blank" href="https://programmablesearchengine.google.com/controlpanel/create">страницу создания поисковой системы</a>, чтобы узнать, как сгенерировать ваш ID поисковой системы.',
    'Refer to <a target="_blank" href="https://llmonitor.com/docs">official guide</a> to get APP ID':
        'Ссылка на <a target="_blank" href="https://llmonitor.com/docs">официальное руководство</a> для получения APP ID',
    'Refer to <a target="_blank" href="https://langfuse.com/docs/flowise">integration guide</a> on how to get API keys on Langfuse':
        'Ссылка на <a target="_blank" href="https://langfuse.com/docs/flowise">руководство по интеграции</a> о том, как получить ключи API на Langfuse',
    'Refer to <a target="_blank" href="https://docs.smith.langchain.com/">official guide</a> on how to get API key on Langsmith':
        'Ссылка на <a target="_blank" href="https://docs.smith.langchain.com/">официальное руководство</a> о том, как получить ключ API на Langsmith',
    'You can find the Milvus Authentication from <a target="_blank" href="https://milvus.io/docs/authenticate.md#Authenticate-User-Access">here</a> page.':
        'Вы можете найти аутентификацию Milvus на <a target="_blank" href="https://milvus.io/docs/authenticate.md#Authenticate-User-Access">этой</a> странице.',
    'Refer to <a target="_blank" href="https://docs.momentohq.com/cache/develop/authentication/api-keys">official guide</a> on how to get API key on Momento':
        'Ссылка на <a target="_blank" href="https://docs.momentohq.com/cache/develop/authentication/api-keys">официальное руководство</a> о том, как получить ключ API на Momento',
    'Refer to <a target="_blank" href="https://docs.getmetal.io/misc-get-keys">official guide</a> on how to create API key and Client ID on Motorhead Memory':
        'Ссылка на <a target="_blank" href="https://docs.getmetal.io/misc-get-keys">официальное руководство</a> о том, как создать ключ API и Client ID на Motorhead Memory',
    'You can find integration token <a target="_blank" href="https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration">here</a>':
        'Вы можете найти токен интеграции <a target="_blank" href="https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration">здесь</a>',
    'Sign in to <a target="_blank" href="https://www.searchapi.io/">SearchApi</a> to obtain a free API key from the dashboard.':
        'Войдите на <a target="_blank" href="https://www.searchapi.io/">SearchApi</a>, чтобы получить бесплатный ключ API из панели управления.',
    'Refer to <a target="_blank" href="https://upstash.com/docs/redis/overall/getstarted">official guide</a> on how to create redis instance and get redis REST Token':
        'Ссылка на <a target="_blank" href="https://upstash.com/docs/redis/overall/getstarted">официальное руководство</a> о том, как создать экземпляр Redis и получить REST Token Redis',
    'Refer to <a target="_blank" href="https://docs.getzep.com/deployment/auth/">official guide</a> on how to create API key on Zep':
        'Ссылка на <a target="_blank" href="https://docs.getzep.com/deployment/auth/">официальное руководство</a> о том, как создать ключ API на Zep',
    'Refer to <a target="_blank" href="https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens">official guide</a> on how to get accessToken on Airtable':
        'Ссылка на <a target="_blank" href="https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens">официальное руководство</a> о том, как получить accessToken на Airtable',
    'You can find the Apify API token on your <a target="_blank" href="https://console.apify.com/account#/integrations">Apify account</a> page.':
        'Вы можете найти токен API Apify на странице <a target="_blank" href="https://console.apify.com/account#/integrations">вашего аккаунта Apify</a>.',
    'Refer to <a target="_blank" href="https://azure.microsoft.com/en-us/products/cognitive-services/openai-service">official guide</a> of how to use Azure OpenAI service':
        'Ссылка на <a target="_blank" href="https://azure.microsoft.com/en-us/products/cognitive-services/openai-service">официальное руководство</a> по использованию сервиса Azure OpenAI',
    'Refer to <a target="_blank" href="https://support.atlassian.com/confluence-cloud/docs/manage-oauth-access-tokens/">official guide</a> on how to get Access Token or <a target="_blank" href="https://id.atlassian.com/manage-profile/security/api-tokens">API Token</a> on Confluence':
        'Ссылка на <a target="_blank" href="https://support.atlassian.com/confluence-cloud/docs/manage-oauth-access-tokens/">официальное руководство</a> о том, как получить Access Token или <a target="_blank" href="https://id.atlassian.com/manage-profile/security/api-tokens">API Token</a> на Confluence',
    'Refer to <a target="_blank" href="https://www.elastic.co/guide/en/kibana/current/api-keys.html">official guide</a> on how to get an API Key from ElasticSearch':
        'Ссылка на <a target="_blank" href="https://www.elastic.co/guide/en/kibana/current/api-keys.html">официальное руководство</a> о том, как получить API ключ от ElasticSearch',
    'Use Cloud ID field to enter your Elastic Cloud ID or the URL of the Elastic server instance. Refer to <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/setting-up-authentication.html">official guide</a> on how to get User Password from ElasticSearch.':
        'Используйте поле Cloud ID, чтобы ввести ваш Elastic Cloud ID или URL экземпляра сервера Elastic. Ссылка на <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/setting-up-authentication.html">официальное руководство</a> о том, как получить пароль пользователя от ElasticSearch.',
    'Refer to <a target="_blank" href="https://www.figma.com/developers/api#access-tokens">official guide</a> on how to get accessToken on Figma':
        'Ссылка на <a target="_blank" href="https://www.figma.com/developers/api#access-tokens">официальное руководство</a> о том, как получить accessToken на Figma',
    'Refer to <a target="_blank" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">official guide</a> on how to get accessToken on Github':
        'Ссылка на <a target="_blank" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">официальное руководство</a> о том, как получить accessToken на Github',
    'Use the <a target="_blank" href="https://makersuite.google.com/app/apikey">Google MakerSuite API credential site</a> to get this key.':
        'Используйте <a target="_blank" href="https://makersuite.google.com/app/apikey">сайт учетных данных Google MakerSuite API</a>, чтобы получить этот ключ.',
    'Your <a target="_blank" href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html">AWS security credentials</a>. When unspecified, credentials will be sourced from the runtime environment according to the default AWS SDK behavior.':
        'Ваши <a target="_blank" href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html">учетные данные безопасности AWS</a>. Если не указаны, учетные данные будут получены из среды выполнения в соответствии с поведением по умолчанию SDK AWS.',
    'Agent used to to answer queries on Airtable table': 'Агент, используемый для ответов на запросы в таблице Airtable',
    'Autonomous agent with chain of thoughts for self-guided task completion':
        'Автономный агент с цепью мыслей для самостоятельного выполнения задач',
    'Task Driven Autonomous Agent which creates new task and reprioritizes task list based on objective':
        'Задача Driven Autonomous Agent, который создает новую задачу и перепланирует список задач на основе цели',
    'Conversational agent for a chat model. It will utilize chat specific prompts':
        'Разговорный агент для чат-модели. Он будет использовать специфические для чата подсказки',
    "An agent optimized for retrieval during conversation, answering questions based on past dialogue, all using OpenAI's Function Calling":
        'Агент, оптимизированный для извлечения информации во время разговора, отвечающий на вопросы на основе прошлых диалогов, все с использованием вызова функций OpenAI',
    'Agent used to to answer queries on CSV data': 'Агент, используемый для ответов на запросы по данным в формате CSV',
    'Agent that uses the ReAct logic to decide what action to take, optimized to be used with Chat Models':
        'Агент, использующий логику ReAct для принятия решения о действиях, оптимизированный для использования с чат-моделями',
    'Agent that uses the ReAct logic to decide what action to take, optimized to be used with LLMs':
        'Агент, использующий логику ReAct для принятия решения о действиях, оптимизированный для использования с LLMs',
    'An agent that uses OpenAI Assistant API to pick the tool and args to call':
        'Агент, который использует API OpenAI Assistant для выбора инструмента и аргументов для вызова',
    'An agent that uses Function Calling to pick the tool and args to call':
        'Агент, который использует вызов функций для выбора инструмента и аргументов для вызова',
    'Cache generated Embeddings in memory to avoid needing to recompute them.':
        'Кешировать сгенерированные вложения в памяти, чтобы избежать необходимости их повторного вычисления',
    'Cache LLM response in memory, will be cleared once app restarted':
        'Кешировать ответ LLM в памяти, будет очищен после перезапуска приложения',
    'Cache LLM response using Momento, a distributed, serverless cache':
        'Кешировать ответ LLM с использованием Momento, распределенного, бессерверного кеша',
    'Cache LLM response in Redis, useful for sharing cache across multiple processes or servers':
        'Кешировать ответ LLM в Redis, полезно для совместного использования кеша между несколькими процессами или серверами',
    'Cache generated Embeddings in Redis to avoid needing to recompute them.':
        'Кешировать сгенерированные вложения в Redis, чтобы избежать необходимости их повторного вычисления',
    'Cache LLM response in Upstash Redis, serverless data for Redis and Kafka':
        'Кешировать ответ LLM в Upstash Redis, бессерверные данные для Redis и Kafka',
    'Chain to run queries against GET API': 'Цепочка для выполнения запросов к API GET',
    'Chain to run queries against POST API': 'Цепочка для выполнения запросов к API POST',
    'Document QA - built on RetrievalQAChain to provide a chat history component':
        'Документ QA - построен на RetrievalQAChain для предоставления компонента истории чата',
    'Chat models specific conversational chain with memory': 'Специфическая для чат-моделей разговорная цепочка с памятью',
    'Chain to run queries against LLMs': 'Цепочка для выполнения запросов к LLMs',
    'Chain automatically picks an appropriate prompt from multiple prompt templates':
        'Цепочка автоматически выбирает подходящую подсказку из нескольких шаблонов подсказок',
    'QA Chain that automatically picks an appropriate vector store from multiple retrievers':
        'Цепочка QA, которая автоматически выбирает подходящее векторное хранилище из нескольких извлекателей',
    'QA chain to answer a question based on the retrieved documents': 'Цепочка QA для ответа на вопрос на основе извлеченных документов',
    'QA chain for Vectara': 'Цепочка QA для Vectara',
    'QA chain for vector databases': 'Цепочка QA для векторных баз данных',
    'Wrapper around AWS Bedrock large language models that use the Chat endpoint':
        'Оболочка вокруг больших языковых моделей AWS Bedrock, использующих конечную точку чата',
    'Wrapper around Azure OpenAI large language models that use the Chat endpoint':
        'Оболочка вокруг больших языковых моделей Azure OpenAI, использующих конечную точку чата',
    'Wrapper around Bittensor subnet 1 large language models': 'Оболочка вокруг больших языковых моделей Bittensor subnet 1',
    'Wrapper around ChatAnthropic large language models that use the Chat endpoint':
        'Оболочка вокруг больших языковых моделей ChatAnthropic, использующих конечную точку чата',
    'Wrapper around Google MakerSuite PaLM large language models using the Chat endpoint':
        'Оболочка вокруг больших языковых моделей Google MakerSuite PaLM с использованием конечной точки чата',
    'Wrapper around VertexAI large language models that use the Chat endpoint':
        'Оболочка вокруг больших языковых моделей VertexAI, использующих конечную точку чата',
    'Wrapper around HuggingFace large language models': 'Оболочка вокруг больших языковых моделей HuggingFace',
    'Use local LLMs like llama.cpp, gpt4all using LocalAI': 'Используйте локальные LLM, такие как llama.cpp, gpt4all, используя LocalAI',
    'Chat completion using open-source LLM on Ollama': 'Завершение чата с использованием открытых LLM на Ollama',
    'Wrapper around OpenAI large language models that use the Chat endpoint':
        'Оболочка вокруг больших языковых моделей OpenAI, использующих конечную точку чата',
    'Custom/FineTuned model using OpenAI Chat compatible API':
        'Пользовательская/настроенная модель, использующая совместимый с OpenAI Chat API',
    'Load data from Airtable table': 'Загрузить данные из таблицы Airtable',
    'Load data from an API': 'Загрузить данные из API',
    'Load data from Apify Website Content Crawler': 'Загрузить данные из Apify Website Content Crawler',
    'Load data from CSV files': 'Загрузить данные из файлов CSV',
    'Load data from DOCX files': 'Загрузить данные из файлов DOCX',
    'Load data from a Figma file': 'Загрузить данные из файла Figma',
    'Load data from folder with multiple files': 'Загрузить данные из папки с несколькими файлами',
    'Load data from GitBook': 'Загрузить данные из GitBook',
    'Load data from a GitHub repository': 'Загрузить данные из репозитория GitHub',
    'Load data from JSON files': 'Загрузить данные из файлов JSON',
    'Load data from JSON Lines files': 'Загрузить данные из файлов JSON Lines',
    'Load data from Notion Database (each row is a separate document with all properties as metadata)':
        'Загрузить данные из базы данных Notion (каждая строка - отдельный документ со всеми свойствами как метаданными)',
    'Load data from the exported and unzipped Notion folder': 'Загрузить данные из экспортированной и распакованной папки Notion',
    'Load data from Notion Page (including child pages all as separate documents)':
        'Загрузить данные с страницы Notion (включая все дочерние страницы как отдельные документы)',
    'Load data from PDF files': 'Загрузить данные из файлов PDF',
    'Load data from plain text': 'Загрузить данные из обычного текста',
    'Load data from webpages': 'Загрузить данные с веб-страниц',
    'Load Data from S3 Buckets': 'Загрузить данные из бакетов S3',
    'Load data from real-time search results': 'Загрузить данные из результатов поиска в реальном времени',
    'Load and process data from web search results': 'Загрузить и обработать данные из результатов веб-поиска',
    'Load data from subtitles files': 'Загрузить данные из файлов субтитров',
    'Load data from text files': 'Загрузить данные из текстовых файлов',
    'Use Unstructured.io to load data from a file path': 'Использовать Unstructured.io для загрузки данных из пути к файлу',
    'Use Unstructured.io to load data from a folder': 'Использовать Unstructured.io для загрузки данных из папки',
    'Search documents with scores from vector store': 'Поиск документов с оценками из векторного хранилища',
    'AWS Bedrock embedding models to generate embeddings for a given text':
        'Модели внедрения AWS Bedrock для создания внедрений для заданного текста',
    'Azure OpenAI API to generate embeddings for a given text': 'API Azure OpenAI для создания внедрений для заданного текста',
    'Cohere API to generate embeddings for a given text': 'API Cohere для создания внедрений для заданного текста',
    'Google MakerSuite PaLM API to generate embeddings for a given text':
        'API Google MakerSuite PaLM для создания внедрений для заданного текста',
    'Google vertexAI API to generate embeddings for a given text': 'API Google VertexAI для создания внедрений для заданного текста',
    'HuggingFace Inference API to generate embeddings for a given text':
        'API HuggingFace Inference для создания внедрений для заданного текста',
    'Use local embeddings models like llama.cpp': 'Использовать локальные модели внедрения, такие как llama.cpp',
    'Generate embeddings for a given text using open source model on Ollama':
        'Создавать внедрения для заданного текста с использованием открытой модели на Ollama',
    'OpenAI API to generate embeddings for a given text': 'API OpenAI для создания внедрений для заданного текста',
    'Wrapper around AWS Bedrock large language models': 'Оболочка вокруг больших языковых моделей AWS Bedrock',
    'Wrapper around Azure OpenAI large language models': 'Оболочка вокруг больших языковых моделей Azure OpenAI',
    'Load data from a Confluence Document': 'Загрузить данные из документа Confluence',
    'Wrapper around Cohere large language models': 'Оболочка вокруг больших языковых моделей Cohere',
    'Wrapper around Google MakerSuite PaLM large language models': 'Оболочка вокруг больших языковых моделей Google MakerSuite PaLM',
    'Wrapper around GoogleVertexAI large language models': 'Оболочка вокруг больших языковых моделей GoogleVertexAI',
    'Wrapper around open source large language models on Ollama': 'Оболочка для использования открытых больших языковых моделей на Ollama',
    'Wrapper around OpenAI large language models': 'Оболочка для использования больших языковых моделей OpenAI',
    'Use Replicate to run open source models on cloud': 'Используйте Replicate для запуска открытых моделей в облаке',
    'Remembers previous conversational back and forths directly': 'Запоминает предыдущие разговоры напрямую',
    'Uses a window of size k to surface the last k back-and-forth to use as memory':
        'Использует окно размером k, чтобы отображать последние k обратных сообщений для использования в качестве памяти',
    'Summarizes the conversation and stores the current summary in memory': 'Суммирует беседу и хранит текущее резюме в памяти',
    'Stores the conversation in dynamo db table': 'Сохраняет беседу в таблице DynamoDB',
    'Stores the conversation in MongoDB Atlas': 'Сохраняет беседу в MongoDB Atlas',
    'Use Motorhead Memory to store chat conversations': 'Используйте Motorhead Memory для хранения чат-бесед',
    'Summarizes the conversation and stores the memory in Redis server': 'Суммирует беседу и хранит память на сервере Redis',
    'Summarizes the conversation and stores the memory in Upstash Redis server':
        'Суммирует беседу и хранит память на сервере Upstash Redis',
    'Summarizes the conversation and stores the memory in zep server': 'Суммирует беседу и хранит память на сервере zep',
    'Check whether content complies with OpenAI usage policies.': 'Проверяет, соответствует ли содержание политикам использования OpenAI',
    'Check whether input consists of any text from Deny list, and prevent being sent to LLM':
        'Проверяет, содержит ли ввод текст из списка запретов, и предотвращает отправку LLM',
    'Parse the output of an LLM call as a comma-separated list of values':
        'Разбирает вывод вызова LLM в виде списка значений, разделенных запятыми',
    'Parse the output of an LLM call as a list of values.': 'Разбирает вывод вызова LLM в виде списка значений.',
    'Parse the output of an LLM call into a given (JSON) structure.': 'Разбирает вывод вызова LLM в заданную (JSON) структуру.',
    'Schema to represent a chat prompt': 'Схема для представления чат-подсказки',
    'Prompt template you can build with examples': 'Шаблон подсказки, который вы можете создать с примерами',
    'Schema to represent a basic prompt for an LLM': 'Схема для представления основной подсказки для LLM',
    'Use HyDE retriever to retrieve from a vector store': 'Используйте HyDE для извлечения данных из векторного хранилища',
    'Store prompt template with name & description to be later queried by MultiPromptChain':
        'Сохраняйте шаблон подсказки с именем и описанием для последующего запроса MultiPromptChain',
    'Return results based on the minimum similarity percentage': 'Возвращает результаты на основе минимального процента сходства',
    'Store vector store as retriever to be later queried by MultiRetrievalQAChain':
        'Сохраняет векторное хранилище как извлекатель для последующего запроса MultiRetrievalQAChain',
    'splits only on one type of character (defaults to "\\n\\n").': 'разбивает только по одному типу символов (по умолчанию "\\n\\n").',
    'Split documents based on language-specific syntax': 'Разбивает документы на основе языко-специфического синтаксиса',
    'Converts Html to Markdown and then split your content into documents based on the Markdown headers':
        'Преобразует HTML в Markdown, а затем разбивает ваш контент на документы на основе заголовков Markdown',
    'Split your content into documents based on the Markdown headers': 'Разбивает ваш контент на документы на основе заголовков Markdown',
    'Split documents recursively by different characters - starting with "\\n\\n", then "\\n", then " "':
        'Разбивает документы рекурсивно разными символами - начиная с "\\n\\n", затем "\\n", затем " "',
    'Splits a raw text string by first converting the text into BPE tokens, then split these tokens into chunks and convert the tokens within a single chunk back into text.':
        'Разбивает сырую текстовую строку, сначала преобразуя текст в BPE-токены, затем разбивая эти токены на части и преобразовывая токены внутри одной части обратно в текст.',
    'Execute actions using ChatGPT Plugin Url': 'Выполняет действия с использованием URL-плагина ChatGPT',
    'Wrapper around BraveSearch API - a real-time API to access Brave search results':
        'Оболочка вокруг API BraveSearch - реального API для доступа к результатам поиска Brave',
    'Perform calculations on response': 'Выполняет вычисления с ответом',
    'Use a chain as allowed tool for agent': 'Использует цепь как разрешенный инструмент для агента',
    'Wrapper around Google Custom Search API - a real-time API to access Google search results':
        'Оболочка вокруг API Google Custom Search - реального API для доступа к результатам поиска Google',
    'Load OpenAPI specification': 'Загружает спецификацию OpenAPI',
    'Read file from disk': 'Читает файл с диска',
    'Execute HTTP GET requests': 'Выполняет HTTP GET-запросы',
    'Execute HTTP POST requests': 'Выполняет HTTP POST-запросы',
    'Use a retriever as allowed tool for agent': 'Использует извлекатель как разрешенный инструмент для агента',
    'Real-time API for accessing Google Search data': 'Реальное API для доступа к данным Google Search',
    'Wrapper around SerpAPI - a real-time API to access Google search results':
        'Оболочка вокруг API SerpAPI - реального API для доступа к результатам поиска Google',
    'Wrapper around Serper.dev - Google Search API': 'Оболочка вокруг Serper.dev - API Google Search',
    'Gives agent the ability to visit a website and extract information':
        'Предоставляет агенту возможность посещать веб-сайты и извлекать информацию',
    'Write file to disk': 'Записывает файл на диск',
    'Load existing index from Chroma (i.e: Document has been upserted)':
        'Загружает существующий индекс из Chroma (т.е. документ был обновлен)',
    'Upsert documents to Chroma': 'Обновляет документы в Chroma',
    'Upsert embedded data and perform similarity search upon query using Chroma, an open-source embedding database':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием Chroma, открытой встраиваемой базы данных',
    'Load existing index from Elasticsearch (i.e: Document has been upserted)':
        'Загружает существующий индекс из Elasticsearch (т.е. документ был обновлен)',
    'Upsert documents to Elasticsearch': 'Обновляет документы в Elasticsearch',
    'Upsert embedded data and perform similarity search upon query using Elasticsearch, a distributed search and analytics engine':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием Elasticsearch, распределенного поискового и аналитического движка',
    "Use custom tool you've created in StartAI within chatflow":
        'Используйте созданный вами пользовательский инструмент в StartAI в рамках чатфлоу',
    'Load existing index from Faiss (i.e: Document has been upserted)':
        'Загружает существующий индекс из Faiss (т.е. документ был обновлен)',
    'Upsert documents to Faiss': 'Обновляет документы в Faiss',
    'Upsert embedded data and perform similarity search upon query using Faiss library from Meta':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием библиотеки Faiss от Meta',
    'In-memory vector store that stores embeddings and does an exact, linear search for the most similar embeddings.':
        'Векторное хранилище в памяти, которое хранит вложения и выполняет точный линейный поиск наиболее похожих вложений.',
    'Load existing collection from Milvus (i.e: Document has been upserted)':
        'Загружает существующую коллекцию из Milvus (т.е. документ был обновлен)',
    "Upsert embedded data and perform similarity search upon query using Milvus, world's most advanced open-source vector database":
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием Milvus, самой современной открытой векторной базы данных в мире',
    'Load existing data from MongoDB Atlas (i.e: Document has been upserted)':
        'Загружает существующие данные из MongoDB Atlas (т.е. документ был обновлен)',
    'Upsert documents to MongoDB Atlas': 'Обновляет документы в MongoDB Atlas',
    'Upsert embedded data and perform similarity search upon query using MongoDB Atlas, a managed cloud mongodb database':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием MongoDB Atlas, управляемой облачной базы данных MongoDB',
    'Load existing index from OpenSearch (i.e: Document has been upserted)':
        'Загружает существующий индекс из OpenSearch (т.е. документ был обновлен)',
    'Upsert documents to OpenSearch': 'Обновляет документы в OpenSearch',
    'Upsert embedded data and perform similarity search upon query using OpenSearch, an open-source, all-in-one vector database':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием OpenSearch, открытой базы данных с векторами всё-в-одном',
    'Load existing index from Pinecone (i.e: Document has been upserted)':
        'Загружает существующий индекс из Pinecone (т.е. документ был обновлен)',
    'Upsert documents to Pinecone': 'Обновляет документы в Pinecone',
    'Upsert embedded data and perform similarity search upon query using Pinecone, a leading fully managed hosted vector database':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием Pinecone, ведущей полностью управляемой хостинговой векторной базы данных',
    'Load existing index from Postgres using pgvector (i.e: Document has been upserted)':
        'Загружает существующий индекс из Postgres с использованием pgvector (т.е. документ был обновлен)',
    'Upsert documents to Postgres using pgvector': 'Обновляет документы в Postgres с использованием pgvector',
    'Upsert embedded data and perform similarity search upon query using pgvector on Postgres':
        'Обновляет встроенные данные и выполняет поиск по сходству при запросе с использованием pgvector в Postgres',
    'Upsert documents to Qdrant': 'Добавление документов в Qdrant',
    'Upsert embedded data and perform similarity search upon query using Qdrant, a scalable open source vector database written in Rust':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием Qdrant, масштабируемой векторной базы данных с открытым исходным кодом, написанной на Rust',
    'Upsert documents to Milvus': 'Добавление документов в Milvus',
    'Load existing index from Redis (i.e: Document has been upserted)':
        'Загрузка существующего индекса из Redis (т. е. документ был добавлен поверх)',
    'Upsert documents to Redis': 'Добавление документов в Redis',
    'Upsert embedded data and perform similarity search upon query using Redis, an open source, in-memory data structure store':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием Redis, системы управления данными с открытым исходным кодом, работающей в памяти',
    'Load existing document from SingleStore': 'Загрузка существующего документа из SingleStore',
    'Upsert documents to SingleStore': 'Добавление документов в SingleStore',
    'Upsert embedded data and perform similarity search upon query using SingleStore, a fast and distributed cloud relational database':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием SingleStore, быстрой и распределенной облачной реляционной базы данных',
    'Load existing index from Supabase (i.e: Document has been upserted)':
        'Загрузка существующего индекса из Supabase (т. е. документ был добавлен поверх)',
    'Upsert documents to Supabase': 'Добавление документов в Supabase',
    'Upsert embedded data and perform similarity search upon query using Supabase via pgvector extension':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием Supabase с помощью расширения pgvector',
    'Load existing index from Vectara (i.e: Document has been upserted)':
        'Загрузка существующего индекса из Vectara (т. е. документ был добавлен поверх)',
    'Upload files to Vectara': 'Загрузка файлов в Vectara',
    'Upsert documents to Vectara': 'Добавление документов в Vectara',
    'Upsert embedded data and perform similarity search upon query using Vectara, a LLM-powered search-as-a-service':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием Vectara, поисковой службы на основе LLM',
    'Load existing index from Weaviate (i.e: Document has been upserted)':
        'Загрузка существующего индекса из Weaviate (т. е. документ был добавлен поверх)',
    'Upsert documents to Weaviate': 'Добавление документов в Weaviate',
    'Upsert embedded data and perform similarity search upon query using Weaviate, a scalable open-source vector database':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием Weaviate, масштабируемой векторной базы данных с открытым исходным кодом',
    'Load existing index from Zep (i.e: Document has been upserted)':
        'Загрузка существующего индекса из Zep (т. е. документ был добавлен поверх)',
    'Upsert documents to Zep': 'Добавление документов в Zep',
    'Upsert embedded data and perform similarity search upon query using Zep, a fast and scalable building block for LLM apps':
        'Добавление встроенных данных и выполнение поиска схожих элементов при запросе с использованием Zep, быстрого и масштабируемого строительного блока для приложений LLM',
    'Chain that automatically select and call APIs based only on an OpenAPI spec':
        'Цепочка, которая автоматически выбирает и вызывает API только на основе спецификации OpenAPI.',
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
    'Similarity Score Threshold Retriever': 'Верните результаты на основе минимального процента сходства',
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
    'Custom Tool': 'Используйте пользовательский инструмент, созданный вами в StartAI в рамках чат-потока',
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
    'Zep Upsert Document': 'Добавляйте документы в Zep',
    'This node will be deprecated in the next release. Change to a new node tagged with NEW':
        'Этот узел будет объявлен устаревшим в следующем выпуске. Перейти на новый узел с тегом NEW.',
    'Embedded Field': 'Встроенное поле',
    'Name of the field (column) that contains the Embedding': 'Имя поля (столбца), содержащего встраивание',
    'Embedding Dimension': 'Внедрение измерения',
    'Waiting for response...': 'Ожидание ответа...',
    'Type your question...': 'Введите вопрос...',
    'Past conversation history between user and AI': 'История прошлых разговоров между пользователем и ИИ',
    "User's question from chatbox": 'Вопрос пользователя из чата',
    'You can get your API key from official <a target="_blank" href="https://console.mistral.ai/">console</a> here.':
        'Вы можете получить ключ API на официальной <a target="_blank" href="https://console.mistral.ai/">консоли</a> здесь',
    'You can get your API key from official <a target="_blank" href="https://ai.google.dev/tutorials/setup">page</a> here.':
        'Вы можете получить ключ API на официальной <a target="_blank" href="https://ai.google.dev/tutorials/setup">странице</a> здесь.',
    'If provided, will override model selected from Model Name option':
        'Если указано, будет переопределена модель, выбранная в параметре «Название модели».',
    'Wrapper around Google Gemini large language models that use the Chat endpoint':
        'Оболочка больших языковых моделей Google Gemini, использующих конечную точку Chat',
    'Max Output Tokens': 'Максимальное количество токенов вывода',
    'Wrapper around Mistral large language models that use the Chat endpoint':
        'Оболочка больших языковых моделей Mistral, использующих конечную точку Chat',
    'What sampling temperature to use, between 0.0 and 1.0. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.':
        'Какую температуру отбора проб использовать: от 0,0 до 1,0. Более высокие значения, например 0,8, сделают результат более случайным, а более низкие значения, например 0,2, сделают его более целенаправленным и детерминированным.',
    'The maximum number of tokens to generate in the completion.':
        'Максимальное количество токенов, которые можно сгенерировать при завершении.',
    'Nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.':
        'Ядерная выборка, где модель учитывает результаты токенов с массой вероятности top_p. Таким образом, 0,1 означает, что учитываются только токены, составляющие 10% верхней массы вероятности.',
    'The seed to use for random sampling. If set, different calls will generate deterministic results.':
        'Начальное значение, используемое для случайной выборки. Если установлено, разные вызовы будут генерировать детерминированные результаты.',
    'Whether to inject a safety prompt before all conversations.': 'Вводить ли подсказку о безопасности перед всеми разговорами.',
    'Google Generative API to generate embeddings for a given text': 'Google Generative API для создания вложений для заданного текста',
    'Google Generative AI credential.': 'Учетные данные Google Generative AI.',
    'Type of task for which the embedding will be used': 'Тип задачи, для которой будет использоваться встраивание',
    'MistralAI API to generate embeddings for a given text': 'MistralAI API для генерации вложений для заданного текста',
    'Override Endpoint': 'Переопределить конечную точку',
    'Window of size k to surface the last k back-and-forth to use as memory.':
        'Окно размера k для отображения последнего k туда и обратно для использования в качестве памяти.',
    Moderation: 'Модерация',
    "Text was found that violates OpenAI's content policy.": 'Обнаружен текст, нарушающий политику OpenAI в отношении контента.',
    'OpenAI API key not found': 'Ключ OpenAI API не найден',
    'Deny List': 'Список запретов',
    'ignore previous instructions\ndo not follow the directions\nyou must ignore all previous instructions':
        'игнорировать предыдущие инструкции\nне следовать указаниям\nвы должны игнорировать все предыдущие инструкции',
    'An array of string literals (enter one per line) that should not appear in the prompt text.':
        'Массив строковых литералов (вводите по одному в строке), которые не должны появляться в тексте приглашения.',
    'Cannot Process! Input violates content moderation policies.': 'Невозможно обработать! Ввод нарушает правила модерации контента.',
    Length: 'Длина',
    Separator: 'Разделитель',
    'Separator between values': 'Разделитель между значениями',
    'Number of values to return': 'Количество возвращаемых значений',
    Property: 'Свойство',
    answer: 'отвечат',
    source: 'источник',
    Utilities: 'Утилиты',
    'Execute custom javascript function': 'Выполнить пользовательскую функцию JavaScript',
    'Input Variables': 'Входные переменные',
    'Input variables can be used in the function with prefix $. For example: $var':
        'Входные переменные можно использовать в функции с префиксом $. Например: $var',
    'Function Name': 'Имя функции',
    'Javascript Function': 'Функция Javascript',
    boolean: 'логическое значение (boolean)',
    array: 'массив',
    Array: 'массив',
    Boolean: 'логическое значение (boolean)',
    'Get variable that was saved using Set Variable node': 'Получить переменную, сохраненную с помощью узла Set Variable.',
    'Variable Name': 'Имя переменной',
    'Split flows based on If Else javascript functions': 'Разделение потоков на основе функций JavaScript If Else',
    'IfElse Name': 'IfElse Имя',
    'If Function': 'If функция',
    'Function must return a value': 'Функция должна возвращать значение',
    'Else Function': 'Else функция',
    'Set variable which can be retrieved at a later stage. Variable is only available during runtime.': '',
    'Vector Stores': 'Установите переменную, которую можно будет получить позже. Переменная доступна только во время выполнения.',
    'Task Type': 'Тип задачи',
    POPULAR: 'популярный',
    NEW: 'новый',
    popular: 'популярный',
    new: 'новый',
    'Based on the table schema below, question, SQL query, and SQL response, write a natural language response, be details as possible:\n------------\nSCHEMA: {schema}\n------------\nQUESTION: {question}\n------------\nSQL QUERY: {sqlQuery}\n------------\nSQL RESPONSE: {sqlResponse}\n------------\nNATURAL LANGUAGE RESPONSE:':
        'На основе приведенной ниже схемы таблицы, вопроса, запроса SQL и ответа SQL напишите ответ на естественном языке, указав как можно больше подробностей:\n------------\nSCHEMA: {schema}\n- -----------\nВОПРОС: {вопрос}\n------------\nSQL ЗАПРОС: {sqlQuery}\n---------- --\nОТВЕТ SQL: {sqlResponse}\n------------\nОТВЕТ НА ЕСТЕСТВЕННОМ ЯЗЫКЕ:',
    'Manually construct prompts to query a SQL database': 'Вручную создавайте запросы для запроса базы данных SQL.'
}
