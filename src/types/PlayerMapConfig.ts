// Player-map/src/types/PlayerMapConfig.ts

export interface ClaimConfig {
  atomId: string
  category?: string
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
}
