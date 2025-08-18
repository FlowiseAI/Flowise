---
description: Learn how to use variables in Flowise
---

# Variables

---

Flowise allow users to create variables that can be used in the nodes. Variables can be Static or Runtime.

### Static

Static variable will be saved with the value specified, and retrieved as it is.

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-4f2268c3b342bb3f5e034d8060dbf8849e5dfa6b%2Fimage%20(13)%20(1)%20(1)%20(1).png?alt=media" alt="" width="542" />

### Runtime

Value of the variable will be fetched from **.env** file using `process.env`

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-6e93ba228eaa2741c116d76290e11b3f059f610a%2Fimage%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1)%20(1).png?alt=media" alt="" width="537" />

### Override or setting variable through API

In order to override variable value, user must explicitly enable it from the top right button:

**Settings** -> **Configuration** -> **Security** tab:

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-84a0ce966ccbe453f66baf2d066b45f95421d51d%2Fimage%20(1)%20(1).png?alt=media" alt="" />

If there is an existing variable created, variable value provided in the API will override the existing value.

```json
{
    "question": "hello",
    "overrideConfig": {
        "vars": {
            "var": "some-override-value"
        }
    }
}
```

### Using Variables

Variables can be used by the nodes in Flowise. For instance, a variable named **`character`** is created:

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-431b030ebef512dbe8017f99afef7309da17545a%2Fimage%20(96).png?alt=media" alt="" />

We can then use this variable as **`$vars.<variable-name>`** in the Function of the following nodes:

-   [Custom Tool](/docs/sidekick-studio/chatflows/tools/custom-tool)
-   [Custom Function](/docs/sidekick-studio/chatflows/utilities/custom-js-function)
-   [Custom Loader](/docs/sidekick-studio/chatflows/document-loaders/custom-document-loader)
-   [If Else](/docs/sidekick-studio/chatflows/utilities/if-else)
-   Custom MCP

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-f39017ccf54d011dc38818c46158aa6e5ce71fef%2Fimage%20(105).png?alt=media" alt="" width="283" />

Besides, user can also use the variable in text input of any node with the following format:

**`{{$vars.<variable-name>}}`**

For example, in Agent System Message:

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-8e38fc1e5869fa0cb36088a83e02dbc21d71ee2c%2Fimage%20(1)%20(1)%20(1)%20(2)%20(1).png?alt=media" alt="" width="508" />

In Prompt Template:

<img src="https://823733684-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F00tYLwhz5RyR7fJEhrWy%2Fuploads%2Fgit-blob-a81894b88698f3586b35560213dde5e3be83543e%2Fimage%20(157).png?alt=media" alt="" />

## Resources

-   [Pass Variables to Function](/docs/sidekick-studio/chatflows/tools/custom-tool)
