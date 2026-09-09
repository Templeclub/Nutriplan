import { useEffect, useRef, useState } from 'preact/hooks';
import { liveQuery } from 'dexie';

/**
 * Souscrit à une requête Dexie réactive (équivalent maison de dexie-react-hooks,
 * pour éviter d'aligner les peer-deps React sur Preact via import map).
 * @template T
 * @param {() => Promise<T> | T} querier
 * @param {any[]} deps
 * @param {T} [valeurInitiale]
 * @returns {T}
 */
export function useLiveQuery(querier, deps = [], valeurInitiale = undefined) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    const subscription = liveQuery(() => querierRef.current()).subscribe({
      next: setValeur,
      error: (err) => console.error('useLiveQuery error:', err),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return valeur;
}
