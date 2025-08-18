---
description: Learn how to embed our in-house chat widget
jsonld:
    type: TechArticle
    headline: Embed the AnswerAgent Chat Widget
---

---

# Embed

---

You can embed the chat widget on your website. Simply copy the provided code and paste it anywhere within the tag of your HTML file.

<figure><img src="/.gitbook/assets/image (8) (2) (1) (1).png" alt="" /><figcaption></figcaption></figure>

## Widget Setup

The following video shows how to inject the widget script into any webpage.

<iframe src="https://github.com/FlowiseAI/Flowise/assets/26460777/c128829a-2d08-4d60-b821-1e41a9e677d0"></iframe>

## Chatflow Config

You can pass `chatflowConfig` JSON object to override existing configuration. This is the same as [#override-config](/docs/api/prediction/create-prediction 'mention') in API.

```html
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/npm/aai-embed/dist/web.js'
    Chatbot.init({
        chatflowid: 'abc',
        apiHost: 'http://localhost:3000',
        chatflowConfig: {
            sessionId: '123',
            returnSourceDocuments: true
        }
    })
</script>
```

## Observer Config

This allows you to execute code in parent based upon signal observations within the chatbot.

```html
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/npm/aai-embed/dist/web.js'
    Chatbot.init({
        chatflowid: 'abc',
        apiHost: 'http://localhost:3000',
        observersConfig: {
            // User input has changed
            observeUserInput: (userInput) => {
                console.log({ userInput })
            },
            // The bot message stack has changed
            observeMessages: (messages) => {
                console.log({ messages })
            },
            // The bot loading signal changed
            observeLoading: (loading) => {
                console.log({ loading })
            }
        }
    })
</script>
```

## Theme

You can change the pop up button properties, as well as the chat window:

```html
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/npm/aai-embed/dist/web.js'
    Chatbot.init({
        chatflowid: '91e9c803-1234-5a6b7-8207-3c0915d71c5f',
        apiHost: 'https://prod.studio.theanswer.ai',
        chatflowConfig: {
            // topK: 2
        },
        observersConfig: {
            // (optional) Allows you to execute code in parent based upon signal observations within the chatbot.
            // The userinput field submitted to bot ("" when reset by bot)
            observeUserInput: (userInput) => {
                console.log({ userInput })
            },
            // The bot message stack has changed
            observeMessages: (messages) => {
                console.log({ messages })
            },
            // The bot loading signal changed
            observeLoading: (loading) => {
                console.log({ loading })
            }
        },
        theme: {
            button: {
                backgroundColor: '#3B81F6',
                right: 20,
                bottom: 20,
                size: 48, // small | medium | large | number
                dragAndDrop: true,
                iconColor: 'white',
                customIconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                autoWindowOpen: {
                    autoOpen: true, //parameter to control automatic window opening
                    openDelay: 2, // Optional parameter for delay time in seconds
                    autoOpenOnMobile: false //parameter to control automatic window opening in mobile
                }
            },
            tooltip: {
                showTooltip: true,
                tooltipMessage: 'Hi There 👋!',
                tooltipBackgroundColor: 'black',
                tooltipTextColor: 'white',
                tooltipFontSize: 16
            },
            chatWindow: {
                showTitle: true,
                showAgentMessages: true,
                title: 'AnswerAgentAI Bot',
                titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                welcomeMessage: 'Hello! This is custom welcome message',
                errorMessage: 'This is a custom error message',
                backgroundColor: '#ffffff',
                backgroundImage: 'enter image path or link', // If set, this will overlap the background color of the chat window.
                height: 700,
                width: 400,
                fontSize: 16,
                starterPrompts: ['What is a bot?', 'Who are you?'], // It overrides the starter prompts set by the chat flow passed
                starterPromptFontSize: 15,
                clearChatOnReload: false, // If set to true, the chat will be cleared when the page reloads.
                botMessage: {
                    backgroundColor: '#f7f8ff',
                    textColor: '#303235',
                    showAvatar: true,
                    avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                },
                userMessage: {
                    backgroundColor: '#3B81F6',
                    textColor: '#ffffff',
                    showAvatar: true,
                    avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
                },
                textInput: {
                    placeholder: 'Type your question',
                    backgroundColor: '#ffffff',
                    textColor: '#303235',
                    sendButtonColor: '#3B81F6',
                    maxChars: 50,
                    maxCharsWarningMessage: 'You exceeded the characters limit. Please input less than 50 characters.',
                    autoFocus: true, // If not used, autofocus is disabled on mobile and enabled on desktop. true enables it on both, false disables it on both.
                    sendMessageSound: true,
                    // sendSoundLocation: "send_message.mp3", // If this is not used, the default sound effect will be played if sendSoundMessage is true.
                    receiveMessageSound: true
                    // receiveSoundLocation: "receive_message.mp3", // If this is not used, the default sound effect will be played if receiveSoundMessage is true.
                },
                feedback: {
                    color: '#303235'
                },
                footer: {
                    textColor: '#303235',
                    text: 'Powered by',
                    company: 'AnswerAgentAI',
                    companyLink: 'https://theanswer.ai'
                }
            }
        }
    })
</script>
```
