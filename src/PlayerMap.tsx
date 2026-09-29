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
  getAccessToken,
}) => {
  // postSession firing lives in GraphComponent itself now (fires there
  // regardless of whether the host uses this wrapper or GraphComponent
  // directly) — see GraphComponent.tsx.

  return (
    <GameContextProvider games={games} activeGameId={activeGameId} onGameChange={onGameChange}>
      <GraphComponent initialProfile={initialProfile} getAccessToken={getAccessToken} />
    </GameContextProvider>
  )
}

export default PlayerMap
