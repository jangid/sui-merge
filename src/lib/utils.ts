export type Coin = { coinType: string; coinObjectId: string; balance: string };
export type CoinGroup = { coinType: string; count: number; total: bigint; coins: Coin[] };

export function groupCoins(coins: Coin[]): CoinGroup[] {
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

export function symbolFromType(coinType: string) {
  const parts = coinType.split('::');
  return parts[2] || coinType;
}

export function formatUnits(amount: bigint, decimals: number): string {
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

export function buildSuiVisionTxUrl(digest: string, network: string) {
  const base = `https://suivision.xyz/txblock/${digest}`;
  if (network === 'testnet') return `${base}?network=testnet`;
  if (network === 'devnet') return `${base}?network=devnet`;
  return base;
}

