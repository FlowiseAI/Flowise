---
description: Learn how to call a webhook on Make
---

# Calling Webhook

---

In this use case tutorial, we are going to create a custom tool that will be able to call a webhook endpoint, and pass in the necessary parameters into the webhook body. We'll be using [Make.com](https://www.make.com/en) to create the webhook workflow.

## Make

Head over to Make.com, after registering an account, create a workflow that has a Webhook module and Discord module, which looks like below:

<figure><img src="/.gitbook/assets/screely-1691756705932.png" alt="" /><figcaption></figcaption></figure>

From the Webhook module, you should be able to see a webhook URL:

<figure><img src="/.gitbook/assets/image (46).png" alt="" width="563" /><figcaption></figcaption></figure>

From the Discord module, we are passing the `message` body from the Webhook as the message to send to Discord channel:

<figure><img src="/.gitbook/assets/image (47).png" alt="" width="563" /><figcaption></figcaption></figure>

To test it out, you can click Run once at the bottom left corner, and send a POST request with a JSON body

```json
{
    "message": "Hello Discord!"
}
```

<figure><img src="/.gitbook/assets/image (48).png" alt="" width="563" /><figcaption></figcaption></figure>

You'll be able to see a Discord message sent to the channel:

<figure><img src="/.gitbook/assets/image (49).png" alt="" width="249" /><figcaption></figcaption></figure>

Perfect! We have successfully configured a workflow that is able to pass a message and send to Discord channel [🎉](https://emojiterra.com/party-popper/)[🎉](https://emojiterra.com/party-popper/)

## AnswerAI

In AnswerAI, we are going to create a custom tool that is able to call the Webhook POST request, with the message body.

From the dashboard, click **Tools**, then click **Create**

<figure><img src="/.gitbook/assets/screely-1691758397783.png" alt="" /><figcaption></figcaption></figure>

We can then fill in the following fields (feel free to change this according to your needs):

-   **Tool Name**: make_webhook (must be in snake_case)
-   **Tool Description**: Useful when you need to send message to Discord
-   **Tool Icon Src**: [https://github.com/FlowiseAI/Flowise/assets/26460777/517fdab2-8a6e-4781-b3c8-fb92cc78aa0b](https://github.com/FlowiseAI/Flowise/assets/26460777/517fdab2-8a6e-4781-b3c8-fb92cc78aa0b)
-   **Input Schema**:

<figure><img src="/.gitbook/assets/image (167).png" alt="" /><figcaption></figcaption></figure>

-   **JavaScript Function**:

```javascript
const fetch = require('node-fetch')
const webhookUrl = 'https://hook.eu1.make.com/abcdef'
const body = {
    message: $message
}
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
}
try {
    const response = await fetch(webhookUrl, options)
    const text = await response.text()
    return text
} catch (error) {
    console.error(error)
    return ''
}
```

Click **Add** to save the custom tool, and you should be able to see it now:

<figure><img src="/.gitbook/assets/image (51).png" alt="" width="279" /><figcaption></figcaption></figure>

Now, create a new canvas with following nodes:

-   **Buffer Memory**
-   **ChatOpenAI**
-   **Custom Tool** (select the make_webhook tool we just created)
-   **OpenAI Function Agent**

It should looks like below after connecting them up:

<figure><img src="/.gitbook/assets/screely-1691758990676.png" alt="" /><figcaption></figcaption></figure>

Save the chatflow, and start testing it!

For example, we can ask question like _"how to cook an egg"_

<figure><img src="/.gitbook/assets/image (52).png" alt="" width="563" /><figcaption></figcaption></figure>

Then ask the agent to send all of these to Discord:

<figure><img src="/.gitbook/assets/image (53).png" alt="" width="563" /><figcaption></figcaption></figure>

Go to the Discord channel, and you will be able to see the message:

<figure><img src="/.gitbook/assets/image (54).png" alt="" /><figcaption></figcaption></figure>

That's it! OpenAI Function Agent will be able to automatically figure out what to pass as the message and send it over to Discord. This is just a quick example of how to trigger a webhook workflow with dynamic body. The same idea can be applied to workflow that has a webhook and Gmail, GoogleSheets etc.

You can read more on how to pass chat information like `sessionId`, `flowid` and `variables` to custom tool - [#additional](../../sidekick-studio/chatflows/tools/custom-tool.md)

## Tutorials

-   Watch a step-by-step instruction video on using Webhooks with AnswerAI custom tools.

<iframe src="https://www.youtube.com/embed/_K9xJqEgnrU"></iframe>

-   Watch how to connect AnswerAI to Google Sheets using webhooks

<iframe src="https://www.youtube.com/embed/fehXLdRLJFo"></iframe>

-   Watch how to connect AnswerAI to Microsoft Excel using webhooks

<iframe src="https://www.youtube.com/embed/cB2GC8JznJc"></iframe>
