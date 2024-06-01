<!-- markdownlint-disable MD030 -->

# Answer AI Embed React

React library to display flowise chatbot on your website

![Flowise](https://github.com/FlowiseAI/FlowiseChatEmbed/blob/main/images/ChatEmbed.gif?raw=true)

## Install

```bash
npm install aai-embed aai-embed-react
```

or

```bash
yarn add aai-embed aai-embed-react
```

## Import

Full Page Chat

```tsx
import { FullPageChat } from 'aai-embed-react'

const App = () => {
    return <FullPageChat chatflowid='your-chatflow-id' apiHost='http://localhost:3000' />
}
```

Popup Chat

```tsx
import { BubbleChat } from 'aai-embed-react'

const App = () => {
    return <BubbleChat chatflowid='your-chatflow-id' apiHost='http://localhost:3000' />
}
```
