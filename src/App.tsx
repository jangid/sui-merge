import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SuiClientProvider,
  WalletProvider,
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import '@mysten/dapp-kit/dist/index.css';

type Coin = {
  coinType: string;
  coinObjectId: string;
  balance: string;
};

type CoinGroup = {
  coinType: string;
  count: number;
  total: bigint;
  coins: Coin[];
};

const MAINNET_URL = getFullnodeUrl('mainnet');
const TESTNET_URL = getFullnodeUrl('testnet');
const DEVNET_URL = getFullnodeUrl('devnet');
const DEFAULT_RPC = MAINNET_URL;

export function App() {
  const [rpcUrl, setRpcUrl] = useState<string>(DEFAULT_RPC);

  const networks = useMemo(
    () => ({
      mainnet: { url: MAINNET_URL },
      testnet: { url: TESTNET_URL },
      devnet: { url: DEVNET_URL },
      custom: { url: rpcUrl },
    }),
    [rpcUrl]
  );

  const defaultNetwork = useMemo(() => {
    if (rpcUrl === MAINNET_URL) return 'mainnet' as const;
    if (rpcUrl === TESTNET_URL) return 'testnet' as const;
    if (rpcUrl === DEVNET_URL) return 'devnet' as const;
    return 'custom' as const;
  }, [rpcUrl]);

  return (
    <SuiClientProvider networks={networks} defaultNetwork={defaultNetwork}>
      <WalletProvider autoConnect>
        <div style={{ maxWidth: 960, margin: '20px auto', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <Header rpcUrl={rpcUrl} onRpcChange={setRpcUrl} />
          <Main />
        </div>
      </WalletProvider>
    </SuiClientProvider>
  );
}

function Header({ rpcUrl, onRpcChange }: { rpcUrl: string; onRpcChange: (url: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', marginBottom: 16 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Sui Merge DApp</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onRpcChange(MAINNET_URL)} style={btnSmall}>Mainnet</button>
          <button onClick={() => onRpcChange(TESTNET_URL)} style={btnSmall}>Testnet</button>
          <button onClick={() => onRpcChange(DEVNET_URL)} style={btnSmall}>Devnet</button>
        </div>
        <input
          style={{ padding: 8, minWidth: 360, border: '1px solid #ddd', borderRadius: 6 }}
          value={rpcUrl}
          onChange={(e) => onRpcChange(e.target.value)}
          placeholder="RPC URL"
        />
        <ConnectButton />
      </div>
    </div>
  );
}

function Main() {
  const account = useCurrentAccount();
  if (!account) return <InfoBox title="Connect Wallet" text="Connect a wallet to list and merge your coins." />;
  return <CoinGroups address={account.address} />;
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, color: '#444' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div>{text}</div>
    </div>
  );
}

function CoinGroups({ address }: { address: string }) {
  const client = useSuiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<CoinGroup[]>([]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const allCoins: Coin[] = await fetchAllCoins(client, address);
      const grouped = groupCoins(allCoins);
      setGroups(grouped);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [address, client]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Your Coin Types</div>
        <button onClick={refresh} disabled={loading} style={btnGray}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 120px 220px 140px', gap: 0, padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>
          <div>Name</div>
          <div>Coin Type</div>
          <div style={{ textAlign: 'right' }}>Objects</div>
          <div style={{ textAlign: 'right' }}>Total</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>
        <div>
          {groups.map((g) => (
            <CoinRow key={g.coinType} group={g} onMerged={refresh} />
          ))}
          {groups.length === 0 && (
            <div style={{ padding: 16, color: '#777' }}>No coins found for this account.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupCoins(coins: Coin[]): CoinGroup[] {
  const map = new Map<string, CoinGroup>();
  for (const c of coins) {
    const g = map.get(c.coinType) ?? { coinType: c.coinType, count: 0, total: 0n, coins: [] };
    g.count += 1;
    g.total = BigInt(g.total) + BigInt(c.balance);
    g.coins.push(c);
    map.set(c.coinType, g);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

async function fetchAllCoins(client: SuiClient, address: string): Promise<Coin[]> {
  const out: Coin[] = [];
  let cursor: string | null = null;
  for (;;) {
    const res = await client.getAllCoins({ owner: address, cursor, limit: 1000 });
    out.push(
      ...res.data.map((c) => ({ coinType: c.coinType, coinObjectId: c.coinObjectId, balance: c.balance }))
    );
    if (!res.hasNextPage) break;
    cursor = res.nextCursor;
  }
  return out;
}

const btnBlue: React.CSSProperties = {
  background: '#2563eb',
  color: 'white',
  border: '1px solid #1d4ed8',
  borderRadius: 6,
  padding: '8px 12px',
  cursor: 'pointer',
};
const btnGray: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#111827',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '8px 12px',
  cursor: 'pointer',
};
const btnSmall: React.CSSProperties = {
  ...btnGray,
  padding: '6px 8px',
};

function CoinRow({ group, onMerged }: { group: CoinGroup; onMerged: () => void }) {
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState<string | null>(null);
  const { data: metadata } = useCoinMetadata(group.coinType);

  const symbol = metadata?.symbol || symbolFromType(group.coinType);
  const displayName = metadata?.name ? `${metadata.name} (${symbol})` : symbol;

  const mergeAll = async () => {
    setStatus(null);
    if (group.count < 2) return;
    const sorted = group.coins.slice().sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));
    const target = sorted[0];
    const sources = sorted.slice(1).map((c) => c.coinObjectId);
    if (sources.length === 0) return;

    const tx = new Transaction();
    tx.mergeCoins(tx.object(target.coinObjectId), sources.map((id) => tx.object(id)));

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (res) => {
          setStatus(`Merged. Digest: ${res.digest ?? 'submitted'}`);
          setTimeout(onMerged, 1200);
        },
        onError: (err) => {
          setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
        },
      }
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 120px 220px 140px', gap: 0, padding: '10px 12px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span title={group.coinType} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {group.coinType}
        </span>
        <CopyButton text={group.coinType} />
      </div>
      <div style={{ textAlign: 'right' }}>{group.count}</div>
      <div style={{ textAlign: 'right' }}>
        {formatUnits(group.total, metadata?.decimals ?? 0)} {symbol}
      </div>
      <div style={{ textAlign: 'right' }}>
        <button onClick={mergeAll} disabled={group.count < 2 || isPending} style={btnBlue}>
          {isPending ? 'Merging…' : 'Merge all'}
        </button>
      </div>
      {status && (
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#6b7280', paddingTop: 6 }}>{status}</div>
      )}
    </div>
  );
}

function useCoinMetadata(coinType: string) {
  const client = useSuiClient();
  return useQuery({
    queryKey: ['coin-metadata', coinType],
    queryFn: async () => {
      try {
        const meta = await client.getCoinMetadata({ coinType });
        return meta ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

function symbolFromType(coinType: string) {
  const parts = coinType.split('::');
  return parts[2] || coinType;
}

function formatUnits(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();
  const s = amount.toString();
  const negative = s.startsWith('-');
  const digits = negative ? s.slice(1) : s;
  const pad = decimals - digits.length;
  const whole = pad >= 0 ? '0' : digits.slice(0, digits.length - decimals);
  const fracRaw = pad >= 0 ? '0'.repeat(pad) + digits : digits.slice(digits.length - decimals);
  const frac = fracRaw.replace(/0+$/, '');
  const out = frac.length ? `${whole}.${frac}` : whole;
  return negative ? `-${out}` : out;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch (e) {
      // ignore
    }
  };
  return (
    <button onClick={onCopy} title="Copy coin type" style={btnIcon} aria-label="Copy coin type">
      {copied ? '✓' : '📋'}
    </button>
  );
}

const btnIcon: React.CSSProperties = {
  ...btnGray,
  padding: '2px 6px',
  fontSize: 12,
  lineHeight: 1,
};
