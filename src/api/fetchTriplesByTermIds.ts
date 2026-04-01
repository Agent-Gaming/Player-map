import { Network, API_URLS } from '../hooks/useAtomData';

export interface TripleObjectDetail {
  term_id: string;
  object: {
    term_id: string;
    label: string;
    image?: string;
  };
}

export interface TripleSubjectTermDetail {
  term_id: string;
  subject_term: {
    id: string;
    triple: {
      subject: { label: string; term_id: string } | null;
      predicate: { label: string } | null;
      object: { label: string; image?: string; term_id: string } | null;
    };
  } | null;
}

export const fetchTriplesByTermIds = async (
  termIds: string[],
  network: Network = Network.MAINNET
): Promise<TripleObjectDetail[]> => {
  if (termIds.length === 0) return [];

  const query = `query GetTriplesByTermIds($termIds: [String!]!) {
    triples(where: { term_id: { _in: $termIds } }) {
      term_id
      object {
        term_id
        label
        image
      }
    }
  }`;

  try {
    const response = await fetch(API_URLS[network], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { termIds } }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('[fetchTriplesByTermIds] GraphQL errors:', data.errors);
      return [];
    }

    return data.data?.triples ?? [];
  } catch (error) {
    console.error('[fetchTriplesByTermIds] error:', error);
    return [];
  }
};

export const fetchTripleSubjectTerms = async (
  termIds: string[],
  network: Network = Network.MAINNET
): Promise<TripleSubjectTermDetail[]> => {
  if (termIds.length === 0) return [];

  const query = `query GetTripleSubjectTerms($termIds: [String!]!) {
    triples(where: { term_id: { _in: $termIds } }) {
      term_id
      subject_term {
        id
        triple {
          subject { label term_id }
          predicate { label }
          object { label image term_id }
        }
      }
    }
  }`;

  try {
    const response = await fetch(API_URLS[network], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { termIds } }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('[fetchTripleSubjectTerms] GraphQL errors:', data.errors);
      return [];
    }

    return data.data?.triples ?? [];
  } catch (error) {
    console.error('[fetchTripleSubjectTerms] error:', error);
    return [];
  }
};
