import { html } from '../../htm-preact.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile, definirProfilActif } from '../../hooks/useActiveProfile.js';
import { calculerBesoins, NIVEAUX_ACTIVITE, LABELS_ACTIVITE } from '../../domain/nutrition.js';

/** Bandeau compact : profil actif + sélecteur d'activité du jour (recalcule direct). */
export const ProfileSwitcher = () => {
  const profils = useLiveQuery(() => db.profiles.toArray(), [], []);
  const actif = useActiveProfile();

  if (!profils || profils.length === 0) return null;

  const changerActivite = async (niveau) => {
    if (!actif) return;
    const besoinsBase = calculerBesoins(
      { poidsKg: actif.poidsKg, tailleCm: actif.tailleCm, age: actif.age, sexe: actif.sexe },
      niveau
    );
    await db.profiles.update(actif.id, { niveauActiviteDuJour: niveau, besoinsBase });
  };

  return html`
    <div class="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
      ${profils.length > 1 &&
      html`<select
        class="text-sm font-medium bg-transparent border-none focus:outline-none"
        value=${actif?.id}
        onChange=${(e) => definirProfilActif(Number(e.target.value))}
      >
        ${profils.map((p) => html`<option value=${p.id}>${p.nom}</option>`)}
      </select>`}
      <span class="text-slate-300">|</span>
      <div class="flex gap-1">
        ${NIVEAUX_ACTIVITE.map(
          (n) => html`<button
            class="text-xs px-2.5 py-1 rounded-full min-h-[32px] ${actif?.niveauActiviteDuJour === n
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'}"
            onClick=${() => changerActivite(n)}
          >${LABELS_ACTIVITE[n]}</button>`
        )}
      </div>
      ${actif && html`<span class="ml-auto text-xs text-slate-500 whitespace-nowrap">${actif.besoinsBase?.kcal || 0} kcal/j</span>`}
    </div>
  `;
};
