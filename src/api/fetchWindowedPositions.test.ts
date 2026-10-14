import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWindowedNetPositions } from './fetchWindowedPositions';

const WALLET = '0xabc0000000000000000000000000000000dead';
const WINDOW = { start: '2026-01-01T00:00:00Z', end: '2026-01-31T00:00:00Z' };

function mockFetchOnce(data: { deposits?: any[]; redemptions?: any[] }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { deposits: [], redemptions: [], ...data } }),
  }) as any;
}

describe('fetchWindowedNetPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty map with no term ids or no wallet', async () => {
    mockFetchOnce({});
    expect((await fetchWindowedNetPositions([], WALLET, WINDOW)).size).toBe(0);
    expect((await fetchWindowedNetPositions(['0x1'], '', WINDOW)).size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('nets a deposit alone to a positive balance', async () => {
    mockFetchOnce({ deposits: [{ term_id: '0x1', shares: '100' }] });
    const net = await fetchWindowedNetPositions(['0x1'], WALLET, WINDOW);
    expect(net.get('0x1')).toBe(100n);
  });

  it('cancels out a deposit and redemption on the same term_id within the window', async () => {
    mockFetchOnce({
      deposits: [{ term_id: '0x1', shares: '100' }],
      redemptions: [{ term_id: '0x1', shares: '100' }],
    });
    const net = await fetchWindowedNetPositions(['0x1'], WALLET, WINDOW);
    expect(net.get('0x1')).toBe(0n);
  });

  it('tracks separate term_ids independently', async () => {
    mockFetchOnce({
      deposits: [{ term_id: '0x1', shares: '30' }, { term_id: '0x2', shares: '10' }],
      redemptions: [{ term_id: '0x1', shares: '10' }],
    });
    const net = await fetchWindowedNetPositions(['0x1', '0x2'], WALLET, WINDOW);
    expect(net.get('0x1')).toBe(20n);
    expect(net.get('0x2')).toBe(10n);
  });

  it('returns an empty map on a network/GraphQL error instead of throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    const net = await fetchWindowedNetPositions(['0x1'], WALLET, WINDOW);
    expect(net.size).toBe(0);
  });
});
