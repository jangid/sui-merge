import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {},
  QueryClientProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('@mysten/dapp-kit', () => ({
  SuiClientProvider: ({ children }: any) => <>{children}</>,
  WalletProvider: ({ children }: any) => <>{children}</>,
  ConnectButton: () => <button>Connect</button>,
  useCurrentAccount: () => null,
  useSuiClient: () => ({ getAllCoins: async () => ({ data: [], hasNextPage: false }) }),
  useSuiClientContext: () => ({ selectNetwork: () => {}, network: 'mainnet' }),
  useSignTransaction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignAndExecuteTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@mysten/sui/client', () => ({
  getFullnodeUrl: (name: string) => `https://rpc/${name}`,
  SuiClient: class {},
}));

vi.mock('./App', () => ({
  App: () => <div>AppRoot</div>,
}));

describe('main bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    mockRender.mockClear();
    mockCreateRoot.mockClear();
  });

  it('creates root and renders App', async () => {
    await import('./main');
    const rootEl = document.getElementById('root');
    expect(mockCreateRoot).toHaveBeenCalledWith(rootEl);
    expect(mockRender).toHaveBeenCalledTimes(1);
    // Ensure a React element was passed to render
    const [arg] = mockRender.mock.calls[0];
    expect(arg).toBeTruthy();
  });
});

