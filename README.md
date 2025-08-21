Sui Utils DApp

A lightweight React dApp with utilities for Sui, including:
- Sign Transaction Bytes: Paste base64 transaction bytes and sign with your connected wallet. Optionally, sign and execute.
- Merge Coins: List your coin types and merge all coin objects of a type into the largest coin.
- Split Coins: Split a coin object into multiple outputs using raw amounts.
- Transfer Object: Transfer any object by ID to a recipient address.
- Best Quote Swap: Placeholder to compare swap quotes across 7k, Cetus, etc.

Alphalend:
- Claim & Swap Rewards: Placeholder to claim rewards and route swap via 7k or Cetus to SUI/stSUI or a custom coin.

Run Locally
- npm i
- npm run dev
- Open the URL shown by Vite, connect your wallet, and use the tools.

Notes
- Ensure the selected RPC network matches your wallet's network.
- For very large coin counts, merge may exceed limits; batching can be added if needed.

Tech Stack
- Vite + React + TypeScript
- @mysten/dapp-kit 0.17.3
- @mysten/sui 1.37.2
- @tanstack/react-query 5.x
