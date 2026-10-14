import { workerUrl } from '../../../../lib/workerClient';

export interface ArchetypeCompletionResponse {
  completed: boolean;
  votedCount: number;
  total: number;
  // tripleIds still missing a valid on-chain vote — used to re-prompt only
  // the outstanding question(s) instead of the whole questionnaire.
  missingTripleIds: string[];
}

export interface ArchetypeBadgeCosmetic {
  id: string;
  name: string;
  image_url: string;
}

export interface PlayerArchetypeResponse {
  archetype: string;
  label: string;
  description: string;
  cosmetics: ArchetypeBadgeCosmetic[];
}

export async function fetchArchetypeCompletion(address: string): Promise<ArchetypeCompletionResponse> {
  const response = await fetch(workerUrl(`/api/player/${address}/archetype/completion`));
  if (!response.ok) {
    throw new Error(`Failed to fetch archetype completion: ${response.status}`);
  }
  return response.json();
}

export async function fetchPlayerArchetype(address: string): Promise<PlayerArchetypeResponse | null> {
  const response = await fetch(workerUrl(`/api/player/${address}/archetype`));
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch player archetype: ${response.status}`);
  }
  return response.json();
}
