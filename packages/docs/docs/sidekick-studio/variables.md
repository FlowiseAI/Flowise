---
description: Learn how to use variables in Flowise
---

# Variables

---

Flowise allow users to create variables that can be used in:

-   [Custom Tool](sidekick-studio/chatflows/tools/custom-tool.md)
-   [Custom Function](sidekick-studio/chatflows/utilities/custom-js-function.md)
-   [Custom Loader](sidekick-studio/chatflows/document-loaders/custom-document-loader.md)
-   [If Else](sidekick-studio/chatflows/utilities/if-else.md)

For example, you have a database URL that you do not want it to be exposed on the function, but you still want the function to be able to read the URL from your environment variable.

User can create a variable and get the variable like so:

`$vars.<variable-name>`

Variables can be Static or Runtime.

## Static

Static variable will be saved with the value specified, and retrieved as it is.

<figure><img src="/img/screenshots/variables-static.png" alt="Static variable" width="542" /><figcaption>Static variable</figcaption></figure>

## Runtime

Value of the variable will be fetched from **.env** file using `process.env`

<figure><img src="/img/screenshots/variables-runtime.png" alt="Runtime variable" width="537" /><figcaption>Runtime variable</figcaption></figure>

## Resources

-   [Pass Variables to Function](sidekick-studio/chatflows/tools/custom-tool.md)
