import { getAtomVerificationStatus, GREEN_SQUARE_PLACEHOLDER } from './verifiedAtoms';

/**
 * Filtre l'image d'un atome en fonction de son statut de vérification
 * Si l'atome est non-vérifiés, remplace l'image par un carré vert
 */
export const filterAtomImage = (atom: any): any => {
  if (!atom || !atom.term_id) return atom;
  
  const verification = getAtomVerificationStatus(atom.term_id);
  
  // Si l'atome est non-vérifiés, remplacer l'image par le carré vert
  if (verification.status === "not-verified" && atom.image) {
    return { ...atom, image: GREEN_SQUARE_PLACEHOLDER };
  }
  
  return atom;
};

/**
 * Filtre les images dans un triple (subject et object)
 */
export const filterTripleImages = (triple: any): any => {
  if (!triple) return triple;
  
  return {
    ...triple,
    subject: filterAtomImage(triple.subject),
    object: filterAtomImage(triple.object),
    predicate: filterAtomImage(triple.predicate),
  };
};

/**
 * Filtre les images dans un tableau de triples
 */
export const filterTriplesImages = (triples: any[]): any[] => {
  return triples.map(filterTripleImages);
};

/**
 * Filtre les images dans un tableau d'atomes
 */
export const filterAtomsImages = (atoms: any[]): any[] => {
  return atoms.map(filterAtomImage);
};
