# x402 Payment Node for Flowise

## Task
Add an x402 payment node to Flowise (https://github.com/FlowiseAI/Flowise) that enables AI agent workflows to call paid external APIs using the x402 HTTP 402 payment protocol.

## What to Build
A new Flowise node that:
1. Takes an endpoint URL, max price, and optional parameters as input
2. Calls the endpoint
3. Handles HTTP 402 Payment Required responses
4. Signs and sends USDC payment via x402 protocol
5. Retries the request with X-Payment header
6. Returns the paid API response + transaction metadata

## Technical Approach
- Flowise uses a custom node system (see packages/server/src/nodes/)
- Nodes extend `INode` interface with `init()` and `run()` methods
- Study existing nodes in packages/server/src/nodes/ for patterns
- Use `@acedatacloud/x402-client` for payment signing (it handles Solana + EVM)
- Wallet credentials stored in Flowise credential system

## Key Files to Study
- packages/server/src/nodes/ /* existing node implementations */
- packages/server/src/Interface.ts /* INode interface */
- packages/server/src/Credentials.ts /* credential system */
- packages/server/src/utils/ /* utility functions */

## x402 Protocol Flow
```
1. Agent calls endpoint → Server returns 402 + payment requirements
2. Node parses 402 response: price, currency, chain, payTo address, accepts[]
3. Node signs payment envelope (Solana TransferChecked or EVM TransferWithAuthorization)
4. Node retries request with X-Payment header
5. Server returns 200 with response + x402_tx hash
```

## Code Quality
- TypeScript, follow Flowise code style
- Add proper TypeScript types
- Handle errors gracefully (insufficient funds, invalid response, network errors)
- Support both Solana and Base networks
- No Chinese in code

## Important
- This is for the x402 foundation bounty ecosystem
- Fork FlowiseAI/Flowise, create a feature branch
- Write clear commit messages
- The node should be self-contained and well-documented
