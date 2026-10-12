// Player-map/src/types/PlayerMapConfig.ts

export interface ClaimConfig {
  atomId: string
  score_type?: string
}

export interface GuildConfig {
  atomId: string
}

export interface GameConfig {
  atomId: string
  claims: ClaimConfig[]
  guilds?: GuildConfig[]
}

export interface PlayerMapProps {
  games: GameConfig[]
  activeGameId?: string
  onGameChange?: (atomId: string) => void
  initialProfile?: string
  /** Host-supplied token getter (e.g. Privy's getAccessToken) — used once on
   * mount to report the session to the worker. Omit if the host has no auth
   * yet; the mount effect then silently no-ops. */
  getAccessToken?: () => Promise<string | null>
}
