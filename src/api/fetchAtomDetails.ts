import { Network, API_URLS } from '../hooks/useAtomData';
import { ipfsToHttpUrl, isIpfsUrl } from '../utils/pinata';

// Interface pour les détails d'un atom
export interface AtomDetails {
  term_id: string;
  image: string;
  label: string;
  emoji: string;
  type: string;
  creator_id: string;
  value?: {
    person?: {
      description: string;
    };
    organization?: {
      description: string;
    };
    thing?: {
      description: string;
    };
    book?: {
      description: string;
    };
  };
  term?: {
    total_market_cap: number;
  };
}

// Fetch Atom Details
export const fetchAtomDetails = async (atomId: string, network: Network = Network.MAINNET): Promise<AtomDetails | null> => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAtom($atomId: String!) {
            atoms(where: { term_id: { _eq: $atomId } }) {
              term_id
              image
              label
              emoji
              type
              creator_id
              data
            }
          }
        `,
        variables: { atomId }
      })
    });

    const data = await response.json();
    const atom = data.data?.atoms?.[0];

    if (!atom) return null;

    // Fetch term details separately
    let termDetails = null;
    if (atom.term_id) {
      try {
        const termResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetTerm($termId: String!) {
                terms(where: { id: { _eq: $termId } }) {
                  id
                  total_market_cap
                }
              }
            `,
            variables: { termId: atom.term_id }
          })
        });
        const termData = await termResponse.json();
        termDetails = termData.data?.terms?.[0] || null;
      } catch (error) {
        console.warn('Error fetching term details:', error);
      }
    }

    // Fetch description from IPFS if data field exists
    let description = undefined;
    if (atom.data) {
      try {
        const dataUrl = isIpfsUrl(atom.data) ? await ipfsToHttpUrl(atom.data) : atom.data;
        const dataResponse = await fetch(dataUrl);
        if (dataResponse.ok) {
          const ipfsData = await dataResponse.json();
          description = ipfsData.description || undefined;
        }
      } catch (error) {
        console.warn('Error fetching atom description from IPFS:', error);
      }
    }

    // Retourner l'atom avec la structure complète
    // Structure value pour compatibilité avec AtomDetailsSection
    return {
      ...atom,
      term: termDetails ? { total_market_cap: termDetails.total_market_cap } : undefined,
      value: description ? {
        person: { description },
        organization: { description },
        thing: { description },
        book: { description }
      } : undefined
    } as AtomDetails;
  } catch (error) {
    console.error('Error fetching atom details:', error);
    return null;
  }
};




