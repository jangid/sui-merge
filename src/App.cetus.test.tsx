import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { App } from './App';

let mockAccount: any = null;
let mockPortfolio: any[] = [];
let signCalls = 0;

// Capture toast calls in this test file only
const toastCalls: { kind: 'success' | 'error' | 'info'; message: string }[] = [];

vi.mock('./toast', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
  useToast: () => ({
    success: (m: string) => toastCalls.push({ kind: 'success', message: m }),
    error: (m: string) => toastCalls.push({ kind: 'error', message: m }),
    info: (m: string) => toastCalls.push({ kind: 'info', message: m }),
  }),
}));

vi.mock('@mysten/dapp-kit', () => ({
  SuiClientProvider: ({ children }: any) => <>{children}</>,
  WalletProvider: ({ children }: any) => <>{children}</>,
  ConnectButton: () => <button>Connect</button>,
  useCurrentAccount: () => mockAccount,
  useSuiClient: () => ({
    getAllCoins: async () => ({ data: [], hasNextPage: false }),
    getCoinMetadata: async () => ({ decimals: 6 }),
    waitForTransaction: async () => ({}),
  }),
  useSuiClientContext: () => ({ selectNetwork: () => {}, network: 'mainnet' }),
  useSignTransaction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignAndExecuteTransaction: () => ({
    mutate: (_args: any, opts?: { onSuccess?: (r: any) => void; onError?: (e: any) => void }) => {
      signCalls += 1;
      opts?.onSuccess?.({ digest: '0xdead' });
    },
    isPending: false,
  }),
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
    setGasBudget() {}
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
    async getUserPortfolio() { return mockPortfolio; }
    async claimRewards() { return {}; }
  },
  getUserPositionCapId: async () => '0xpos',
}));

vi.mock('@7kprotocol/sdk-ts', () => ({
  setSuiClient: () => {},
  getQuote: async () => ({ route: [{}], out: '100' }),
  buildTx: async () => ({ tx: new (require('@mysten/sui/transactions').Transaction)() }),
}));

vi.mock('@cetusprotocol/cetus-sui-clmm-sdk', () => ({
  initCetusSDK: async () => ({
    Pool: {
      getPoolByCoins: async () => ([{ poolAddress: 'pool1', coinTypeA: '0x4::usdc::USDC', coinTypeB: '0x2::sui::SUI', liquidity: '1000' }]),
    },
    Swap: {
      preSwap: async () => ({}),
      createSwapTransactionPayload: async () => ({ setGasBudget() {} }),
    },
  }),
}));

const renderApp = () => {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mockAccount = { address: '0xabc' };
  mockPortfolio = [];
  toastCalls.length = 0;
  signCalls = 0;
});

describe('Cetus Claim + Swap', () => {
  it('performs Claim + Swap (Cetus path) without throwing', async () => {
    mockPortfolio = [{ rewardsToClaimUsd: '5', rewardsToClaim: [{ coinType: '0x4::usdc::USDC', rewardAmount: '1' }] }];

    renderApp();
    await act(async () => { fireEvent.click(screen.getByText('Claim & Swap Rewards')); });

    // Switch router to Cetus
    const radios = screen.getAllByRole('radio');
    await act(async () => { fireEvent.click(radios[1]); });

    // Wait for effect-populated totals
    await screen.findByText(/Total USD: 5/i);

    // Perform claim + swap
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Claim \+ Swap/i })); });

    // Ensure swap attempted (sign called at least once)
    await waitFor(() => expect(signCalls).toBeGreaterThan(0));
  });
});
