import React, { useState } from 'react';
import { useFollowPlayer, FollowState } from '../../hooks/useFollowPlayer';
import { Network } from '../../hooks/useAtomData';
import followSrc from '../../assets/img/follow/follow.svg';
import alreadyFollowSrc from '../../assets/img/follow/alreadyFollow.svg';
import unfollowSrc from '../../assets/img/follow/unfollow.svg';
import styles from './FollowButton.module.css';

interface FollowButtonProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  myAccountAtomId: string | null;
  otherAccountAtomId: string | null;
  network?: Network;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  walletConnected,
  walletAddress,
  publicClient,
  myAccountAtomId,
  otherAccountAtomId,
  network,
}) => {
  const [hovered, setHovered] = useState(false);

  const { followState, txLoading, error, follow, unfollow } = useFollowPlayer({
    walletConnected,
    walletAddress,
    publicClient,
    myAccountAtomId,
    otherAccountAtomId,
    network,
  });

  const isLoading = followState === 'loading' || txLoading;
  const isFollowing = followState === 'following';
  const canInteract = !isLoading && walletConnected && walletAddress;

  const handleClick = () => {
    if (!canInteract) return;
    if (isFollowing) unfollow();
    else follow();
  };

  const getIcon = () => {
    if (isFollowing) return hovered ? unfollowSrc : alreadyFollowSrc;
    return followSrc;
  };

  const getTitle = () => {
    if (isFollowing) return hovered ? 'Unfollow' : 'Following';
    return 'Follow';
  };

  if (followState === 'idle') return null;

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.btn}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={!canInteract}
        title={getTitle()}
      >
        {isLoading ? (
          <div className={styles.spinner} />
        ) : (
          <img src={getIcon()} alt={getTitle()} />
        )}
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};

export default FollowButton;
