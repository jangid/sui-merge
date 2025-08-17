import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SuiClientProvider,
  WalletProvider,
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSignTransaction,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import '@mysten/dapp-kit/dist/index.css';
import { ToastProvider, useToast } from './toast';

type Coin = { coinType: string; coinObjectId: string; balance: string };
type CoinGroup = { coinType: string; count: number; total: bigint; coins: Coin[] };
type UtilTab = 'merge' | 'sign' | 'split' | 'transfer';

const MAINNET_URL = getFullnodeUrl('mainnet');
const TESTNET_URL = getFullnodeUrl('testnet');
const DEVNET_URL = getFullnodeUrl('devnet');
const DEFAULT_RPC = MAINNET_URL;

export function App() {
  const [rpcUrl, setRpcUrl] = useState<string>(DEFAULT_RPC);
  const [util, setUtil] = useState<UtilTab>(() => getUtilFromHash());

  useEffect(() => {
    const onHash = () => setUtil(getUtilFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const networks = useMemo(
    () => ({ mainnet: { url: MAINNET_URL }, testnet: { url: TESTNET_URL }, devnet: { url: DEVNET_URL }, custom: { url: rpcUrl } }),
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
        <ToastProvider>
          <div style={{ maxWidth: 1000, margin: '20px auto', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Header rpcUrl={rpcUrl} onRpcChange={setRpcUrl} />
            <div style={{ display: 'flex', gap: 16 }}>
              <SideNav
                current={util}
                onSelect={(t) => {
                  setUtil(t);
                  window.location.hash = `#/${t}`;
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Main util={util} />
              </div>
            </div>
          </div>
        </ToastProvider>
      </WalletProvider>
    </SuiClientProvider>
  );
}

function Header({ rpcUrl, onRpcChange }: { rpcUrl: string; onRpcChange: (url: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', marginBottom: 16 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Sui Utils</h1>
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

function Main({ util }: { util: UtilTab }) {
  const account = useCurrentAccount();
  if (util === 'sign') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <SignBytesPanel enabled={!!account} />
        {!account && (
          <InfoBox title="Connect Wallet" text="Connect a wallet to sign transaction bytes." />)
        }
      </div>
    );
  }
  if (util === 'split') {
    return !account ? (
      <InfoBox title="Connect Wallet" text="Connect a wallet to split your coins." />
    ) : (
      <SplitCoinsPanel />
    );
  }
  if (util === 'transfer') {
    return !account ? (
      <InfoBox title="Connect Wallet" text="Connect a wallet to transfer objects." />
    ) : (
      <TransferObjectPanel />
    );
  }
  // merge
  return !account ? (
    <InfoBox title="Connect Wallet" text="Connect a wallet to list and merge your coins." />
  ) : (
    <CoinGroups address={account.address} />
  );
}

function SideNav({ current, onSelect }: { current: UtilTab; onSelect: (t: UtilTab) => void }) {
  return (
    <aside style={{ width: 220 }}>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>
          Utilities
        </div>
        <div style={{ display: 'grid' }}>
          <NavItem label="Merge Coins" active={current === 'merge'} onClick={() => onSelect('merge')} icon="🪙" />
          <NavItem label="Sign Transaction" active={current === 'sign'} onClick={() => onSelect('sign')} icon="✍️" />
          <NavItem label="Split Coins" active={current === 'split'} onClick={() => onSelect('split')} icon="🪓" />
          <NavItem label="Transfer Object" active={current === 'transfer'} onClick={() => onSelect('transfer')} icon="📦" />
        </div>
      </div>
    </aside>
  );
}

function NavItem({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        border: 'none',
        borderBottom: '1px solid #eee',
        background: active ? '#e5f0ff' : 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      aria-current={active ? 'page' : undefined}
    >
      {icon && <span aria-hidden>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, color: '#444' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div>{text}</div>
    </div>
  );
}

function SignBytesPanel({ enabled }: { enabled: boolean }) {
  const [bytesB64, setBytesB64] = useState('');
  const [result, setResult] = useState<{ bytes?: string; signature?: string; digest?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: signTx, isPending: signing } = useSignTransaction();
  const { mutateAsync: signAndExecute, isPending: executing } = useSignAndExecuteTransaction();
  const toast = useToast();

  const doSign = async () => {
    setError(null);
    setResult(null);
    try {
      if (!bytesB64.trim()) throw new Error('Enter base64-encoded transaction bytes.');
      const out = await signTx({ transaction: bytesB64.trim() });
      setResult({ bytes: out.bytes, signature: out.signature });
      toast.success('Transaction bytes signed successfully.');
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      toast.error(`Sign failed: ${msg}`);
    }
  };

  const doSignExecute = async () => {
    setError(null);
    setResult(null);
    try {
      if (!bytesB64.trim()) throw new Error('Enter base64-encoded transaction bytes.');
      const res = await signAndExecute({ transaction: bytesB64.trim() });
      const digest = (res as any).digest as string | undefined;
      setResult({ digest });
      toast.success(`Transaction submitted${digest ? `: ${digest}` : ''}`);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      toast.error(`Submit failed: ${msg}`);
    }
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>Sign Transaction Bytes</div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <textarea
          style={{ width: '100%', minHeight: 120, padding: 8, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          placeholder="Paste base64 transaction bytes here"
          value={bytesB64}
          onChange={(e) => setBytesB64(e.target.value)}
          disabled={!enabled || signing || executing}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={doSign} disabled={!enabled || signing || executing} style={btnGray}>{signing ? 'Signing…' : 'Sign only'}</button>
          <button onClick={doSignExecute} disabled={!enabled || signing || executing} style={btnBlue}>{executing ? 'Submitting…' : 'Sign + execute'}</button>
        </div>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        {result && (
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {'bytes' in result && result.bytes && (<KeyValueRow label="Bytes (base64)" value={result.bytes} />)}
            {'signature' in result && result.signature && (<KeyValueRow label="Signature" value={result.signature} />)}
            {'digest' in result && result.digest && (<KeyValueRow label="Digest" value={result.digest} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', alignItems: 'center', gap: 8 }}>
      <div style={{ color: '#6b7280' }}>{label}</div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }} title={value}>{value}</div>
      <CopyButton text={value} />
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

  useEffect(() => { refresh(); }, [address, client]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Your Coin Types</div>
        <button onClick={refresh} disabled={loading} style={btnGray}>{loading ? 'Refreshing…' : 'Refresh'}</button>
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
          {groups.map((g) => (<CoinRow key={g.coinType} group={g} onMerged={refresh} />))}
          {groups.length === 0 && (<div style={{ padding: 16, color: '#777' }}>No coins found for this account.</div>)}
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
    out.push(...res.data.map((c) => ({ coinType: c.coinType, coinObjectId: c.coinObjectId, balance: c.balance })));
    if (!res.hasNextPage) break;
    cursor = res.nextCursor;
  }
  return out;
}

const btnBlue: React.CSSProperties = { background: '#2563eb', color: 'white', border: '1px solid #1d4ed8', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' };
const btnGray: React.CSSProperties = { background: '#f1f5f9', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' };
const btnSmall: React.CSSProperties = { ...btnGray, padding: '6px 8px' };
const btnIcon: React.CSSProperties = { ...btnGray, padding: '2px 6px', fontSize: 12, lineHeight: 1 };

function CoinRow({ group, onMerged }: { group: CoinGroup; onMerged: () => void }) {
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState<string | null>(null);
  const { data: metadata } = useCoinMetadata(group.coinType);
  const toast = useToast();

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
          const digest = res.digest ?? 'submitted';
          setStatus(`Merged. Digest: ${digest}`);
          toast.success(`Merge complete: ${digest}`);
          setTimeout(onMerged, 1200);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus(`Error: ${msg}`);
          toast.error(`Merge failed: ${msg}`);
        },
      }
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 120px 220px 140px', gap: 0, padding: '10px 12px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span title={group.coinType} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{group.coinType}</span>
        <CopyButton text={group.coinType} />
      </div>
      <div style={{ textAlign: 'right' }}>{group.count}</div>
      <div style={{ textAlign: 'right' }}>{formatUnits(group.total, metadata?.decimals ?? 0)} {symbol}</div>
      <div style={{ textAlign: 'right' }}>
        <button onClick={mergeAll} disabled={group.count < 2 || isPending} style={btnBlue}>{isPending ? 'Merging…' : 'Merge all'}</button>
      </div>
      {status && (<div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#6b7280', paddingTop: 6 }}>{status}</div>)}
    </div>
  );
}

function useCoinMetadata(coinType: string) {
  const client = useSuiClient();
  return useQuery({
    queryKey: ['coin-metadata', coinType],
    queryFn: async () => {
      try { return (await client.getCoinMetadata({ coinType })) ?? null; } catch { return null; }
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
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 900); } catch {}
  };
  return (
    <button onClick={onCopy} title="Copy" style={btnIcon} aria-label="Copy">{copied ? '✓' : '📋'}</button>
  );
}

function SplitCoinsPanel() {
  const [coinId, setCoinId] = useState('');
  const [amounts, setAmounts] = useState('');
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const toast = useToast();

  const onSplit = () => {
    try {
      const id = coinId.trim();
      if (!id) throw new Error('Enter a coin object ID to split.');
      const parts = amounts.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
        const n = BigInt(s);
        if (n <= 0n) throw new Error('Split amounts must be positive.');
        return n;
      });
      if (parts.length === 0) throw new Error('Enter comma-separated split amounts (raw units).');

      const tx = new Transaction();
      const inputs = parts.map((n) => tx.pure.u64(n));
      tx.splitCoins(tx.object(id), inputs);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (res) => { const digest = res.digest ?? 'submitted'; toast.success(`Split submitted: ${digest}`); },
          onError: (err) => { const msg = err instanceof Error ? err.message : String(err); toast.error(`Split failed: ${msg}`); },
        }
      );
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>Split Coins</div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <Field label="Coin Object ID">
          <input style={inputStyle} placeholder="0x... coin object id" value={coinId} onChange={(e) => setCoinId(e.target.value)} />
        </Field>
        <Field label="Amounts (raw)">
          <input style={inputStyle} placeholder="e.g. 1000,2000,3000" value={amounts} onChange={(e) => setAmounts(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onSplit} disabled={isPending} style={btnBlue}>{isPending ? 'Submitting…' : 'Split'}</button>
        </div>
      </div>
    </div>
  );
}

function TransferObjectPanel() {
  const [objectId, setObjectId] = useState('');
  const [recipient, setRecipient] = useState('');
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const toast = useToast();

  const onTransfer = () => {
    try {
      const id = objectId.trim();
      const to = recipient.trim();
      if (!id) throw new Error('Enter an object ID.');
      if (!to) throw new Error('Enter a recipient address.');

      const tx = new Transaction();
      tx.transferObjects([tx.object(id)], tx.pure.address(to));

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (res) => { const digest = res.digest ?? 'submitted'; toast.success(`Transfer submitted: ${digest}`); },
          onError: (err) => { const msg = err instanceof Error ? err.message : String(err); toast.error(`Transfer failed: ${msg}`); },
        }
      );
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>Transfer Object</div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <Field label="Object ID">
          <input style={inputStyle} placeholder="0x... object id" value={objectId} onChange={(e) => setObjectId(e.target.value)} />
        </Field>
        <Field label="Recipient Address">
          <input style={inputStyle} placeholder="0x... recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onTransfer} disabled={isPending} style={btnBlue}>{isPending ? 'Submitting…' : 'Transfer'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

function getUtilFromHash(): UtilTab {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
  if (h.includes('sign')) return 'sign';
  if (h.includes('split')) return 'split';
  if (h.includes('transfer')) return 'transfer';
  return 'merge';
}

