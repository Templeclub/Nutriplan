import { useEffect, useState } from 'preact/hooks';

/** Router minimaliste basé sur le hash (#/route), suffisant pour une nav mobile à onglets. */
export function useRoute() {
  const [hash, setHash] = useState(location.hash || '#/bibliotheque');

  useEffect(() => {
    const onHashChange = () => setHash(location.hash || '#/bibliotheque');
    window.addEventListener('hashchange', onHashChange);
    if (!location.hash) location.hash = '#/bibliotheque';
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return hash.replace(/^#/, '') || '/bibliotheque';
}

export function naviguerVers(route) {
  location.hash = route;
}
