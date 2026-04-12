// Player-map/src/contexts/GameContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import type { GameConfig } from '../types/PlayerMapConfig'
import { fetchAtomDetails } from '../api/fetchAtomDetails'
import { Network } from '../hooks/useAtomData'
import { ipfsToHttpUrl, isIpfsUrl } from '../utils/pinata'

export interface ResolvedClaim {
  atomId: string
  label: string
  imageUrl?: string
  category?: string
}

export interface ResolvedGuild {
  atomId: string
  label: string
}

export interface ResolvedGame {
  atomId: string
  label: string
  imageUrl?: string
  claims: ResolvedClaim[]
  guilds: ResolvedGuild[]
}

export interface GameContextValue {
  games: ResolvedGame[]
  activeGame: ResolvedGame | null
  setActiveGameId: (atomId: string) => void
  isLoading: boolean
}

const GameContext = createContext<GameContextValue | null>(null)

interface GameContextProviderProps {
  games: GameConfig[]
  activeGameId?: string
  onGameChange?: (atomId: string) => void
  children: React.ReactNode
}

export const GameContextProvider: React.FC<GameContextProviderProps> = ({
  games,
  activeGameId: initialActiveGameId,
  onGameChange,
  children,
}) => {
  const [resolvedGames, setResolvedGames] = useState<ResolvedGame[]>([])
  const [activeGameId, setActiveGameIdState] = useState<string | undefined>(
    initialActiveGameId ?? games[0]?.atomId
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (games.length === 0) {
      setIsLoading(false)
      return
    }

    const resolveAll = async () => {
      setIsLoading(true)

      // Collect all unique atom IDs across all games, claims, and guilds
      const allAtomIds = Array.from(new Set([
        ...games.map(g => g.atomId),
        ...games.flatMap(g => g.claims.map(c => c.atomId)),
        ...games.flatMap(g => (g.guilds ?? []).map(guild => guild.atomId)),
      ]))

      // Resolve all in parallel
      const details = await Promise.all(
        allAtomIds.map(id => fetchAtomDetails(id, Network.MAINNET).catch(() => null))
      )

      // Build lookup: atomId → { label, imageUrl }
      const lookup = new Map<string, { label: string; imageUrl?: string }>()
      allAtomIds.forEach((id, i) => {
        const d = details[i]
        const rawImage = d?.image
        const imageUrl = rawImage
          ? (isIpfsUrl(rawImage) ? ipfsToHttpUrl(rawImage) : rawImage)
          : undefined
        lookup.set(id, {
          label: d?.label ?? `${id.slice(0, 8)}…${id.slice(-4)}`,
          imageUrl,
        })
      })

      const resolved: ResolvedGame[] = games.map(g => ({
        atomId: g.atomId,
        label: lookup.get(g.atomId)?.label ?? g.atomId.slice(0, 8),
        imageUrl: lookup.get(g.atomId)?.imageUrl,
        claims: g.claims.map(c => ({
          atomId: c.atomId,
          label: lookup.get(c.atomId)?.label ?? c.atomId.slice(0, 8),
          imageUrl: lookup.get(c.atomId)?.imageUrl,
          category: c.category,
        })),
        guilds: (g.guilds ?? []).map(guild => ({
          atomId: guild.atomId,
          label: lookup.get(guild.atomId)?.label ?? guild.atomId.slice(0, 8),
        })),
      }))

      setResolvedGames(resolved)
      setIsLoading(false)
    }

    resolveAll()
  }, [games])

  const setActiveGameId = (atomId: string) => {
    setActiveGameIdState(atomId)
    onGameChange?.(atomId)
  }

  const activeGame =
    resolvedGames.find(g => g.atomId === activeGameId) ?? resolvedGames[0] ?? null

  return (
    <GameContext.Provider value={{ games: resolvedGames, activeGame, setActiveGameId, isLoading }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameContext must be used inside GameContextProvider')
  return ctx
}
