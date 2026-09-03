import { getPinataConstants } from './globalConstants'

interface PinataResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

export const uploadToPinata = async (file: File): Promise<string> => {
  const constants = getPinataConstants();
  if (!constants?.PINATA_CONFIG?.JWT_KEY) {
    throw new Error("Configuration Pinata manquante. Appelez setPinataConstants() avec PINATA_CONFIG");
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${constants.PINATA_CONFIG.JWT_KEY}` },
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('Pinata upload error:', response.status, text)
    throw new Error(`Échec du téléversement de l'image vers IPFS (${response.status}: ${text.slice(0, 120)})`)
  }

  const data: PinataResponse = await response.json()
  return `ipfs://${data.IpfsHash}`
}

export const isIpfsUrl = (url: string | undefined): boolean => {
  if (!url) return false
  return url.startsWith('ipfs://')
}

const isDiscordActivity = (): boolean =>
  typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com');

// Proxy any external HTTP(S) URL through the local server in Discord mode
const proxyIfDiscord = (url: string): string => {
  if (!url || !isDiscordActivity()) return url
  if (url.startsWith('data:') || url.startsWith('/.proxy/')) return url
  return `/.proxy/img-proxy?url=${encodeURIComponent(url)}`
}

// Matches a CID out of either an ipfs:// URI or any /ipfs/<CID> gateway URL,
// so alternate gateways can be tried even when the stored src is already an
// http(s) gateway URL (e.g. atoms created after useAtomCreation converts
// ipfs:// to http before persisting the image field on-chain).
const IPFS_CID_RE = /(?:ipfs:\/\/|\/ipfs\/)([a-zA-Z0-9]+)/

export const extractIpfsHash = (url: string | undefined): string | null => {
  if (!url) return null
  const match = url.match(IPFS_CID_RE)
  return match ? match[1] : null
}

// Shared, unauthenticated gateway that serves any public CID regardless of
// which account pinned it — unlike a host's dedicated Pinata gateway
// (custom subdomain), which only serves content pinned to that specific
// account and 404s (ERR_ID:00006) on anything pinned elsewhere.
export const PUBLIC_FALLBACK_GATEWAY = "gateway.pinata.cloud"

export const ipfsToHttpUrl = (ipfsUrl: string, gatewayOverride?: string): string => {
  if (!ipfsUrl) return ipfsUrl

  // Atoms created in Discord mode may have stored proxy URLs — decode them back
  if (ipfsUrl.startsWith('/.proxy/img-proxy?url=')) {
    const embedded = decodeURIComponent(ipfsUrl.slice('/.proxy/img-proxy?url='.length))
    return proxyIfDiscord(embedded)
  }

  // Convert ipfs:// (or re-target an already-http /ipfs/<CID> URL, e.g. one
  // persisted on-chain back when this always hardcoded ipfs.io) to the
  // configured gateway. Every rendered avatar/atom image fires its own
  // independent request (no dedup, no shared retry for the many consumers
  // that call this directly instead of going through SafeImage), and
  // bursts of parallel unauthenticated requests get Cloudflare-challenged/
  // 403'd on ipfs.io — so the *first* choice has to be the reliable one,
  // not just a fallback option.
  const hash = extractIpfsHash(ipfsUrl)
  if (hash) {
    const gateway = gatewayOverride || getPinataConstants()?.PINATA_CONFIG?.IPFS_GATEWAY || PUBLIC_FALLBACK_GATEWAY
    const httpUrl = `https://${gateway}/ipfs/${hash}`
    return proxyIfDiscord(httpUrl)
  }

  // For already-HTTP, non-IPFS URLs, proxy in Discord mode
  return proxyIfDiscord(ipfsUrl)
}
