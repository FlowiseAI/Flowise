import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from 'routes'

// defaultTheme
import themes from 'themes'

// project imports
import NavigationScroll from 'layout/NavigationScroll'

// ==============================|| APP ||============================== //

const App = () => {
    const useYandexMetrika = () => {
        let ymID
        switch (window.location.hostname) {
            case 'u1.start-ai.ru':
                ymID = 95948128
                break
            case 'u2.start-ai.ru':
                ymID = 95948132
                break
            case 'u3.start-ai.ru':
                ymID = 95948136
                break
            case 'u4.start-ai.ru':
                ymID = 95948139
                break
            case 'u5.start-ai.ru':
                ymID = 95948140
                break
        }
        useEffect(() => {
            // Функция инициализации метрики
            ;(function (m, e, t, r, i, k, a) {
                m[i] =
                    m[i] ||
                    function () {
                        ;(m[i].a = m[i].a || []).push(arguments)
                    }
                m[i].l = 1 * new Date()

                // Проверка, загружен ли уже скрипт
                for (let j = 0; j < document.scripts.length; j++) {
                    if (document.scripts[j].src === r) return
                }

                // Создание и добавление скрипта
                k = e.createElement(t)
                a = e.getElementsByTagName(t)[0]
                k.async = 1
                k.src = r
                a.parentNode.insertBefore(k, a)
            })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym')

            // Инициализация с конкретным ID метрики
            ym(ymID, 'init', {
                defer: true,
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true,
                webvisor: true
            })
        }, [])
    }
    useYandexMetrika()
    const [targetElement, setTargetElement] = useState()

    const target = document.querySelector('#root')

    const config = { childList: true, subtree: true }
    const callback = function (mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.matches && addedNode.matches('flowise-fullchatbot')) {
                        // Получаем или создаем shadow DOM элемент
                        const shadowRoot = addedNode.shadowRoot || addedNode.attachShadow({ mode: 'open' })

                        // Определяем функцию обратного вызова для MutationObserver внутри shadowRoot
                        const shadowObserverCallback = function (mutations, observer) {
                            for (const shadowMutation of mutations) {
                                if (shadowMutation.type === 'childList' && shadowMutation.target === shadowRoot) {
                                    // Теперь вы можете выполнить ваш запрос внутри shadow DOM
                                    setTargetElement(shadowRoot.querySelector('div'))
                                }
                            }
                        }

                        // Создаем новый MutationObserver для отслеживания изменений внутри shadowRoot
                        const shadowObserver = new MutationObserver(shadowObserverCallback)

                        // Начинаем отслеживание изменений
                        shadowObserver.observe(shadowRoot, { childList: true, subtree: true })
                    }
                }
            }
        }
    }

    const observer = new MutationObserver(callback)
    observer.observe(target, config)
    useEffect(() => {
        if (targetElement != null) {
            const hrefBadge = targetElement.querySelector('#lite-badge')
            hrefBadge.setAttribute('href', '#')
            const parentSpan = hrefBadge.parentElement
            parentSpan.textContent = 'Разработано на платформе Start.AI'
            const spanBadge = hrefBadge.querySelector('span')
            spanBadge.textContent = ' Разработано на платформе Start.AI'
        }
    }, [targetElement])
    const customization = useSelector((state) => state.customization)
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <NavigationScroll>
                    <Routes />
                </NavigationScroll>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
