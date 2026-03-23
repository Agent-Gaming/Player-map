import React from "react";
import { DefaultPlayerMapConstants } from './types/PlayerMapConfig';
import SafeImage from './components/SafeImage';
import { isIpfsUrl, ipfsToHttpUrl } from './utils/pinata';
import { PlayerAlias, AliasCreationStep } from './types/alias';

interface PlayerCreationProgressProps {
  step: number;
  isCreatingAtom: boolean;
  isCreatingTriples: boolean;
  creationSuccess: boolean;
  atomId: string | null;
  tripleCreated: boolean;
  walletAddress?: string;
  hasExistingAtom: boolean;
  formData: {
    pseudo: string;
    userId: string;
    image: string;
    guildId?: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
  isLoading: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  constants: DefaultPlayerMapConstants; // Constantes injectées
  // Alias section — only rendered when hasExistingAtom is true
  aliases?: PlayerAlias[];
  aliasesLoading?: boolean;
  aliasInput?: string;
  onAliasInputChange?: (val: string) => void;
  onCreateAlias?: () => void;
  // Callback wired in RegistrationForm to useDepositTriple — not called inside this component
  onUseExistingAlias?: (tripleId: string) => void;
  aliasStep?: AliasCreationStep;
  isCreating?: boolean;
  aliasError?: string;
  // Deposit feedback (for "Utiliser" button)
  isDepositing?: boolean;
  depositError?: string;
  // Called when the user cancels after an error — resets alias flow so they can try a different pseudo
  onResetAlias?: () => void;
}

const PreviewImage = ({ src }: { src: string }) => {
  const [httpUrl, setHttpUrl] = React.useState<string>(src);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      try {
        // Si c'est une URL IPFS, la convertir en URL HTTP
        const url = isIpfsUrl(src) ? ipfsToHttpUrl(src) : src;
        setHttpUrl(url);
      } catch (error) {
        console.error("Error converting IPFS URL:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src]);

  if (isLoading) {
    return <div>Loading image...</div>;
  }

  return (
    <SafeImage
      src={httpUrl}
      alt="Preview"
      style={{
        maxWidth: "100%",
        maxHeight: "150px",
        borderRadius: "5px",
      }}
      placeholderText="?"
      showPlaceholder={true}
    />
  );
};

const PlayerCreationProgress: React.FC<PlayerCreationProgressProps> = ({
  step,
  isCreatingAtom,
  isCreatingTriples,
  creationSuccess,
  atomId,
  tripleCreated,
  walletAddress,
  hasExistingAtom,
  formData,
  handleInputChange,
  handleSelectChange,
  handleFileUpload,
  handleSubmit,
  isLoading,
  isUploading,
  fileInputRef,
  constants,
  aliases,
  aliasesLoading,
  aliasInput,
  onAliasInputChange,
  onCreateAlias,
  onUseExistingAlias,
  aliasStep,
  isCreating,
  aliasError,
  isDepositing,
  depositError,
  onResetAlias,
}) => {
  // Utiliser les constantes passées en paramètre
  const { OFFICIAL_GUILDS } = constants;
  return (
    <>
      {/* Progression du processus */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "15px",
                backgroundColor:
                  isCreatingAtom || step > 1 ? "#FFD32A" : "#2e2e40",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: isCreatingAtom || step > 1 ? "#000" : "#fff",
              }}
            >
              {step > 1 ? "✓" : "1"}
            </div>
            <p style={{ fontSize: "0.8em", marginTop: "5px" }}>
              Atom Creation
            </p>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "15px",
                backgroundColor:
                  isCreatingTriples || step > 2 ? "#FFD32A" : "#2e2e40",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: isCreatingTriples || step > 2 ? "#000" : "#fff",
              }}
            >
              {step > 2 ? "✓" : "2"}
            </div>
            <p style={{ fontSize: "0.8em", marginTop: "5px" }}>
              Triples Creation
            </p>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "15px",
                backgroundColor: step === 3 ? "#4CAF50" : "#2e2e40",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                color: step === 3 ? "#000" : "#fff",
              }}
            >
              {step === 3 ? "✓" : "3"}
            </div>
            <p style={{ fontSize: "0.8em", marginTop: "5px" }}>Success</p>
          </div>
        </div>
        <div
          style={{
            height: "4px",
            backgroundColor: "#2e2e40",
            position: "relative",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${(step - 1) * 50}%`,
              backgroundColor: "#FFD32A",
              transition: "width 0.3s ease",
            }}
          ></div>
        </div>
      </div>

      {creationSuccess ? (
        <div style={{ textAlign: "center", color: "#4CAF50" }}>
          <h3 style={{ color: "#4CAF50", marginBottom: "10px" }}>Success!</h3>
          <p>Your player has been created successfully.</p>
          <p>Atom ID: {atomId}</p>
          <p>Triples created: {tripleCreated ? "Yes" : "No"}</p>
          <p>This window will close automatically...</p>
        </div>
      ) : !walletAddress ? (
        <div>
          <p style={{ textAlign: "center", color: "#ff4444" }}>
            Please connect your wallet first
          </p>
        </div>
      ) : hasExistingAtom ? (
        <div>
          <h3 style={{ color: "#FFD32A", marginBottom: "16px", textAlign: "center" }}>
            Tes alias
          </h3>

          {aliasesLoading ? (
            <p style={{ textAlign: "center", color: "#aaa" }}>Chargement des alias...</p>
          ) : aliases && aliases.length > 0 ? (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "0.85em", color: "#aaa", marginBottom: "8px" }}>
                Alias existants :
              </p>
              {aliases.map(alias => (
                <div
                  key={alias.tripleId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    marginBottom: "6px",
                    backgroundColor: "#1e1e30",
                    border: "1px solid #333",
                    borderRadius: "4px",
                  }}
                >
                  <span>
                    {alias.isPrimary && (
                      <span style={{ color: "#FFD32A", marginRight: "6px" }}>★</span>
                    )}
                    {alias.pseudo}
                  </span>
                  <button
                    onClick={() => onUseExistingAlias?.(alias.tripleId)}
                    disabled={isDepositing}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "#2e2e40",
                      color: "#fff",
                      border: "1px solid #555",
                      borderRadius: "4px",
                      cursor: isDepositing ? "not-allowed" : "pointer",
                      fontSize: "0.8em",
                      opacity: isDepositing ? 0.7 : 1,
                    }}
                  >
                    {isDepositing ? "..." : "Utiliser"}
                  </button>
                </div>
              ))}
              {depositError && (
                <p style={{ color: "#ff4444", fontSize: "0.85em" }}>{depositError}</p>
              )}
            </div>
          ) : (
            <p style={{ color: "#aaa", fontSize: "0.85em", marginBottom: "16px" }}>
              Tu n'as pas encore d'alias.
            </p>
          )}

          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "0.85em", color: "#aaa", marginBottom: "8px" }}>
              Créer un nouvel alias :
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={aliasInput ?? ""}
                onChange={e => onAliasInputChange?.(e.target.value)}
                placeholder="Ton pseudo"
                // Disable during active creation AND on error (prevents atom/triple mismatch on retry)
                disabled={isCreating || aliasStep === 'error'}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: "#1e1e30",
                  border: "1px solid #333",
                  color: "#fff",
                  borderRadius: "4px",
                }}
              />
              <button
                onClick={onCreateAlias}
                disabled={isCreating || !aliasInput?.trim()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#FFD32A",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isCreating || !aliasInput?.trim() ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  opacity: isCreating || !aliasInput?.trim() ? 0.7 : 1,
                }}
              >
                {isCreating ? "..." : "Créer"}
              </button>
            </div>
          </div>

          {/* Progress bar — reused with alias-specific labels */}
          {aliasStep && aliasStep !== 'idle' && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                {(["creating-pseudo-atom", "creating-triple", "success"] as AliasCreationStep[]).map(
                  (s, i) => {
                    const labels = ["Pseudo atom", "Triple", "OK"];
                    const isActive = aliasStep === s;
                    const isDone =
                      (aliasStep === "creating-triple" && i === 0) ||
                      (aliasStep === "success" && i < 2);
                    return (
                      <div key={s} style={{ textAlign: "center", flex: 1 }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "15px",
                            backgroundColor: isDone ? "#4CAF50" : isActive ? "#FFD32A" : "#2e2e40",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            color: isActive || isDone ? "#000" : "#fff",
                          }}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        <p style={{ fontSize: "0.8em", marginTop: "5px" }}>{labels[i]}</p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {aliasStep === "error" && aliasError && (
            <div style={{ marginTop: "8px" }}>
              <p style={{ color: "#ff4444", fontSize: "0.85em" }}>{aliasError}</p>
              {/* Réessayer calls onCreateAlias directly (preserves pseudoAtomId in hook state).
                  The input is disabled during isCreating so the user cannot change the pseudo
                  mid-flow. On error, the input stays enabled intentionally — if the user edits
                  it before retrying, the hook's pseudoAtomId (from the first atom) is reset
                  because createAlias() checks `pseudo.trim()` against the new value.
                  To keep atom and triple consistent: disable the input on error too, or
                  call reset() when the input changes after an error. The simplest safe approach:
                  disable the input whenever aliasStep is not 'idle'. */}
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button
                  onClick={onCreateAlias}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#2e2e40",
                    color: "#fff",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85em",
                  }}
                >
                  Réessayer
                </button>
                <button
                  onClick={onResetAlias}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#2e2e40",
                    color: "#ff8888",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85em",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {aliasStep === "success" && (
            <p style={{ color: "#4CAF50", textAlign: "center", marginTop: "8px" }}>
              Alias créé avec succès !
            </p>
          )}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "0.9em",
                textAlign: "left",
              }}
            >
              Username
            </label>
            <input
              type="text"
              name="pseudo"
              value={formData.pseudo}
              onChange={handleInputChange}
              placeholder="Enter your username"
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#1e1e30",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "0.9em",
                textAlign: "left",
              }}
            >
              Player UID (optional)
            </label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              placeholder="Enter your Player UID"
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#1e1e30",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "0.9em",
                textAlign: "left",
              }}
            >
              Guild (Optional)
            </label>
            <select
              name="guildId"
              value={formData.guildId || ""}
              onChange={handleSelectChange}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "#1e1e30",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: "4px",
              }}
            >
              <option value="">Select a guild</option>
              {OFFICIAL_GUILDS.map((guild) => (
                <option key={guild.id.toString()} value={guild.id.toString()}>
                  {guild.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "0.9em",
                textAlign: "left",
              }}
            >
              Player profile picture (optional)
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "8px 15px",
                    backgroundColor: "#2e2e40",
                    color: "#fff",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginRight: "10px",
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? "Upload in progress..." : "Choose an image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>

              <p
                style={{ fontSize: "0.8em", color: "#aaa", marginTop: "0px" }}
              >
                This image will be used as your player's profile picture.
              </p>

              {formData.image && (
                <div style={{ marginTop: "10px" }}>
                  <p
                    style={{
                      fontSize: "0.8em",
                      color: "#aaa",
                      marginBottom: "5px",
                    }}
                  >
                    Image preview:
                  </p>
                  <PreviewImage src={formData.image} />
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={isLoading || isUploading}
              style={{
                padding: "8px 20px",
                backgroundColor: "#FFD32A",
                color: "#000",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
                opacity: isLoading || isUploading ? 0.7 : 1,
              }}
            >
              {isLoading
                ? isCreatingAtom
                  ? "Creating atom..."
                  : isCreatingTriples
                  ? "Creating triples..."
                  : "Creating in progress..."
                : "VALIDATE"}
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default PlayerCreationProgress; 