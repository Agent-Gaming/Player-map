import React, { useState, useEffect } from "react";
import { Network } from "../../hooks/useAtomData";
import { useSubmitVotes } from "../../hooks/useSubmitVotes";
import { useVoteItemsManagement } from "../../hooks/useVoteItemsManagement";
import { TransactionInfo } from "./TransactionInfo";
import { VotingHeader } from "./VotingHeader";
import { ClaimList } from "./ClaimList";
import { TransactionStatusDisplay } from "./TransactionStatus";
import { ConnectWalletModal, CreatePlayerModal } from "../modals";
import { useTripleByCreator } from "../../hooks/useTripleByCreator";
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
  
  // Vérifier si l'utilisateur a un Player atom sur le jeu
  const {
    loading: tripleLoading,
    triples: playerTriples,
  } = useTripleByCreator(
    walletAddress || "", 
    PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId,
    PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId, 
    network,
    constants // Passer les constantes personnalisées !
  );
  
  // Vérifie si l'utilisateur a un player atom
  const hasPlayerAtom = playerTriples.length > 0;

  // Mettre à jour isWalletReady quand walletAddress change
  useEffect(() => {
    const hasConnectedWallet = Boolean(walletAddress && walletAddress !== "");
    setIsWalletReady(hasConnectedWallet);
  }, [walletAddress]);

  // Mettre à jour l'affichage de la modale CreatePlayerModal
  useEffect(() => {
    if (isWalletReady && !hasPlayerAtom && !tripleLoading) {
      setShowCreatePlayerModal(true);
    } else {
      setShowCreatePlayerModal(false);
    }
  }, [isWalletReady, hasPlayerAtom, tripleLoading]);

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
    constants // Passer les constantes personnalisées !
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
  if (isWalletReady && !hasPlayerAtom && !tripleLoading) {
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
          isLoading={isLoading || tripleLoading}
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

