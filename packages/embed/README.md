<!-- markdownlint-disable MD030 -->

# Flowise Embed

Javascript library to display flowise chatbot on your website

![Flowise](https://github.com/FlowiseAI/Flowise/blob/main/images/flowise.gif?raw=true)

Install:

```bash
npm i flowise-embed
```

## Embed in your HTML

```
<script type="module">
    import Chatbot from 'https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js'
    Chatbot.init({
        chatflowid: '<chatflowid>',
        apiHost: 'http://localhost:3000'
    })
</script>
```

## License

Source code in this repository is made available under the [MIT License](https://github.com/FlowiseAI/Flowise/blob/master/LICENSE.md).
