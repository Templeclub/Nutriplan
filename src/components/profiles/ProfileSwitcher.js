import { html } from '../../htm-preact.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile, definirProfilActif } from '../../hooks/useActiveProfile.js';
import { calculerBesoins, NIVEAUX_ACTIVITE, LABELS_ACTIVITE } from '../../domain/nutrition.js';

/** Bandeau permanent : profil actif + activité du jour, recalcul immédiat des besoins. */
export const ProfileSwitcher = () => {
  const profils = useLiveQuery(() => db.profiles.toArray(), [], []);
  const actif = useActiveProfile();

  if (!profils || profils.length === 0 || !actif) return null;

  const changerActivite = async (niveau) => {
    const besoinsBase = calculerBesoins(
      { poidsKg: actif.poidsKg, tailleCm: actif.tailleCm, age: actif.age, sexe: actif.sexe },
      niveau
    );
    await db.profiles.update(actif.id, { niveauActiviteDuJour: niveau, besoinsBase });
  };

  return html`
    <div class="bg-noir text-creme border-b-[3px] border-noir">
      <div class="max-w-lg mx-auto px-3 py-2 flex items-center gap-2">
        ${profils.length > 1
          ? html`<select
              class="bg-noir text-creme font-titre text-[10px] uppercase tracking-wider border-none focus:outline-none max-w-[68px] truncate"
              value=${actif.id}
              onChange=${(e) => definirProfilActif(Number(e.target.value))}
            >
              ${profils.map((p) => html`<option value=${p.id}>${p.nom}</option>`)}
            </select>`
          : html`<span class="font-titre text-[10px] uppercase tracking-wider max-w-[68px] truncate">${actif.nom}</span>`}

        <div class="flex gap-0.5 flex-1 justify-center">
          ${NIVEAUX_ACTIVITE.map(
            (n) => html`<button
              class="min-h-[34px] px-1.5 font-titre text-[9px] uppercase border-2 ${actif.niveauActiviteDuJour === n
                ? 'bg-rouge border-rouge text-creme'
                : 'bg-noir border-creme/30 text-creme/70'}"
              onClick=${() => changerActivite(n)}
              title=${LABELS_ACTIVITE[n]}
            >${LABELS_ACTIVITE[n].slice(0, 3)}</button>`
          )}
        </div>

        <span class="font-titre text-xs whitespace-nowrap shrink-0">${actif.besoinsBase?.kcal || 0}<span class="text-[9px] text-creme/60 ml-0.5">kcal</span></span>
      </div>
    </div>
  `;
};
