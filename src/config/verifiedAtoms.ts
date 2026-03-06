/**
 * Configuration des atomes vérifiés par les studios
 * Les atomes dans cette liste affichent l'image avec un badge de vérification
 * Format: { atomId: studioName }
 */
export const VERIFIED_ATOMS: Record<string, string> = {
  // Spellcaster

};

/**
 * Configuration des atomes non vérifiés (créés par la communauté)
 * Les atomes dans cette liste n'affichent PAS l'image et affichent un avertissement
 * Format: { atomId: reason }
 */
export const NOT_VERIFIED_ATOMS: Record<string, string> = {
  // Ajouter les IDs des atomes non vérifiés ici
    "0x8df2369b088fbd3e1a6e238fe9337348b4adeb0defd4a63362ed8726ab03be65": "Spellcaster Studio",
};

/**
 * Image de remplacement : carré vert pour les atomes non-vérifiés
 */
export const GREEN_SQUARE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%2322c55e'/%3E%3C/svg%3E";

/**
 * Vérifier le statut de vérification d'un atome
 * Retourne: "verified" | "not-verified" | "normal" (comportement par défaut)
 */
export const getAtomVerificationStatus = (
  atomId?: string
): {
  status: "verified" | "not-verified" | "normal";
  studio?: string;
} => {
  if (!atomId) return { status: "normal" };

  const normalized = atomId.toLowerCase().trim();

  // Vérifier si l'atome est dans la liste des vérifiés
  for (const [id, studio] of Object.entries(VERIFIED_ATOMS)) {
    if (normalized === id.toLowerCase()) {
      return { status: "verified", studio };
    }
  }

  // Vérifier si l'atome est dans la liste des non-vérifiés
  for (const [id] of Object.entries(NOT_VERIFIED_ATOMS)) {
    if (normalized === id.toLowerCase()) {
      return { status: "not-verified" };
    }
  }

  // Comportement par défaut
  return { status: "normal" };
};
