import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SuiClientProvider,
  WalletProvider,
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSuiClientContext,
  useSignTransaction,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import '@mysten/dapp-kit/dist/index.css';
import { ToastProvider, useToast } from './toast';
import { coinsList } from '@alphafi/alphafi-sdk';
import { AlphalendClient, getUserPositionCapId } from '@alphafi/alphalend-sdk';
import { setSuiClient as setSevenKSuiClient, getQuote as sevenKGetQuote, buildTx as sevenKBuildTx } from '@7kprotocol/sdk-ts';
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';

type Coin = { coinType: string; coinObjectId: string; balance: string };
type CoinGroup = { coinType: string; count: number; total: bigint; coins: Coin[] };
type UtilTab = 'merge' | 'sign' | 'split' | 'transfer' | 'claim-swap' | 'best-quote';

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
  const { selectNetwork } = useSuiClientContext();
  const setNet = (name: 'mainnet' | 'testnet' | 'devnet' | 'custom', url: string) => {
    onRpcChange(url);
    selectNetwork(name);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', marginBottom: 16 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Sui Utils</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setNet('mainnet', MAINNET_URL)} style={btnSmall}>Mainnet</button>
          <button onClick={() => setNet('testnet', TESTNET_URL)} style={btnSmall}>Testnet</button>
          <button onClick={() => setNet('devnet', DEVNET_URL)} style={btnSmall}>Devnet</button>
        </div>
        <input
          style={{ padding: 8, minWidth: 360, border: '1px solid #ddd', borderRadius: 6 }}
          value={rpcUrl}
          onChange={(e) => {
            const v = e.target.value;
            onRpcChange(v);
            if (v === MAINNET_URL) selectNetwork('mainnet');
            else if (v === TESTNET_URL) selectNetwork('testnet');
            else if (v === DEVNET_URL) selectNetwork('devnet');
            else selectNetwork('custom');
          }}
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
  if (util === 'claim-swap') {
    return !account ? (
      <InfoBox title="Connect Wallet" text="Connect a wallet to claim and swap rewards." />
    ) : (
      <ClaimSwapRewardsPanel />
    );
  }
  if (util === 'best-quote') {
    return !account ? (
      <InfoBox title="Connect Wallet" text="Connect a wallet to swap tokens with best quote." />
    ) : (
      <BestQuoteSwapPanel />
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
    <aside style={{ width: 240, display: 'grid', gap: 12, alignSelf: 'flex-start' }}>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>
          General Utilities
        </div>
        <div style={{ display: 'block' }}>
          <NavItem label="Merge Coins" active={current === 'merge'} onClick={() => onSelect('merge')} icon="🪙" />
          <NavItem label="Sign Transaction" active={current === 'sign'} onClick={() => onSelect('sign')} icon="✍️" />
          <NavItem label="Split Coins" active={current === 'split'} onClick={() => onSelect('split')} icon="🪓" />
          <NavItem label="Transfer Object" active={current === 'transfer'} onClick={() => onSelect('transfer')} icon="📦" />
          <NavItem label="Best Quote Swap" active={current === 'best-quote'} onClick={() => onSelect('best-quote')} icon="🔀" />
        </div>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>
          Alphalend
        </div>
        <div style={{ display: 'block' }}>
          <NavItem label="Claim & Swap Rewards" active={current === 'claim-swap'} onClick={() => onSelect('claim-swap')} icon="🏆" />
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
  const { network } = useSuiClientContext();

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
      if (digest) {
        toast.success(`Transaction submitted. TxHash: ${digest}`, { link: { label: 'View on SuiVision', href: buildSuiVisionTxUrl(digest, network) } });
      } else {
        toast.success('Transaction submitted');
      }
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 220px 140px', gap: 0, padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>
          <div>Name</div>
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
const btnIcon: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 2,
  lineHeight: 0,
  cursor: 'pointer',
  borderRadius: 6,
};

function CoinRow({ group, onMerged }: { group: CoinGroup; onMerged: () => void }) {
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState<string | null>(null);
  const { data: metadata } = useCoinMetadata(group.coinType);
  const toast = useToast();
  const { network } = useSuiClientContext();

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
          if (res.digest) {
            toast.success(`Merge complete. TxHash: ${res.digest}`, { link: { label: 'View on SuiVision', href: buildSuiVisionTxUrl(res.digest, network) } });
          } else {
            toast.success(`Merge complete: ${digest}`);
          }
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 220px 140px', gap: 0, padding: '10px 12px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
      <div title={group.coinType} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
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
//

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
    <button onClick={onCopy} title="Copy" style={btnIcon} aria-label="Copy">
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 10.5L3.5 7.5L2.5 8.5L6.5 12.5L14 5L13 4L6.5 10.5Z" fill="#16a34a"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="3" width="8" height="10" rx="2" stroke="#4b5563" strokeWidth="1.2"/>
          <rect x="3" y="1" width="8" height="10" rx="2" stroke="#9ca3af" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  );
}

//

function SplitCoinsPanel() {
  const [coinId, setCoinId] = useState('');
  const [amounts, setAmounts] = useState('');
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const toast = useToast();
  const { network } = useSuiClientContext();

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
          onSuccess: (res) => {
            const digest = res.digest ?? 'submitted';
            if (res.digest) {
              toast.success(`Split submitted. TxHash: ${res.digest}`, { link: { label: 'View on SuiVision', href: buildSuiVisionTxUrl(res.digest, network) } });
            } else {
              toast.success(`Split submitted: ${digest}`);
            }
          },
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
  const { network } = useSuiClientContext();

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
          onSuccess: (res) => {
            const digest = res.digest ?? 'submitted';
            if (res.digest) {
              toast.success(`Transfer submitted. TxHash: ${res.digest}`, { link: { label: 'View on SuiVision', href: buildSuiVisionTxUrl(res.digest, network) } });
            } else {
              toast.success(`Transfer submitted: ${digest}`);
            }
          },
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
  if (h.includes('claim-swap')) return 'claim-swap';
  if (h.includes('best-quote')) return 'best-quote';
  return 'merge';
}

function buildSuiVisionTxUrl(digest: string, network: string) {
  const base = `https://suivision.xyz/txblock/${digest}`;
  if (network === 'testnet') return `${base}?network=testnet`;
  if (network === 'devnet') return `${base}?network=devnet`;
  return base;
}

// --- Protocol utility placeholders ---

function ClaimSwapRewardsPanel() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const toast = useToast();
  const { network } = useSuiClientContext();

  const [positionCapId, setPositionCapId] = useState('');
  const [rewardCoins, setRewardCoins] = useState<{ symbol: string; type: string; decimals: number; balance: bigint }[]>([]);
  const [claimableUsd, setClaimableUsd] = useState<string | null>(null);
  const [claimableByToken, setClaimableByToken] = useState<{ symbol: string; amount: string; coinType: string }[] | null>(null);
  const [claimableLoading, setClaimableLoading] = useState(false);
  const [router, setRouter] = useState<'7k' | 'cetus'>('7k');
  const [stagedSwap, setStagedSwap] = useState<{ coinType: string; amount: string }[] | null>(null);
  const [target, setTarget] = useState<'SUI' | 'STSUI' | 'USDC'>('SUI');
  const [slippagePct, setSlippagePct] = useState<number>(0.5);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const targetType = coinsList[target].type;
  const rewardCandidateSymbols: (keyof typeof coinsList)[] = ['ALPHA', 'USDT', 'USDC'];

  const refreshRewardBalances = async () => {
    if (!account) return;
    const out: { symbol: string; type: string; decimals: number; balance: bigint }[] = [];
    const candidates: string[] = (claimableByToken && claimableByToken.length)
      ? Array.from(new Set(claimableByToken.map(c => c.coinType)))
      : rewardCandidateSymbols.map(sym => coinsList[sym].type);
    for (const type of candidates) {
      let cursor: string | null = null;
      let total = 0n;
      do {
        const res = await client.getCoins({ owner: account.address, coinType: type, cursor, limit: 200 });
        for (const c of res.data) total += BigInt(c.balance);
        cursor = res.hasNextPage ? res.nextCursor : null;
      } while (cursor);
      const symbol = type.split('::').pop() || 'TOKEN';
      out.push({ symbol, type, decimals: 9, balance: total });
    }
    setRewardCoins(out);
  };

  const autoDetectPositionCap = async () => {
    if (!account) return;
    try {
      const sdkNetwork = (network === 'custom' ? 'mainnet' : network) as 'mainnet' | 'testnet' | 'devnet';
      const id = await getUserPositionCapId(client as any, sdkNetwork, account.address);
      if (id) { setPositionCapId(id); toast.success('Detected PositionCap'); }
      else toast.error('No PositionCap found on this address.');
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    }
  };

  const detectClaimable = async () => {
    if (!account) return;
    try {
      setClaimableLoading(true);
      const sdkNetwork = (network === 'custom' ? 'mainnet' : network) as 'mainnet' | 'testnet' | 'devnet';
      const alClient = new AlphalendClient(sdkNetwork, client as any);
      const portfolios = await alClient.getUserPortfolio(account.address);
      if (portfolios && portfolios.length > 0) {
        const p: any = portfolios[0];
        setClaimableUsd(String(p.rewardsToClaimUsd));
        const list = (p.rewardsToClaim || []).map((r: any) => {
          const coinType = String(r.coinType);
          const sym = coinType.split('::').pop() || 'TOKEN';
          return { symbol: sym, amount: String(r.rewardAmount), coinType };
        });
        setClaimableByToken(list);
      } else {
        setClaimableUsd('0');
        setClaimableByToken([]);
      }
    } catch (e: any) {
      setClaimableUsd(null);
      setClaimableByToken(null);
      toast.error(e?.message ?? String(e));
    } finally { setClaimableLoading(false); }
  };

  const buildClaimAllTx = async () => {
    if (!account) throw new Error('Connect wallet.');
    if (!positionCapId) throw new Error('Enter your PositionCap ID.');
    const alClient = new AlphalendClient('mainnet', client as any);
    const tx = await alClient.claimRewards({
      positionCapId,
      address: account.address,
      claimAndDepositAlpha: false,
      claimAndDepositAll: false,
    });
    return tx;
  };

  const doClaim = async (andSwap = false) => {
    try {
      if (!account) throw new Error('Connect wallet.');
      // Always fetch fresh claimables snapshot to stage
      const claimablesNow = await (async () => {
        const sdkNetwork = (network === 'custom' ? 'mainnet' : network) as 'mainnet' | 'testnet' | 'devnet';
        const alClient = new AlphalendClient(sdkNetwork, client as any);
        const portfolios = await alClient.getUserPortfolio(account.address);
        if (!portfolios || portfolios.length === 0) return [] as { coinType: string; amount: string }[];
        const p: any = portfolios[0];
        return (p.rewardsToClaim || []).map((r: any) => ({ coinType: String(r.coinType), amount: String(r.rewardAmount) }));
      })();
      const snapshot = claimablesNow
        .filter((r) => { const n = Number(String(r.amount || '0')); return isFinite(n) && n > 0; })
        .map((r) => ({ coinType: r.coinType, amount: String(r.amount) }));
      const txb = await buildClaimAllTx();
      signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (res) => {
            toast.success(`Claim submitted. TxHash: ${res.digest}`, { link: { label: 'View on SuiVision', href: buildSuiVisionTxUrl(res.digest!, network) } });
            // Stage amounts that were pending at claim time for swapping
            setStagedSwap(snapshot);
            if (andSwap) {
              try { await client.waitForTransaction({ digest: res.digest!, options: { showEffects: true } }); } catch {}
              await doSwapAll();
            }
          },
          onError: (err) => { const msg = err instanceof Error ? err.message : String(err); toast.error(`Claim failed: ${msg}`); },
        }
      );
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
  };

  const doSwapAll = async () => {
    try {
      if (!account) throw new Error('Connect wallet.');
      if (!stagedSwap || stagedSwap.length === 0) {
        toast.error('No claimed rewards to swap. Claim first.');
        return;
      }
      setLoadingQuote(true);
      setSevenKSuiClient(client as any);
      const decimalsCache = new Map<string, number>();
      const total = stagedSwap.length;
      let successCount = 0;
      const toRaw = (amtStr: string, decimals: number): string => {
        if (!amtStr) return '0';
        const s = String(amtStr).trim();
        if (!s.includes('.')) return s; // already integer
        const [whole, fracRaw = ''] = s.split('.');
        const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
        const wholePart = whole ? BigInt(whole) : 0n;
        const fracPart = frac ? BigInt(frac) : 0n;
        const scale = 10n ** BigInt(decimals);
        return (wholePart * scale + fracPart).toString();
      };
      const remaining: { coinType: string; amount: string }[] = [];
      for (const entry of stagedSwap) {
        try {
          const metaDecimals = decimalsCache.has(entry.coinType)
            ? decimalsCache.get(entry.coinType)!
            : (await client.getCoinMetadata({ coinType: entry.coinType }).catch(() => ({ decimals: 9 as number })))?.decimals ?? 9;
          decimalsCache.set(entry.coinType, metaDecimals);
          const raw = toRaw(entry.amount, metaDecimals);
          if (raw === '0' || BigInt(raw) <= 0n) continue;
          const quote = await sevenKGetQuote({ tokenIn: entry.coinType, tokenOut: targetType, amountIn: raw });
          if (!quote) { remaining.push(entry); continue; }
          let tx = new Transaction();
          const built = await sevenKBuildTx({
            quoteResponse: quote,
            accountAddress: account.address,
            slippage: Math.max(0, Math.min(1, slippagePct / 100)),
            commission: { partner: '0x401c29204828bed9a2f9f65f9da9b9e54b1e43178c88811e2584e05cf2c3eb6f', commissionBps: 0 },
            extendTx: { tx },
          } as any);
          tx = built.tx;
          if (built.coinOut) tx.transferObjects([built.coinOut], account.address);
          try { tx.setGasBudget(300_000_000); } catch {}
          await new Promise<void>((resolve, reject) => {
            signAndExecute({ transaction: tx }, {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            });
          });
          successCount += 1;
        } catch (err) {
          // Fallback: retry with slightly reduced amount and higher slippage (1.0%)
          try {
            const fallbackRaw = (() => { try { const v = BigInt(raw); return v > 1n ? (v - 1n).toString() : raw; } catch { return raw; } })();
            const q2 = await sevenKGetQuote({ tokenIn: entry.coinType, tokenOut: targetType, amountIn: fallbackRaw });
            if (!q2) throw err;
            let tx2 = new Transaction();
            const b2 = await sevenKBuildTx({
              quoteResponse: q2,
              accountAddress: account.address,
              slippage: 0.01, // 1.0%
              commission: { partner: '0x401c29204828bed9a2f9f65f9da9b9e54b1e43178c88811e2584e05cf2c3eb6f', commissionBps: 0 },
              extendTx: { tx: tx2 },
            } as any);
            tx2 = b2.tx;
            if (b2.coinOut) tx2.transferObjects([b2.coinOut], account.address);
            try { tx2.setGasBudget(300_000_000); } catch {}
            await new Promise<void>((resolve, reject) => {
              signAndExecute({ transaction: tx2 }, {
                onSuccess: () => resolve(),
                onError: (e2) => reject(e2),
              });
            });
            successCount += 1;
          } catch (finalErr) {
            remaining.push(entry);
            const msg = finalErr instanceof Error ? finalErr.message : String(finalErr);
            toast.error(`Swap failed for ${(entry.coinType || '').split('::').pop()}: ${msg}`);
          }
        }
      }
      setStagedSwap(remaining.length ? remaining : null);
      const failed = remaining.length;
      if (successCount > 0) {
        toast.success(`Swapped ${successCount}/${total} token(s). ${failed > 0 ? failed + ' pending' : 'All done.'}`);
      } else {
        toast.error('Swap failed for all tokens.');
      }
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setLoadingQuote(false); }
  };

  const doClaimSwapCetus = async () => {
    try {
      if (!account) throw new Error('Connect wallet.');
      if (!claimableByToken) await detectClaimable();
      const snapshot = (claimableByToken || [])
        .filter((r) => {
          const n = Number(String(r.amount || '0'));
          return isFinite(n) && n > 0;
        })
        .map((r) => ({ coinType: r.coinType, amount: String(r.amount) }));
      const txb = await buildClaimAllTx();
      signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (res) => {
            toast.success(`Claim submitted. TxHash: ${res.digest}`, { link: { label: 'View on SuiVision', href: buildSuiVisionTxUrl(res.digest!, network) } });
            setStagedSwap(snapshot);
            try { await client.waitForTransaction({ digest: res.digest!, options: { showEffects: true } }); } catch {}
            await doSwapAllCetus();
          },
          onError: (err) => { const msg = err instanceof Error ? err.message : String(err); toast.error(`Claim failed: ${msg}`); },
        }
      );
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
  };

  const doSwapAllCetus = async () => {
    try {
      if (!account) throw new Error('Connect wallet.');
      if (!stagedSwap || stagedSwap.length === 0) {
        toast.error('No claimed rewards to swap. Claim first.');
        return;
      }
      setLoadingQuote(true);
      const sdk = initCetusSDK({ network: (network === 'custom' ? 'mainnet' : network) as 'mainnet' | 'testnet' | 'devnet' });
      const decimalsCache = new Map<string, number>();
      const total = stagedSwap.length;
      let successCount = 0;
      const toRaw = (amtStr: string, decimals: number): string => {
        if (!amtStr) return '0';
        const s = String(amtStr).trim();
        if (!s.includes('.')) return s;
        const [whole, fracRaw = ''] = s.split('.');
        const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
        const wholePart = whole ? BigInt(whole) : 0n;
        const fracPart = frac ? BigInt(frac) : 0n;
        const scale = 10n ** BigInt(decimals);
        return (wholePart * scale + fracPart).toString();
      };
      const remaining: { coinType: string; amount: string }[] = [];
      for (const entry of stagedSwap) {
        try {
          const metaDecimals = decimalsCache.has(entry.coinType)
            ? decimalsCache.get(entry.coinType)!
            : (await client.getCoinMetadata({ coinType: entry.coinType }).catch(() => ({ decimals: 9 as number })))?.decimals ?? 9;
          decimalsCache.set(entry.coinType, metaDecimals);
          const raw = toRaw(entry.amount, metaDecimals);
          if (raw === '0' || BigInt(raw) <= 0n) continue;
          const pools = await sdk.Pool.getPoolByCoins([entry.coinType, targetType]);
          if (!pools || pools.length === 0) {
            remaining.push(entry);
            toast.error(`No Cetus pool found for ${(entry.coinType || '').split('::').pop()}→${(targetType || '').split('::').pop()}`);
            continue;
          }
          const bestPool = (() => {
            try { return pools.sort((a: any, b: any) => Number((b.liquidity || '0')) - Number((a.liquidity || '0')))[0]; } catch { return pools[0]; }
          })();
          const a2b = bestPool.coinTypeA === entry.coinType && bestPool.coinTypeB === targetType;
          const by_amount_in = true;
          const amount_in = raw;
          const slippage = Math.max(0, Math.min(1, slippagePct / 100));
          // pre-swap (optional) - not strictly needed but helpful to validate
          try {
            await sdk.Swap.preSwap({
              pool_id: bestPool.poolAddress || bestPool.pool_id || bestPool.id,
              a2b,
              by_amount_in,
              amount: amount_in,
            });
          } catch {}
          // create tx
          let tx = await sdk.Swap.createSwapTransactionPayload({
            pool_id: bestPool.poolAddress || bestPool.pool_id || bestPool.id,
            a2b,
            by_amount_in,
            amount: amount_in,
            slippage,
            coinTypeA: bestPool.coinTypeA,
            coinTypeB: bestPool.coinTypeB,
          } as any);
          try { tx.setGasBudget(300_000_000); } catch {}
          await new Promise<void>((resolve, reject) => {
            signAndExecute({ transaction: tx }, {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            });
          });
          successCount += 1;
        } catch (err) {
          // Retry with slightly reduced amount and higher slippage
          try {
            const pools = await sdk.Pool.getPoolByCoins([entry.coinType, targetType]);
            if (!pools || pools.length === 0) throw err;
            const bestPool = pools[0];
            const a2b = bestPool.coinTypeA === entry.coinType && bestPool.coinTypeB === targetType;
            const by_amount_in = true;
            const metaDecimals = decimalsCache.get(entry.coinType) ?? 9;
            const raw = toRaw(entry.amount, metaDecimals);
            const fallbackRaw = (() => { try { const v = BigInt(raw); return v > 1n ? (v - 1n).toString() : raw; } catch { return raw; } })();
            let tx2 = await sdk.Swap.createSwapTransactionPayload({
              pool_id: bestPool.poolAddress || bestPool.pool_id || bestPool.id,
              a2b,
              by_amount_in,
              amount: fallbackRaw,
              slippage: 0.01, // 1.0%
              coinTypeA: bestPool.coinTypeA,
              coinTypeB: bestPool.coinTypeB,
            } as any);
            try { tx2.setGasBudget(300_000_000); } catch {}
            await new Promise<void>((resolve, reject) => {
              signAndExecute({ transaction: tx2 }, {
                onSuccess: () => resolve(),
                onError: (e2) => reject(e2),
              });
            });
            successCount += 1;
          } catch (finalErr) {
            remaining.push(entry);
            const msg = finalErr instanceof Error ? finalErr.message : String(finalErr);
            toast.error(`Cetus swap failed for ${(entry.coinType || '').split('::').pop()}: ${msg}`);
          }
        }
      }
      setStagedSwap(remaining.length ? remaining : null);
      const failed = remaining.length;
      if (successCount > 0) {
        toast.success(`Cetus swapped ${successCount}/${total} token(s). ${failed > 0 ? failed + ' pending' : 'All done.'}`);
      } else {
        toast.error('Cetus swap failed for all tokens.');
      }
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setLoadingQuote(false); }
  };

  // Auto-load position cap and claimables on wallet connect/switch or network change
  useEffect(() => {
    setPositionCapId('');
    setClaimableUsd(null);
    setClaimableByToken(null as any);
    if (account?.address) {
      (async () => {
        try {
          await autoDetectPositionCap();
          await detectClaimable();
        } catch {}
      })();
    }
  }, [account?.address, network]);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>Claim & Swap Rewards</div>
      <div style={{ padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', alignItems: 'end' }}>
          <Field label="PositionCap ID">
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#111827', wordBreak: 'break-all' }}>
              {positionCapId || '—'}
            </div>
          </Field>
        </div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', alignItems: 'end' }}>
          <Field label="Swap Router">
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="router" checked={router === '7k'} onChange={() => setRouter('7k')} /> 7k
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="router" checked={router === 'cetus'} onChange={() => setRouter('cetus')} /> Cetus
              </label>
            </div>
          </Field>
        </div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', alignItems: 'end' }}>
          <Field label="Pending Rewards (pre-claim)">
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#374151' }}>
                {claimableByToken && claimableByToken.length
                  ? claimableByToken.map(r => `${r.symbol}:${r.amount}`).join(', ')
                  : '—'}
              </div>
              <div style={{ color: '#4b5563' }}>Total USD: {claimableUsd ?? '—'}</div>
              <div>
                <button onClick={detectClaimable} disabled={claimableLoading} style={btnGray}>
                  {claimableLoading ? 'Refreshing…' : 'Refresh pending rewards'}
                </button>
              </div>
            </div>
          </Field>
        </div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', alignItems: 'end' }}>
          <Field label="Swap To (target)">
            <select style={inputStyle} value={target} onChange={(e) => setTarget(e.target.value as any)}>
              <option value="SUI">SUI</option>
              <option value="STSUI">stSUI</option>
              <option value="USDC">USDC</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', alignItems: 'end' }}>
          <Field label="Slippage">
            <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 64px)', width: 192, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setSlippagePct(0.1)}
                aria-pressed={slippagePct === 0.1}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  background: slippagePct === 0.1 ? '#2563eb' : '#ffffff',
                  color: slippagePct === 0.1 ? '#ffffff' : '#111827',
                  border: 'none',
                  borderRight: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                0.1%
              </button>
              <button
                type="button"
                onClick={() => setSlippagePct(0.5)}
                aria-pressed={slippagePct === 0.5}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  background: slippagePct === 0.5 ? '#2563eb' : '#ffffff',
                  color: slippagePct === 0.5 ? '#ffffff' : '#111827',
                  border: 'none',
                  borderRight: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                0.5%
              </button>
              <button
                type="button"
                onClick={() => setSlippagePct(1)}
                aria-pressed={slippagePct === 1}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  background: slippagePct === 1 ? '#2563eb' : '#ffffff',
                  color: slippagePct === 1 ? '#ffffff' : '#111827',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                1.0%
              </button>
            </div>
          </Field>
        </div>
        {router === '7k' ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => doClaim(false)} disabled={isPending} style={btnGray}>{isPending ? 'Claiming…' : 'Claim'}</button>
            <button onClick={doSwapAll} disabled={isPending || loadingQuote} style={btnBlue}>{loadingQuote ? 'Routing…' : 'Swap'}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={doClaimSwapCetus} disabled={isPending || loadingQuote} style={btnBlue}>{isPending || loadingQuote ? 'Processing…' : 'Claim + Swap'}</button>
          </div>
        )}
        {stagedSwap && stagedSwap.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#4b5563' }}>
            Ready to swap: {stagedSwap.map((s) => `${(s.coinType || '').split('::').pop() || 'TOKEN'}:${s.amount}`).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

function BestQuoteSwapPanel() {
  const [fromType, setFromType] = useState('');
  const [toType, setToType] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const onQuote = () => {
    if (!fromType.trim() || !toType.trim() || !amountRaw.trim()) {
      setInfo('Enter from/to coin types and amount (raw).');
      return;
    }
    setInfo('Coming soon: Compare quotes across 7k, Cetus, etc.');
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600 }}>Best Quote Swap</div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <Field label="From Coin Type">
          <input style={inputStyle} placeholder="0x...::module::COIN" value={fromType} onChange={(e) => setFromType(e.target.value)} />
        </Field>
        <Field label="To Coin Type">
          <input style={inputStyle} placeholder="0x...::module::COIN" value={toType} onChange={(e) => setToType(e.target.value)} />
        </Field>
        <Field label="Amount (raw units)">
          <input style={inputStyle} placeholder="e.g. 100000000" value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onQuote} style={btnBlue}>Get Best Quote (placeholder)</button>
        </div>
        {info && <div style={{ color: '#6b7280' }}>{info}</div>}
      </div>
    </div>
  );
}
