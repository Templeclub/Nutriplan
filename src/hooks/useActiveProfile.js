import { db } from '../db/db.js';
import { useLiveQuery } from './useLiveQuery.js';

/** Profil actuellement sélectionné (flag `actif` en DB), réactif. */
export function useActiveProfile() {
  return useLiveQuery(
    async () => {
      const profils = await db.profiles.toArray();
      return profils.find((p) => p.actif) ?? profils[0];
    },
    [],
    undefined
  );
}

/** Bascule le profil actif : désactive tous les autres, active celui-ci. */
export async function definirProfilActif(profileId) {
  await db.transaction('rw', db.profiles, async () => {
    const profils = await db.profiles.toArray();
    await Promise.all(
      profils.map((p) => db.profiles.update(p.id, { actif: p.id === profileId }))
    );
  });
}

/** Recalcule et enregistre besoinsBase pour un profil à partir de ses données corporelles. */
export async function recalculerBesoinsProfil(profileId, besoinsBase) {
  await db.profiles.update(profileId, { besoinsBase });
}
