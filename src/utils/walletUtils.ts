import { encodeFunctionData } from 'viem';

/**
 * Unified contract write helper.
 *
 * Supports three calling conventions:
 *   1. viem WalletClient — walletConnected.writeContract(params)
 *   2. viem WalletClient fallback — walletConnected.sendTransaction({ to, data, value, gas })
 *   3. wagmi v2 Config — writeContract(config, params) from @wagmi/core
 *
 * Returns the transaction hash as a string.
 */
export async function contractWrite(
  walletConnected: any,
  params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args: any[];
    value?: bigint;
    gas?: bigint;
  }
): Promise<string> {
  const { address, abi, functionName, args, value, gas } = params;

  // 1. Viem WalletClient — writeContract method
  if (typeof walletConnected?.writeContract === 'function') {
    const result = await walletConnected.writeContract({ address, abi, functionName, args, value, gas });
    return typeof result === 'string' ? result : result?.hash ?? String(result);
  }

  // 2. Viem WalletClient — sendTransaction fallback
  if (typeof walletConnected?.sendTransaction === 'function') {
    const data = encodeFunctionData({ abi, functionName, args });
    const result = await walletConnected.sendTransaction({ to: address, data, value, gas });
    return typeof result === 'string' ? result : result?.hash ?? String(result);
  }

  // 3. Wagmi v2 Config — @wagmi/core standalone writeContract(config, params)
  try {
    const wagmiCore = await import('@wagmi/core');
    if (typeof wagmiCore?.writeContract === 'function') {
      const hash = await wagmiCore.writeContract(walletConnected, { address, abi, functionName, args, value });
      return hash as string;
    }
  } catch {
    // @wagmi/core not available or failed
  }

  throw new Error(
    'walletConnected does not support writeContract or sendTransaction. ' +
    'Pass a viem WalletClient or a wagmi v2 Config object.'
  );
}

/**
 * Wait for a transaction receipt.
 *
 * Tries: publicClient → walletConnected → @wagmi/core → legacy ethers.js txHash.wait()
 */
export async function waitForReceipt(
  txHash: any,
  walletConnected: any,
  publicClient: any
): Promise<any> {
  const normalizedHash = typeof txHash === 'string' ? txHash : txHash?.hash ?? txHash;

  if (publicClient?.waitForTransactionReceipt) {
    return publicClient.waitForTransactionReceipt({ hash: normalizedHash });
  }
  if (walletConnected?.waitForTransactionReceipt) {
    return walletConnected.waitForTransactionReceipt({ hash: normalizedHash });
  }
  // Legacy ethers.js TransactionResponse
  if (typeof txHash?.wait === 'function') {
    return txHash.wait();
  }
  // Wagmi v2 Config
  try {
    const wagmiCore = await import('@wagmi/core');
    if (typeof wagmiCore?.waitForTransactionReceipt === 'function') {
      return wagmiCore.waitForTransactionReceipt(walletConnected, { hash: normalizedHash });
    }
  } catch {
    // @wagmi/core not available
  }
  // Passive fallback
  await new Promise(resolve => setTimeout(resolve, 3000));
  return undefined;
}
