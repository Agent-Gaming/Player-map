/**
 * Simple cache système pour éviter les requêtes API répétées
 * et prévenir les erreurs 429 (Too Many Requests)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes par défaut

  /**
   * Génère une clé de cache à partir d'une URL et de variables
   */
  private generateKey(url: string, variables?: any): string {
    return `${url}_${JSON.stringify(variables || {})}`;
  }

  /**
   * Vérifie si une entrée du cache est encore valide
   */
  private isValid(entry: CacheEntry<any>, ttl: number): boolean {
    return Date.now() - entry.timestamp < ttl;
  }

  /**
   * Récupère des données du cache si elles existent et sont valides
   */
  get<T>(url: string, variables?: any, ttl: number = this.defaultTTL): T | null {
    const key = this.generateKey(url, variables);
    const entry = this.cache.get(key);

    if (entry && this.isValid(entry, ttl)) {
      return entry.data as T;
    }

    // Nettoyer l'entrée expirée
    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Stocke des données dans le cache
   */
  set<T>(url: string, variables: any, data: T): void {
    const key = this.generateKey(url, variables);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Décore une fonction de requête avec du cache et une déduplication
   * Si plusieurs appels identiques sont faits simultanément, ils partagent la même promesse
   */
  async withCache<T>(
    url: string,
    variables: any,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Vérifier le cache d'abord
    const cached = this.get<T>(url, variables, ttl);
    if (cached !== null) {
      return cached;
    }

    const key = this.generateKey(url, variables);

    // Vérifier si une requête identique est déjà en cours
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Lancer la nouvelle requête
    const promise = fetcher()
      .then((data) => {
        this.set(url, variables, data);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Vide les entrées expirées du cache
   */
  cleanup(ttl: number = this.defaultTTL): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Instance singleton
export const apiCache = new APICache();

// Nettoyer le cache toutes les 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 10 * 60 * 1000);
}
