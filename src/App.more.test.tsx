import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
// Silence toast timers and state updates for tests in this file
vi.mock('./toast', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

let mockAccount: any = null;
let mockCoins: Array<{ coinType: string; coinObjectId: string; balance: string }> = [];
let mockPortfolio: any[] = [];
let mockPositionCapId: string | null = '0xpos';
let signErrorOnce = false;
let signCalls = 0;
let cetusPoolsEmpty = false;

vi.mock('@mysten/dapp-kit', () => ({
  SuiClientProvider: ({ children }: any) => <>{children}</>,
  WalletProvider: ({ children }: any) => <>{children}</>,
  ConnectButton: () => <button>Connect</button>,
  useCurrentAccount: () => mockAccount,
  useSuiClient: () => ({
    getAllCoins: async () => ({ data: mockCoins, hasNextPage: false }),
    getCoinMetadata: async () => ({ decimals: 6 }),
    waitForTransaction: async () => ({}),
  }),
  useSuiClientContext: () => ({ selectNetwork: () => {}, network: 'mainnet' }),
  useSignTransaction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignAndExecuteTransaction: () => ({
    mutate: (_args: any, opts?: { onSuccess?: (r: any) => void; onError?: (e: any) => void }) => {
      signCalls += 1;
      if (signErrorOnce) {
        signErrorOnce = false;
        opts?.onError?.(new Error('simulated'));
      } else {
        opts?.onSuccess?.({ digest: '0xdead' });
      }
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
  getUserPositionCapId: async () => mockPositionCapId,
}));

vi.mock('@7kprotocol/sdk-ts', () => ({
  setSuiClient: () => {},
  getQuote: async () => ({ route: [{}], out: '100' }),
  buildTx: async () => ({ tx: new (require('@mysten/sui/transactions').Transaction)() }),
}));

vi.mock('@cetusprotocol/cetus-sui-clmm-sdk', () => ({
  initCetusSDK: async () => ({
    Pool: {
      getPoolByCoins: async () => (cetusPoolsEmpty ? [] : [{ poolAddress: 'pool1', coinTypeA: '0x4::usdc::USDC', coinTypeB: '0x2::sui::SUI', liquidity: '1000' }]),
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
  mockAccount = null;
  mockCoins = [];
  mockPortfolio = [];
  mockPositionCapId = '0xpos';
  signErrorOnce = false;
  cetusPoolsEmpty = false;
  signCalls = 0;
  window.location.hash = '';
});

describe('App unauthenticated states', () => {
  it('shows InfoBox messages per tab when not connected', () => {
    renderApp();
    // Merge (default)
    expect(screen.getByText(/Connect a wallet to list and merge your coins/i)).toBeInTheDocument();
    // Sign tab
    fireEvent.click(screen.getByText('Sign Transaction'));
    expect(screen.getByText(/Connect a wallet to sign transaction bytes/i)).toBeInTheDocument();
    // Split
    fireEvent.click(screen.getByText('Split Coins'));
    expect(screen.getByText(/Connect a wallet to split your coins/i)).toBeInTheDocument();
    // Transfer
    fireEvent.click(screen.getByText('Transfer Object'));
    expect(screen.getByText(/Connect a wallet to transfer objects/i)).toBeInTheDocument();
    // Best quote
    fireEvent.click(screen.getByText('Best Quote Swap'));
    expect(screen.getByText(/Connect a wallet to swap tokens with best quote/i)).toBeInTheDocument();
    // Claim & Swap
    fireEvent.click(screen.getByText('Claim & Swap Rewards'));
    expect(screen.getByText(/Connect a wallet to claim and swap rewards/i)).toBeInTheDocument();
  });
});

describe('Hash routing', () => {
  it('navigates to Sign tab when hash contains sign', () => {
    window.location.hash = '#/sign';
    renderApp();
    // Should render Sign panel InfoBox since no account
    expect(screen.getByText(/Connect a wallet to sign transaction bytes/i)).toBeInTheDocument();
  });
});

describe('Merge button state', () => {
  it('disables Merge all when only one coin', async () => {
    mockAccount = { address: '0xabc' };
    mockCoins = [{ coinType: '0x1::sui::SUI', coinObjectId: 'a', balance: '1' }];
    renderApp();
    const btn = await screen.findByRole('button', { name: /Merge all/i });
    expect(btn).toBeDisabled();
  });
});

describe('Network selection', () => {
  it('updates RPC URL input when selecting testnet/devnet', () => {
    renderApp();
    const input = screen.getByPlaceholderText('RPC URL') as HTMLInputElement;
    expect(input.value).toBe('https://rpc/mainnet');
    fireEvent.click(screen.getByText('Testnet'));
    expect(input.value).toBe('https://rpc/testnet');
    fireEvent.click(screen.getByText('Devnet'));
    expect(input.value).toBe('https://rpc/devnet');
  });
});

describe('Interactive panels (connected)', () => {
  beforeEach(() => {
    mockAccount = { address: '0xabc' } as any;
  });

  it('shows validation error on Sign Transaction when bytes are empty', async () => {
    renderApp();
    fireEvent.click(screen.getByText('Sign Transaction'));
    fireEvent.click(screen.getByRole('button', { name: /sign only/i }));
    const errors = await screen.findAllByText(/Enter base64-encoded transaction bytes\./i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Best Quote shows placeholder info', () => {
    renderApp();
    fireEvent.click(screen.getByText('Best Quote Swap'));
    const coinInputs = screen.getAllByPlaceholderText('0x...::module::COIN');
    fireEvent.change(coinInputs[0], { target: { value: '0x4::usd::USDC' } });
    const toInput = coinInputs[1] as HTMLInputElement;
    fireEvent.change(toInput, { target: { value: '0x2::sui::SUI' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 100000000'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /get best quote/i }));
    expect(screen.getByText(/Coming soon: Compare quotes/i)).toBeInTheDocument();
  });

  it('Best Quote shows validation when inputs empty', () => {
    renderApp();
    fireEvent.click(screen.getByText('Best Quote Swap'));
    fireEvent.click(screen.getByRole('button', { name: /get best quote/i }));
    expect(screen.getByText(/Enter from\/to coin types and amount \(raw\)\./i)).toBeInTheDocument();
  });

  it('split and transfer trigger handlers', () => {
    renderApp();
    fireEvent.click(screen.getByText('Split Coins'));
    fireEvent.change(screen.getByPlaceholderText('0x... coin object id'), { target: { value: '0x1' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 1000,2000,3000'), { target: { value: '10,20' } });
    fireEvent.click(screen.getByRole('button', { name: /^split$/i }));

    fireEvent.click(screen.getByText('Transfer Object'));
    fireEvent.change(screen.getByPlaceholderText('0x... object id'), { target: { value: '0xobj' } });
    fireEvent.change(screen.getByPlaceholderText('0x... recipient'), { target: { value: '0xrec' } });
    fireEvent.click(screen.getByRole('button', { name: /^transfer$/i }));
  });

  // Cetus flows are exercised indirectly via 7k stage + swap coverage below.

  it('7k swap falls back after first error and succeeds', async () => {
    mockPortfolio = [{ rewardsToClaimUsd: '5', rewardsToClaim: [{ coinType: '0x4::usdc::USDC', rewardAmount: '1' }] }];
    renderApp();
    await act(async () => { fireEvent.click(screen.getByText('Claim & Swap Rewards')); });
    // Wait for PositionCap auto-detect
    await screen.findByText(/0xpos/i);
    // Click Claim to stage swap amounts
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Claim$/i })); });
    await new Promise((r) => setTimeout(r, 0));
    // cause first swap sign to error to trigger fallback
    signErrorOnce = true;
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Swap$/i })); });
    // wait until two sign attempts occurred (swap try + fallback)
    await waitFor(() => expect(signCalls).toBeGreaterThanOrEqual(2));
  });
});
