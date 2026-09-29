import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAtomCreation } from './useAtomCreation';
import { setPinataConstants } from '../utils/globalConstants';

// Regression guard for the bug audited this session: createAtomFromIpfsUpload
// (SDK @0xintuition/sdk@2.0.2) writes toHex(IpfsHash) on-chain — the bare CID,
// missing the "ipfs://" scheme — so the Portal/subgraph never resolves the
// atom and displays the raw CID instead of its name. createAtom() and
// createConsentAtom() must go through createAtomFromIpfsUri with a properly
// prefixed URI instead. This test fails loudly if that regresses.

const uploadJsonToPinata = vi.fn();
const createAtomFromIpfsUri = vi.fn();
const createAtomFromIpfsUpload = vi.fn();

vi.mock('@0xintuition/sdk', () => ({
  createAtomFromString: vi.fn(),
  createAtomFromEthereumAccount: vi.fn(),
  get createAtomFromIpfsUri() {
    return createAtomFromIpfsUri;
  },
  get createAtomFromIpfsUpload() {
    return createAtomFromIpfsUpload;
  },
  get uploadJsonToPinata() {
    return uploadJsonToPinata;
  },
}));

vi.mock('../abi', () => ({
  ATOM_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001',
  atomABI: [],
}));

describe('useAtomCreation — IPFS atom encoding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPinataConstants({ PINATA_CONFIG: { JWT_KEY: 'test-jwt', IPFS_GATEWAY: 'gateway.pinata.cloud' } });
    uploadJsonToPinata.mockResolvedValue({ IpfsHash: 'bafkreitestcid1234567890abcdef' });
    createAtomFromIpfsUri.mockImplementation(async (_config: unknown, uri: string) => ({
      uri,
      transactionHash: '0xdeadbeef',
      state: { termId: '1' },
    }));
  });

  const setup = () =>
    useAtomCreation({
      walletConnected: {},
      walletAddress: '0x0000000000000000000000000000000000dead',
      publicClient: {},
    });

  it('createAtom() pins via createAtomFromIpfsUri with an ipfs:// prefixed URI', async () => {
    const { createAtom } = setup();
    await createAtom({ name: 'Racoonmatata' });

    expect(createAtomFromIpfsUpload).not.toHaveBeenCalled();
    expect(createAtomFromIpfsUri).toHaveBeenCalledTimes(1);

    const uriArg = createAtomFromIpfsUri.mock.calls[0][1] as string;
    expect(uriArg.startsWith('ipfs://')).toBe(true);
    expect(uriArg).toBe(`ipfs://${(await uploadJsonToPinata.mock.results[0].value).IpfsHash}`);
  });

  it('createConsentAtom() pins via createAtomFromIpfsUri with an ipfs:// prefixed URI', async () => {
    const { createConsentAtom } = setup();
    await createConsentAtom({ accepted: true, message_hash: '0x123' });

    expect(createAtomFromIpfsUpload).not.toHaveBeenCalled();
    expect(createAtomFromIpfsUri).toHaveBeenCalledTimes(1);

    const uriArg = createAtomFromIpfsUri.mock.calls[0][1] as string;
    expect(uriArg.startsWith('ipfs://')).toBe(true);
  });
});
