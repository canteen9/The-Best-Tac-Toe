# Base Tac Toe

Base Tac Toe is a free onchain Tic-Tac-Toe game against a deterministic Solidity opponent. The contract wins, blocks, takes the center, then chooses a corner or open cell. There are no stakes, tokens, or app fees; players only pay Base network gas.

## Local development

```bash
npm install
npm run dev
```

## Production setup

1. Deploy `contracts/BaseTacToe.sol` with Solidity `0.8.24` on Base Mainnet.
2. Paste the deployed address into `src/config/contract.ts` or set `VITE_BASE_TAC_TOE_CONTRACT_ADDRESS` in Netlify.
3. Add the Base App ID meta tag to `index.html`.
4. Add the `bc_...` Builder Code to `BUILDER_CODE` in `src/config/wagmi.ts`.
5. Deploy with `npm run build`; publish directory is `dist`.

The frontend explicitly attaches the ERC-8021 Builder Code suffix to `startGame`, `play`, and `dailyCheckIn`, including transactions sent through browser wallets.
