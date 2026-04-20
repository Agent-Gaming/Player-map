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

export const ipfsToHttpUrl = (ipfsUrl: string): string => {
  if (!ipfsUrl) return ipfsUrl

  // Convert ipfs:// to HTTP
  if (isIpfsUrl(ipfsUrl)) {
    const hash = ipfsUrl.replace("ipfs://", "")
    const httpUrl = `https://ipfs.io/ipfs/${hash}`
    return proxyIfDiscord(httpUrl)
  }

  // For already-HTTP URLs, proxy in Discord mode
  return proxyIfDiscord(ipfsUrl)
}
