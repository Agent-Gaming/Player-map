import axios from 'axios'
import { getPinataConstants } from './globalConstants'

interface PinataResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

export const uploadToPinata = async (file: File): Promise<string> => {
  try {
    // Récupérer les constantes Pinata
    const constants = getPinataConstants();
    if (!constants?.PINATA_CONFIG?.JWT_KEY) {
      throw new Error("Configuration Pinata manquante. Appelez setPinataConstants() avec PINATA_CONFIG");
    }

    const PINATA_JWT = constants.PINATA_CONFIG.JWT_KEY;
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    )

    return `ipfs://${response.data.IpfsHash}`
  } catch (error) {
    console.error('Erreur lors du téléversement vers Pinata:', error)
    throw new Error("Échec du téléversement de l'image vers IPFS")
  }
}

export const isIpfsUrl = (url: string | undefined): boolean => {
  if (!url) return false
  return url.startsWith('ipfs://')
}

export const ipfsToHttpUrl = (ipfsUrl: string): string => {
  if (!ipfsUrl) return ipfsUrl
  if (!isIpfsUrl(ipfsUrl)) return ipfsUrl

  // Utiliser ipfs.io (gateway publique officielle) directement pour éviter les 403
  const hash = ipfsUrl.replace("ipfs://", "")
  return `https://ipfs.io/ipfs/${hash}`
}
