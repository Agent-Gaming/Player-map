// Player-map/src/PlayerMap.tsx
import React from 'react'
import { GameContextProvider } from './contexts/GameContext'
import GraphComponent from './GraphComponent'
import type { PlayerMapProps } from './types/PlayerMapConfig'

const PlayerMap: React.FC<PlayerMapProps> = ({
  games,
  activeGameId,
  onGameChange,
  initialProfile,
}) => (
  <GameContextProvider games={games} activeGameId={activeGameId} onGameChange={onGameChange}>
    <GraphComponent initialProfile={initialProfile} />
  </GameContextProvider>
)

export default PlayerMap
