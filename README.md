Sui Merge DApp

React dApp to connect a Sui wallet, list all coin types you own (with object counts, names, and totals), and “Merge all” objects per type into a single coin.

Run Locally
- `npm i`
- `npm run dev`
- Open the URL shown by Vite, connect your wallet, and use “Merge all”.

Features
- Wallet connect (dapp-kit) and network presets (Mainnet/Testnet/Devnet) + custom RPC.
- Lists coin types with columns: Name, Coin Type, Objects, Total (raw), Actions.
- Merge-all per type using the latest Transaction API from `@mysten/sui` 1.37.2.

Notes
- Ensure your RPC network matches your wallet’s selected network to avoid confusion.
- For very large coin counts, transactions can exceed limits; batching can be added if needed.
