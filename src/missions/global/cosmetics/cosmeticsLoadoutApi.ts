import { workerUrl } from '../../../lib/workerClient';
import { CosmeticsError } from '../archetype/hooks/cosmeticsApi';

export type CosmeticSlot = 'banner' | 'avatar_decoration';

// Local duplicate of the worker's CosmeticCatalogItem/ResolvedCosmeticItem
// shape (same cross-repo convention as ArchetypeBadgeOption in
// ../archetype/hooks/cosmeticsApi.ts — this package can't import
// @playermap/shared). src is animated (format not guaranteed — GIF/APNG/
// WebP/PNG), src_static is always a static fallback.
export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot | 'badge';
  name: string;
  src: string;
  src_static: string;
}

export interface LoadoutResponse {
  badge: CosmeticItem | null;
  banner: CosmeticItem | null;
  avatar_decoration: CosmeticItem | null;
  default_banner_url: string;
}

export interface LibraryItem extends CosmeticItem {
  equipped: boolean;
}

// :address is URL symmetry only — the worker trusts the Privy-resolved
// identity for authenticated routes, never this path segment (same
// convention as putArchetypeBadge in cosmeticsApi.ts).
export async function fetchLoadout(address: string): Promise<LoadoutResponse> {
  const response = await fetch(workerUrl(`/api/player/${address}/cosmetics/loadout`));
  if (!response.ok) {
    throw new Error(`Failed to fetch cosmetics loadout: ${response.status}`);
  }
  return response.json();
}

export async function fetchLibrary(
  address: string,
  getAccessToken: () => Promise<string | null>
): Promise<LibraryItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new CosmeticsError(401, 'Not authenticated');
  }

  const response = await fetch(workerUrl(`/api/player/${address}/cosmetics/library`), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new CosmeticsError(response.status, body.error ?? `Failed to fetch library (${response.status})`);
  }

  const data: { items: LibraryItem[] } = await response.json();
  return data.items;
}

export async function putLoadout(
  address: string,
  slot: CosmeticSlot,
  itemId: string | null,
  getAccessToken: () => Promise<string | null>
): Promise<{ slot: CosmeticSlot; item_id: string | null }> {
  const token = await getAccessToken();
  if (!token) {
    throw new CosmeticsError(401, 'Not authenticated');
  }

  const response = await fetch(workerUrl(`/api/player/${address}/cosmetics/loadout`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slot, item_id: itemId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new CosmeticsError(response.status, body.error ?? `Update failed (${response.status})`);
  }

  return response.json();
}
