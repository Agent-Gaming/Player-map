import React, { useState, useEffect, useMemo } from "react";
import { Network } from "../../hooks/useAtomData";
import { useSubmitVotes } from "../../hooks/useSubmitVotes";
import { useVoteItemsManagement } from "../../hooks/useVoteItemsManagement";
import { TransactionInfo } from "./TransactionInfo";
import { VotingHeader } from "./VotingHeader";
import { ClaimList } from "./ClaimList";
import { TransactionStatusDisplay } from "./TransactionStatus";
import { ConnectWalletModal, CreatePlayerModal } from "../modals";
import { usePositions } from "../../hooks/usePositions";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { useNetworkCheck } from '../../shared/hooks/useNetworkCheck';
import { NetworkSwitchMessage } from '../../shared/components/NetworkSwitchMessage';
import styles from "./ClaimVoting.module.css";

interface ClaimVotingProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  onClose?: () => void;
  network?: Network;
  onConnectWallet?: () => void;
  onCreatePlayer?: () => void;
  wagmiConfig?: any;
  walletHooks?: any;
  constants: DefaultPlayerMapConstants; // Constantes injectées directement
}

export const ClaimVoting: React.FC<ClaimVotingProps> = ({
  walletConnected,
  walletAddress,
  publicClient,
  onClose,
  network = Network.MAINNET,
  onConnectWallet,
  onCreatePlayer,
  wagmiConfig,
  walletHooks,
  constants,
}) => {
  // État pour gérer l'affichage de la modale CreatePlayerModal
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);

  // Vérifier si le wallet est connecté
  const [isWalletReady, setIsWalletReady] = useState(false);

  // Utiliser les constantes passées en paramètre
  const { PLAYER_TRIPLE_TYPES } = constants;

  // Vérifier si l'utilisateur a le nested triple "is player of Bossfighters" via ses positions
  const { positions: activePositions, loading: positionsLoading } =
    usePositions(walletAddress || undefined, network);

  const hasPlayerAtom = useMemo(
    () => activePositions.some((p: any) =>
      p.term?.triple?.predicate_id === PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId &&
      p.term?.triple?.object_id === PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId
    ),
    [activePositions, PLAYER_TRIPLE_TYPES],
  );

  // Mettre à jour isWalletReady quand walletAddress change
  useEffect(() => {
    const hasConnectedWallet = Boolean(walletAddress && walletAddress !== "");
    setIsWalletReady(hasConnectedWallet);
  }, [walletAddress]);

  // Mettre à jour l'affichage de la modale CreatePlayerModal
  useEffect(() => {
    if (isWalletReady && !hasPlayerAtom && !positionsLoading) {
      setShowCreatePlayerModal(true);
    } else {
      setShowCreatePlayerModal(false);
    }
  }, [isWalletReady, hasPlayerAtom, positionsLoading]);

  // Use the vote items management hook
  const {
    voteItems,
    isLoading,
    totalUnits,
    numberOfTransactions,
    handleChangeUnits,
    resetAllVotes,
    refreshPositions,
    isVoteDirectionAllowed
  } = useVoteItemsManagement({
    network,
    walletAddress: walletAddress,
    onError: (message) => {
      setTransactionStatus({
        status: "error",
        message
      });
    },
  });

  // Use hook for submitting votes
  const { 
    submitVotes, 
    isSubmitting, 
    isDepositLoading, 
    transactionStatus, 
    setTransactionStatus 
  } = useSubmitVotes({
    walletConnected,
    walletAddress,
    publicClient,
    network,
    onSuccess: () => { resetAllVotes(); refreshPositions(); }
  });

  // Function to submit votes
  const handleSubmit = async () => {
    await submitVotes(voteItems);
  };

  // Fonction pour gérer le clic sur le bouton "Create Player"
  const handleCreatePlayer = () => {
    setShowCreatePlayerModal(false);
    if (onCreatePlayer) {
      onCreatePlayer();
    }
  };

  // Fonction pour fermer la modale CreatePlayerModal et tout le composant de vote
  const handleCloseCreatePlayerModal = () => {
    setShowCreatePlayerModal(false);
    
    // Fermer tout le composant de vote en appelant onClose
    if (onClose) {
      onClose();
    }
  };

  const { isCorrectNetwork, currentChainId, targetChainId, allowedChainIds } = useNetworkCheck({
    walletConnected,
    publicClient
  });

  // Si l'utilisateur n'a pas connecté son wallet, afficher juste la modale de connexion
  if (!isWalletReady) {
    return (
      <div className={styles.walletPrompt}>
        <ConnectWalletModal
          isOpen={true}
          onConnectWallet={onConnectWallet || (() => {})}
        />
      </div>
    );
  }

  // Si l'utilisateur a connecté son wallet mais n'a pas de player
  if (isWalletReady && !hasPlayerAtom && !positionsLoading) {
    return (
      <div className={styles.playerPrompt}>
        <CreatePlayerModal
          isOpen={true}
          onCreatePlayer={handleCreatePlayer}
          onClose={handleCloseCreatePlayerModal}
        />
      </div>
    );
  }

  // Affichage normal si wallet connecté et player existe
  return (
    <div className={styles.root}>
      {/* En-tête fix — hauteur automatique */}
      <div className={styles.headerSlot}>
        <VotingHeader onClose={onClose} />
      </div>
      <br />
      {/* Liste scrollable — prend tout l'espace disponible */}
      <div className={styles.scrollList}>
        <ClaimList
          isLoading={isLoading || positionsLoading}
          voteItems={voteItems}
          onChangeUnits={handleChangeUnits}
          isVoteDirectionAllowed={isVoteDirectionAllowed}
          walletAddress={walletAddress}
          network={network}
          constants={constants}
        />
      </div>

      {/* Footer fix — toujours visible en bas */}
      <div className={styles.footer}>
        <TransactionInfo
          numberOfTransactions={numberOfTransactions}
          totalUnits={totalUnits}
          onResetAll={resetAllVotes}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isDepositLoading={isDepositLoading}
        />
        <TransactionStatusDisplay transactionStatus={transactionStatus} />
        {!isCorrectNetwork && (
          <NetworkSwitchMessage
            allowedChainIds={allowedChainIds}
            currentChainId={currentChainId}
            targetChainId={targetChainId}
          />
        )}
      </div>
    </div>
  );
}; 

