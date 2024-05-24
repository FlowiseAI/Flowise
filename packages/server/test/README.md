# Running `parsePrompt.test.js`

This project includes a unit test for the `parsePrompt` function. Follow the steps below to run the test.

## Prerequisites

- Ensure you have [Node.js](https://nodejs.org/) installed on your system.

## Steps to Run `parsePrompt.test.js`

1. **Compile TypeScript Files**
 
If your project includes TypeScript files, you need to compile them to JavaScript before running the test. Ensure you have a `tsconfig.json` file configured correctly.

   Run the TypeScript compiler:

   ```sh
tsc
   ```
   This will generate the compiled JavaScript files in the dist directory (or the directory specified in your tsconfig.json).

2. **Run the test**

Navigate to the directory containing your test file and run:
```sh
node test/hub.test.js
   ```
Ensure the import path in the parsePrompt.test.js file is correct and points to the compiled JavaScript file.

## Output
If the test passes, you should see output similar to:
````
Test passed: System message prompt
````
If the test fails, the output will show which test failed and the reason for the failure, helping you debug the issue.

## Troubleshooting
- Module Not Found: Ensure that your import paths are correct and that you have compiled your TypeScript files.
- Compilation Errors: Check your tsconfig.json for correct configuration and ensure there are no TypeScript syntax errors in your code.