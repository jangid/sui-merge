import { describe, it, expect } from 'vitest';
import { groupCoins, buildSuiVisionTxUrl, formatUnits, symbolFromType } from './lib/utils';

describe('formatUnits', () => {
  it('formats with decimals', () => {
    expect(formatUnits(123456789n, 6)).toBe('123.456789');
    expect(formatUnits(0n, 9)).toBe('0');
  });
});

describe('buildSuiVisionTxUrl', () => {
  it('builds correct network URLs', () => {
    expect(buildSuiVisionTxUrl('0xabc', 'mainnet')).toBe('https://suivision.xyz/txblock/0xabc');
    expect(buildSuiVisionTxUrl('0xabc', 'testnet')).toBe('https://suivision.xyz/txblock/0xabc?network=testnet');
    expect(buildSuiVisionTxUrl('0xabc', 'devnet')).toBe('https://suivision.xyz/txblock/0xabc?network=devnet');
  });
});

describe('groupCoins', () => {
  it('groups by coinType and sums correctly', () => {
    const coins = [
      { coinType: '0x1::sui::SUI', coinObjectId: 'a', balance: '1' },
      { coinType: '0x1::sui::SUI', coinObjectId: 'b', balance: '2' },
      { coinType: '0x2::usd::USDC', coinObjectId: 'c', balance: '10' },
    ];
    const groups = groupCoins(coins as any);
    expect(groups[0].coinType).toBe('0x1::sui::SUI');
    expect(groups[0].count).toBe(2);
    expect(groups[0].total).toBe(3n);
    expect(groups[1].coinType).toBe('0x2::usd::USDC');
    expect(groups[1].count).toBe(1);
    expect(groups[1].total).toBe(10n);
  });
});

describe('symbolFromType', () => {
  it('extracts symbol from coin type', () => {
    expect(symbolFromType('0x1::sui::SUI')).toBe('SUI');
    expect(symbolFromType('weird')).toBe('weird');
  });
});
