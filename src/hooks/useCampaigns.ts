import { useWorkerResource } from './useWorkerResource';
import { workerKeys } from './workerQueryKeys';
import type { DevStep } from '../config/devStep';

export interface PublicCampaignAttestation {
  triple_id: string;
  type: string;
  score_type: 'experience' | 'community' | 'monetization' | 'trust' | null;
  label: string | null;
}

export interface PublicCampaign {
  id: string;
  status: 'Draft' | 'Active';
  start_date: string;
  end_date: string;
  dev_step: DevStep;
  game_version: string;
  description: string | null;
  sequence_number: number;
  attestations: PublicCampaignAttestation[];
}

interface CampaignsPublicResponse {
  success: boolean;
  data: { campaigns: PublicCampaign[] };
}

// Polls every 60s — a campaign can flip Draft -> Active while the panel
// stays open, and useQuery doesn't refetch on its own. Matches the worker's
// own 60s cache TTL on this route (campaigns-public:${atomId}) so client
// and cache never disagree for more than one cycle.
export function useCampaigns(atomId?: string) {
  const { data, isLoading, error } = useWorkerResource<CampaignsPublicResponse>(
    workerKeys.campaigns(atomId ?? ''),
    `/api/games/${atomId}/campaigns/public`,
    Boolean(atomId),
    { refetchInterval: 60_000 },
  );

  return {
    campaigns: data?.data.campaigns ?? [],
    isLoading,
    error: error as Error | null,
  };
}
