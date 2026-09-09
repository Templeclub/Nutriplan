import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Carte, Badge, Titre } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { definirProfilActif } from '../../hooks/useActiveProfile.js';
import { ProfileForm } from './ProfileForm.js';
import { DataBackup } from './DataBackup.js';

export const ProfileList = () => {
  const profils = useLiveQuery(() => db.profiles.toArray(), [], []);
  const [enEdition, setEnEdition] = useState(null); // null | 'nouveau' | profil
  const [confirmationSuppr, setConfirmationSuppr] = useState(null);

  if (enEdition) {
    return html`<${ProfileForm}
      profil=${enEdition === 'nouveau' ? null : enEdition}
      onTermine=${() => setEnEdition(null)}
    />`;
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
    <div>
      <${Titre}>Profils<//>
      <div class="flex flex-col gap-3 mb-4">
        ${(profils || []).map(
          (p) => html`
            <${Carte} key=${p.id} class=${p.actif ? 'ring-2 ring-emerald-500' : ''}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold text-slate-900">${p.nom} ${p.actif && html`<${Badge} couleur="emerald">actif<//>`}</p>
                  <p class="text-sm text-slate-500">${p.besoinsBase?.kcal || 0} kcal/j · ${p.besoinsBase?.proteines || 0}g prot.</p>
                </div>
                <div class="flex gap-2">
                  ${!p.actif && html`<${Bouton} variante="secondaire" onClick=${() => definirProfilActif(p.id)}>Activer<//>`}
                  <${Bouton} variante="fantome" onClick=${() => setEnEdition(p)}>Modifier<//>
                </div>
              </div>
              ${confirmationSuppr === p.id
                ? html`<div class="mt-3 flex gap-2">
                    <${Bouton} variante="danger" onClick=${() => supprimer(p)}>Confirmer la suppression<//>
                    <${Bouton} variante="fantome" onClick=${() => setConfirmationSuppr(null)}>Annuler<//>
                  </div>`
                : html`<button class="text-sm text-red-600 mt-2" onClick=${() => setConfirmationSuppr(p.id)}>Supprimer</button>`}
            <//>
          `
        )}
      </div>
      <${Bouton} onClick=${() => setEnEdition('nouveau')}>+ Nouveau profil<//>

      <${DataBackup} />
    </div>
  `;
};
