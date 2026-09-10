import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Badge, Titre, SousTitre } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { definirProfilActif } from '../../hooks/useActiveProfile.js';
import { LABELS_ACTIVITE } from '../../domain/nutrition.js';
import { ProfileForm } from './ProfileForm.js';
import { DataBackup } from './DataBackup.js';

const LABELS_INTENSITE = { a_reduire: 'à réduire', a_eviter_strictement: 'à éviter' };

export const ProfileList = () => {
  const profils = useLiveQuery(() => db.profiles.toArray(), [], []);
  const [enEdition, setEnEdition] = useState(null);
  const [confirmationSuppr, setConfirmationSuppr] = useState(null);

  if (enEdition) {
    return html`<${ProfileForm} profil=${enEdition === 'nouveau' ? null : enEdition} onTermine=${() => setEnEdition(null)} />`;
  }

  const supprimer = async (profil) => {
    await db.profiles.delete(profil.id);
    if (profil.actif) {
      const reste = await db.profiles.toArray();
      if (reste[0]) await definirProfilActif(reste[0].id);
    }
    setConfirmationSuppr(null);
  };

  return html`
    <div class="pb-10">
      <${Titre} compteur=${profils?.length || null}>Profils<//>

      <div class="flex flex-col gap-3 mb-5">
        ${(profils || []).map(
          (p, i) => html`
            <article
              key=${p.id}
              class="bg-white border-[3px] border-noir anim-monter ${p.actif ? 'shadow-dur-rouge' : 'shadow-dur'}"
              style=${`animation-delay:${i * 50}ms`}
            >
              <div class="flex">
                <div class="w-3 shrink-0 ${p.actif ? 'bg-rouge' : 'diagonale'}"></div>
                <div class="flex-1 p-3">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-titre text-lg uppercase leading-none">${p.nom}</h3>
                    ${p.actif && html`<${Badge} couleur="rouge">Actif<//>`}
                  </div>

                  <div class="grid grid-cols-3 border-[3px] border-noir mb-3">
                    ${[
                      [p.besoinsBase?.kcal || 0, 'kcal/j'],
                      [`${p.besoinsBase?.proteines || 0}g`, 'Protéines'],
                      [LABELS_ACTIVITE[p.niveauActiviteDuJour] || '—', 'Activité'],
                    ].map(
                      ([valeur, label], idx) => html`
                        <div class="${idx < 2 ? 'border-r-[3px] border-noir' : ''} py-2 text-center">
                          <div class="font-titre text-base leading-none">${valeur}</div>
                          <div class="text-[9px] uppercase tracking-widest text-gris mt-1">${label}</div>
                        </div>
                      `
                    )}
                  </div>

                  <div class="flex flex-wrap gap-1 mb-3">
                    ${(p.preferencesAlimentaires || [])
                      .filter((pref) => pref.intensite !== 'aucune_contrainte')
                      .map((pref) => html`<${Badge} couleur="creme">${pref.type} ${LABELS_INTENSITE[pref.intensite]}<//>`)}
                  </div>

                  <div class="flex gap-2">
                    ${!p.actif && html`<${Bouton} variante="secondaire" onClick=${() => definirProfilActif(p.id)}>Activer<//>`}
                    <${Bouton} variante="plat" onClick=${() => setEnEdition(p)}>Modifier<//>
                    <${Bouton} variante="plat" class="text-rouge" onClick=${() => setConfirmationSuppr(p.id)}>Supprimer<//>
                  </div>

                  ${confirmationSuppr === p.id &&
                  html`<div class="flex gap-2 mt-3 pt-3 border-t-[3px] border-noir">
                    <${Bouton} variante="danger" onClick=${() => supprimer(p)}>Confirmer<//>
                    <${Bouton} variante="plat" onClick=${() => setConfirmationSuppr(null)}>Annuler<//>
                  </div>`}
                </div>
              </div>
            </article>
          `
        )}
      </div>

      <${Bouton} class="w-full mb-8" onClick=${() => setEnEdition('nouveau')}>+ Nouveau profil<//>

      <${SousTitre}>Données<//>
      <${DataBackup} />
    </div>
  `;
};
