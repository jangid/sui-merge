import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

vi.mock('@mysten/dapp-kit', () => ({
  SuiClientProvider: ({ children }: any) => <>{children}</>,
  WalletProvider: ({ children }: any) => <>{children}</>,
  ConnectButton: () => <button>Connect</button>,
  useCurrentAccount: () => null,
  useSuiClient: () => ({
    getAllCoins: async () => ({ data: [], hasNextPage: false }),
    getCoins: async () => ({ data: [], hasNextPage: false }),
    getCoinMetadata: async () => null,
  }),
  useSuiClientContext: () => ({ selectNetwork: () => {}, network: 'mainnet' }),
  useSignTransaction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignAndExecuteTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@mysten/sui/client', () => ({
  getFullnodeUrl: (name: string) => `https://rpc/${name}`,
  SuiClient: class {},
}));

vi.mock('@mysten/sui/transactions', () => ({
  Transaction: class {
    pure = { u64: (n: any) => n, address: (a: any) => a };
    object(id: string) { return id; }
    mergeCoins() {}
    splitCoins() {}
    transferObjects() {}
  },
}));

vi.mock('@alphafi/alphafi-sdk', () => ({
  coinsList: {
    SUI: { type: '0x2::sui::SUI' },
    STSUI: { type: '0x3::stsui::STSUI' },
    USDC: { type: '0x4::usdc::USDC' },
    ALPHA: { type: '0x5::alpha::ALPHA' },
    USDT: { type: '0x6::usdt::USDT' },
  },
}));

vi.mock('@alphafi/alphalend-sdk', () => ({
  AlphalendClient: class {
    constructor() {}
    async getUserPortfolio() { return []; }
    async claimRewards() { return {}; }
  },
  getUserPositionCapId: async () => null,
}));

vi.mock('@7kprotocol/sdk-ts', () => ({
  setSuiClient: () => {},
  getQuote: async () => ({ route: [], out: '0' }),
  buildTx: async () => ({}),
}));

vi.mock('@cetusprotocol/cetus-sui-clmm-sdk', () => ({
  initCetusSDK: async () => ({ router: {} }),
}));

describe('App render', () => {
  const renderApp = () => {
    const client = new QueryClient();
    return render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    );
  };

  it('renders header and navigation', () => {
    renderApp();
    expect(screen.getByText('Sui Utils')).toBeInTheDocument();
    expect(screen.getByText('Merge Coins')).toBeInTheDocument();
    expect(screen.getByText('Sign Transaction')).toBeInTheDocument();
    expect(screen.getByText('Best Quote Swap')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('switches to Sign Transaction panel', () => {
    renderApp();
    fireEvent.click(screen.getByText('Sign Transaction'));
    expect(screen.getByText('Sign Transaction Bytes')).toBeInTheDocument();
  });
});

