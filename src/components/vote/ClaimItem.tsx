import React, { useState, useEffect } from "react";
import { VoteItem, VoteDirection } from "../../types/vote";
import { DefaultPlayerMapConstants } from "../../types/PlayerMapConfig";
import { Network } from "../../hooks/useAtomData";

interface ClaimItemProps {
  voteItem: VoteItem;
  onChangeUnits: (id: bigint, direction: VoteDirection, units: number) => void;
  isVoteDirectionAllowed?: (
    tripleId: bigint,
    direction: VoteDirection
  ) => boolean;
  walletAddress?: string;
  network?: Network;
  constants: DefaultPlayerMapConstants; // Constantes injectées
}
export const ClaimItem: React.FC<ClaimItemProps> = ({
  voteItem,
  onChangeUnits,
  isVoteDirectionAllowed = () => true,
  walletAddress = "",
  network = Network.MAINNET,
  constants,
}) => {
  // Utiliser les constantes passées en paramètre
  const { UNIT_VALUE } = constants;
  const {
    id,
    subject,
    predicate,
    object,
    units,
    direction,
    term_position_count = 0,
    counter_term_position_count = 0,
    userHasPosition: initialUserHasPosition = false,
    userPositionDirection: initialUserPositionDirection = VoteDirection.None,
  } = voteItem;

  const [sliderValue, setSliderValue] = useState(0);
  const [showForTooltip, setShowForTooltip] = useState(false);
  const [showAgainstTooltip, setShowAgainstTooltip] = useState(false);

  // Utiliser directement les données de voteItem - déjà chargées et à jour
  // Plus besoin de useCheckSpecificTriple notation car les données sont déjà dans voteItem :
  // - term_position_count et counter_term_position_count viennent de fetchTriplesDetailsBatch
  // - userHasPosition et userPositionDirection viennent de userPositions (traitées)
  const userHasPosition = initialUserHasPosition;
  const userPositionDirection = initialUserPositionDirection;
  const finalTermPositionCount = term_position_count;
  const finalCounterTermPositionCount = counter_term_position_count;

  // Maximum units to allow
  const MAX_UNITS = 20;

  useEffect(() => {
    // Set slider value based on direction and units
    if (direction === VoteDirection.For) {
      setSliderValue(units);
    } else if (direction === VoteDirection.Against) {
      setSliderValue(-units);
    } else {
      setSliderValue(0);
    }
  }, [units, direction]);

  // Vérifier si le vote dans une direction spécifique est autorisé
  const canVoteFor = isVoteDirectionAllowed
    ? isVoteDirectionAllowed(id, VoteDirection.For)
    : !userHasPosition || userPositionDirection === VoteDirection.For;

  const canVoteAgainst = isVoteDirectionAllowed
    ? isVoteDirectionAllowed(id, VoteDirection.Against)
    : !userHasPosition || userPositionDirection === VoteDirection.Against;
  const handleIncreaseFor = () => {
    // Double vérification de l'autorisation pour voter FOR
    if (!canVoteFor) {
      return;
    }
    const newValue = Math.min(sliderValue + 1, MAX_UNITS);
    setSliderValue(newValue);
    onChangeUnits(id, VoteDirection.For, newValue);
  };

  const handleDecreaseFor = () => {
    // Double vérification de l'autorisation pour voter FOR
    if (!canVoteFor || sliderValue <= 0) {
      return;
    }
    const newValue = sliderValue - 1;
    setSliderValue(newValue);
    if (newValue === 0) {
      onChangeUnits(id, VoteDirection.None, 0);
    } else {
      onChangeUnits(id, VoteDirection.For, newValue);
    }
  };

  const handleIncreaseAgainst = () => {
    // Double vérification de l'autorisation pour voter AGAINST
    if (!canVoteAgainst) {
      return;
    }
    const newValue = Math.max(sliderValue - 1, -MAX_UNITS);
    setSliderValue(newValue);
    onChangeUnits(id, VoteDirection.Against, Math.abs(newValue));
  };

  const handleDecreaseAgainst = () => {
    // Double vérification de l'autorisation pour voter AGAINST
    if (!canVoteAgainst || sliderValue >= 0) {
      return;
    }
    const newValue = sliderValue + 1;
    setSliderValue(newValue);
    if (newValue === 0) {
      onChangeUnits(id, VoteDirection.None, 0);
    } else {
      onChangeUnits(id, VoteDirection.Against, Math.abs(newValue));
    }
  };
  const isForActive = direction === VoteDirection.For && units > 0;
  const isAgainstActive = direction === VoteDirection.Against && units > 0;

  // Calculate ETH cost for this vote
  const costInEth = (Number(UNIT_VALUE) / 10 ** 18) * units;

  // Détermine si l'utilisateur a déjà une position sur ce triple
  const hasUserPosition =
    userHasPosition && userPositionDirection !== VoteDirection.None;

  // Messages d'explication pour les boutons désactivés
  const forButtonTooltip =
    hasUserPosition && userPositionDirection === VoteDirection.Against
      ? "You cannot vote FOR this claim because you already have an AGAINST position"
      : "";

  const againstButtonTooltip =
    hasUserPosition && userPositionDirection === VoteDirection.For
      ? "You cannot vote AGAINST this claim because you already have a FOR position"
      : "";

  return (
    <div
      style={{
        padding: "20px",
        marginBottom: "20px",
        borderRadius: "8px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        position: "relative",
        borderBottom: hasUserPosition
          ? userPositionDirection === VoteDirection.For
            ? "12px solid #006FE8"
            : "12px solid #FF9500"
          : "1px solid rgb(105, 105, 105)",
        borderTop: "1px solid rgb(105, 105, 105)",
        borderLeft: "1px solid rgb(105, 105, 105)",
        borderRight: "1px solid rgb(105, 105, 105)",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Cost badge */}
      {units > 0 && (
        <div
          style={{
            position: "absolute",
            top: "5px",
            left: "5px",
            backgroundColor: "#FFD32A",
            color: "#000000",
            padding: "3px 6px",
            fontSize: "10px",
            fontWeight: "bold",
            borderRadius: "4px",
          }}
        >
          {costInEth.toFixed(2)} TRUST
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left side - For */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{ fontSize: "0.9em", color: "#E1E1E1", marginRight: "10px" }}
          >
            For ▲:
          </div>

          {userPositionDirection === VoteDirection.For ||
          userPositionDirection === VoteDirection.None ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={
                  canVoteFor && sliderValue > 0 ? handleDecreaseFor : undefined
                }
                disabled={!canVoteFor || sliderValue <= 0}
                style={{
                  width: "30px",
                  height: "30px",
                  backgroundColor:
                    canVoteFor && sliderValue > 0 ? "#1e2030" : "#606060",
                  border: "none",
                  borderRadius: "4px",
                  color: "#ffffff",
                  fontSize: "16px",
                  cursor:
                    canVoteFor && sliderValue > 0 ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: canVoteFor && sliderValue > 0 ? 1 : 0.4,
                  pointerEvents:
                    canVoteFor && sliderValue > 0 ? "auto" : "none",
                  userSelect: "none",
                }}
              >
                -
              </button>
              <span
                style={{
                  margin: "0 10px",
                  color: "#ffffff",
                  fontWeight: "bold",
                }}
              >
                {isForActive ? units : 0}
              </span>
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => forButtonTooltip && setShowForTooltip(true)}
                onMouseLeave={() =>
                  forButtonTooltip && setShowForTooltip(false)
                }
              >
                <button
                  onClick={canVoteFor ? handleIncreaseFor : undefined}
                  disabled={!canVoteFor}
                  style={{
                    width: "30px",
                    height: "30px",
                    backgroundColor: canVoteFor ? "#1976d2" : "#606060",
                    border:
                      !canVoteFor && hasUserPosition
                        ? "2px solid #F44336"
                        : "none",
                    borderRadius: "4px",
                    color: "#ffffff",
                    fontSize: "16px",
                    cursor: canVoteFor ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: canVoteFor ? 1 : 0.4,
                    pointerEvents: canVoteFor ? "auto" : "none",
                    userSelect: "none",
                  }}
                >
                  +
                </button>
                {/* Afficher tooltip quand désactivé ou au survol */}
                {((!canVoteFor && hasUserPosition) ||
                  (showForTooltip && forButtonTooltip)) && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#F44336",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      marginBottom: "5px",
                    }}
                  >
                    {forButtonTooltip}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#606060",
                borderRadius: "4px",
                color: "#ffffff",
                padding: "5px 10px",
                fontSize: "12px",
                marginLeft: "10px",
              }}
            >
              You have voted AGAINST ▼
            </div>
          )}
        </div>

        {/* Triple details */}
        <div
          style={{
            display: "flex",
            marginBottom: "20px",
            gap: "5px",
            marginTop: "20px",
          }}
        >
          <span
            style={{
              backgroundColor: "#FFB300",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "0.9em",
              color: "#000000",
              fontWeight: "bold",
            }}
          >
            {subject}
          </span>
          -
          <span
            style={{
              backgroundColor: "#ccd3d3",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "0.9em",
              color: "#000000",
              fontWeight: "bold",
            }}
          >
            {predicate}
          </span>
          -
          <span
            style={{
              backgroundColor: "#43A047",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "0.9em",
              color: "#000000",
              fontWeight: "bold",
            }}
          >
            {object}
          </span>
        </div>

        {/* Right side - Against */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{ fontSize: "0.9em", color: "#E1E1E1", marginRight: "10px" }}
          >
            Against ▼:
          </div>

          {userPositionDirection === VoteDirection.Against ||
          userPositionDirection === VoteDirection.None ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={
                  canVoteAgainst && sliderValue < 0
                    ? handleDecreaseAgainst
                    : undefined
                }
                disabled={!canVoteAgainst || sliderValue >= 0}
                style={{
                  width: "30px",
                  height: "30px",
                  backgroundColor:
                    canVoteAgainst && sliderValue < 0 ? "#1e2030" : "#606060",
                  border: "none",
                  borderRadius: "4px",
                  color: "#ffffff",
                  fontSize: "16px",
                  cursor:
                    canVoteAgainst && sliderValue < 0
                      ? "pointer"
                      : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: canVoteAgainst && sliderValue < 0 ? 1 : 0.4,
                  pointerEvents:
                    canVoteAgainst && sliderValue < 0 ? "auto" : "none",
                  userSelect: "none",
                }}
              >
                -
              </button>
              <span
                style={{
                  margin: "0 10px",
                  color: "#ffffff",
                  fontWeight: "bold",
                }}
              >
                {isAgainstActive ? units : 0}
              </span>
              <div
                style={{ position: "relative" }}
                onMouseEnter={() =>
                  againstButtonTooltip && setShowAgainstTooltip(true)
                }
                onMouseLeave={() =>
                  againstButtonTooltip && setShowAgainstTooltip(false)
                }
              >
                <button
                  onClick={canVoteAgainst ? handleIncreaseAgainst : undefined}
                  disabled={!canVoteAgainst}
                  style={{
                    width: "30px",
                    height: "30px",
                    backgroundColor: canVoteAgainst ? "#dc3545" : "#606060",
                    border:
                      !canVoteAgainst && hasUserPosition
                        ? "2px solid #4CAF50"
                        : "none",
                    borderRadius: "4px",
                    color: "#ffffff",
                    fontSize: "16px",
                    cursor: canVoteAgainst ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: canVoteAgainst ? 1 : 0.4,
                    pointerEvents: canVoteAgainst ? "auto" : "none",
                    userSelect: "none",
                  }}
                >
                  +
                </button>
                {/* Afficher tooltip quand désactivé ou au survol */}
                {((!canVoteAgainst && hasUserPosition) ||
                  (showAgainstTooltip && againstButtonTooltip)) && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#F44336",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      marginBottom: "5px",
                    }}
                  >
                    {againstButtonTooltip}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#606060",
                borderRadius: "4px",
                color: "#ffffff",
                padding: "5px 10px",
                fontSize: "12px",
                marginLeft: "10px",
              }}
            >
              You have voted FOR ▲
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-row justify-between">
        <div
          style={{
            fontSize: "0.7em",
            color: "#4CAF50",
            marginBottom: "8px",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {finalTermPositionCount} positions
        </div>

        <div
          style={{
            fontSize: "0.7em",
            color: "#F44336",
            marginBottom: "8px",
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {finalCounterTermPositionCount} positions
        </div>
      </div>
    </div>
  );
};