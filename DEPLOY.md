# Base Tac Toe deployment

## Remix

1. Create `BaseTacToe.sol` and paste `contracts/BaseTacToe.sol`.
2. Compile with Solidity `0.8.24`, optimizer enabled with 200 runs.
3. Choose **Injected Provider - MetaMask** in Deploy & Run Transactions.
4. Confirm the wallet is on Base Mainnet (`8453`).
5. Deploy `BaseTacToe` with no constructor arguments and verify it on BaseScan.

## Frontend

Paste the contract into `deployedAddress` in `src/config/contract.ts`, or create:

```text
VITE_BASE_TAC_TOE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

Add the Base App meta tag inside `<head>` in `index.html`, then add the Builder Code to `BUILDER_CODE` in `src/config/wagmi.ts`.

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`
