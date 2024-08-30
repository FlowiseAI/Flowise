---
description: Learn how to embed our in-house chat widget
---

# Embed

---

You can embed the chat widget on your website. Simply copy the provided code and paste it anywhere within the tag of your HTML file.

<figure><img src="/.gitbook/assets/image (8) (2) (1) (1).png" alt="" /><figcaption></figcaption></figure>

## Widget Setup

The following video shows how to inject the widget script into any webpage.

<iframe src="https://github.com/FlowiseAI/Flowise/assets/26460777/c128829a-2d08-4d60-b821-1e41a9e677d0"></iframe>

## Chatflow Config

You can pass `chatflowConfig` JSON object to override existing configuration. This is the same as [#override-config](api.md#override-config 'mention') in API.

```html
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js'
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
    import Chatbot from 'https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js'
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
    import Chatbot from 'https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js'
    Chatbot.init({
        chatflowid: 'abc',
        apiHost: 'http://localhost:3000',
        theme: {
            button: {
                backgroundColor: '#3B81F6',
                right: 20,
                bottom: 20,
                size: 48, // small | medium | large | number
                dragAndDrop: true,
                iconColor: 'white',
                customIconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg'
            },
            tooltip: {
                showTooltip: true,
                tooltipMessage: 'Hi There 👋!',
                tooltipBackgroundColor: 'black',
                tooltipTextColor: 'white',
                tooltipFontSize: 16
            },
            chatWindow: {
                showTitle: true, // show/hide the title bar
                title: 'Flowise Bot',
                titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                showAgentMessages: true,
                welcomeMessage: 'Hello! This is custom welcome message',
                errorMessage: 'This is a custom error message',
                backgroundColor: '#ffffff',
                height: 700,
                width: 400,
                fontSize: 16,
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
                    company: 'Flowise',
                    companyLink: 'https://flowiseai.com'
                }
            }
        }
    })
</script>
```

**Note:** See full [configuration list](https://github.com/FlowiseAI/FlowiseChatEmbed#configuration).

## Custom Modificaton

To modify the full source code of embedded chat widget, follow these steps:

1. Fork the [Flowise Chat Embed](https://github.com/FlowiseAI/FlowiseChatEmbed) repository
2. Then you can make any code changes
3. Run `pnpm build` to pick up the changes
4. Push changes to the forked repo
5. You can then use it as embedded chat like so:

Replace `username` to your Github username, and `forked-repo` to your forked repo.

````html
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/gh/username/forked-repo/dist/web.js'
    Chatbot.init({
        chatflowid: 'chatflow-id',
        apiHost: 'http://localhost:3000'
    })
</script>

<figure>
    <img src="/.gitbook/assets/image (1) (1) (2).png" alt="" width="563" />
    <figcaption></figcaption>
</figure>

```html
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/gh/HenryHengZJ/FlowiseChatEmbed-Test/dist/web.js'
    Chatbot.init({
        chatflowid: 'chatflow-id',
        apiHost: 'http://localhost:3000'
    })
</script>
````

:::info
An alternative to jsdelivr is unpkg. Here is an example:
[https://unpkg.com/flowise-embed/dist/web.js](https://unpkg.com/flowise-embed/dist/web.js)
:::

## CORS

When using embedded chat widget, there's chance that you might face CORS issue like:

:::danger
Access to fetch at 'https://\<your-flowise.com>/api/v1/prediction/' from origin 'https://\<your-flowise.com>' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
:::

To fix it, specify the following environment variables:

```
CORS_ORIGINS=*
IFRAME_ORIGINS=*
```

For example, if you are using `npx flowise start`

```
npx flowise start --CORS_ORIGINS=* --IFRAME_ORIGINS=*
```

If using Docker, place the env variables inside `Flowise/docker/.env`

If using local Git clone, place the env variables inside `Flowise/packages/server/.env`

## Video Tutorials

These two videos will teach you how to embed the Flowise widget into a website.

<iframe src="https://www.youtube.com/embed/4paQ2wObDQ4"></iframe>

<iframe src="https://www.youtube.com/embed/XOeCV1xyN48"></iframe>
