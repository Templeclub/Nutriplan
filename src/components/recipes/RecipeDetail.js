import { html } from '../../htm-preact.js';
import { Bouton, Badge, Jauge, SousTitre, Alerte } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { useLiveQuery } from '../../hooks/useLiveQuery.js';
import { useActiveProfile } from '../../hooks/useActiveProfile.js';
import { pourcentageCouverture } from '../../domain/nutrition.js';
import { classifierRegime, LABELS_REGIME, COULEURS_REGIME } from '../../domain/classification.js';
import { evaluerSaisonnalite } from '../../domain/saisonnalite.js';
import { naviguerVers } from '../../router.js';

// Ces tags sont déjà rendus par le badge de régime : les répéter n'apporte rien.
const TAGS_DEJA_AFFICHES = new Set(['vegetarien', 'végétarien', 'vegan', 'poisson', 'viande']);

const LIGNES_NUTRITION = [
  ['kcal', 'Calories', ''],
  ['proteines', 'Protéines', 'g'],
  ['glucides', 'Glucides', 'g'],
  ['lipides', 'Lipides', 'g'],
];

export const RecipeDetail = ({ id }) => {
  const recette = useLiveQuery(() => db.recipes.get(Number(id)), [id]);
  const profil = useActiveProfile();

  if (recette === undefined) return html`<p class="font-titre uppercase text-sm">Chargement…</p>`;
  if (recette === null) return html`<p class="font-titre uppercase text-sm">Recette introuvable.</p>`;

  const couverture = profil ? pourcentageCouverture(recette.nutritionParPortion, profil.besoinsBase) : null;
  const regime = classifierRegime(recette);
  const saison = evaluerSaisonnalite(recette);
  const etapes = (recette.instructions || '').split('\n').map((s) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);

  const toggleFavori = () => db.recipes.update(recette.id, { favori: !recette.favori });
  const marquerConsommee = () =>
    db.recipes.update(recette.id, {
      historiqueConsommation: [...(recette.historiqueConsommation || []), new Date().toISOString()],
    });
  const supprimer = async () => {
    await db.recipes.delete(recette.id);
    naviguerVers('#/bibliotheque');
  };

  return html`
    <div class="pb-10 anim-monter">
      <button class="font-titre text-xs uppercase tracking-widest mb-4 underline underline-offset-4" onClick=${() => naviguerVers('#/bibliotheque')}>
        ← Bibliothèque
      </button>

      <!-- En-tête : titre plein cadre + bouton favori en aplat -->
      <div class="flex border-[3px] border-noir shadow-dur bg-noir text-creme mb-4">
        <h1 class="flex-1 font-titre text-2xl uppercase leading-none p-4">${recette.titre}</h1>
        <button
          class="w-14 shrink-0 border-l-[3px] border-creme text-2xl ${recette.favori ? 'bg-rouge' : 'bg-noir'}"
          onClick=${toggleFavori}
          aria-label="Favori"
        >${recette.favori ? '★' : '☆'}</button>
      </div>

      <div class="flex flex-wrap gap-1 mb-4">
        <${Badge} couleur=${COULEURS_REGIME[regime]}>${LABELS_REGIME[regime]}<//>
        ${recette.regimes?.sansGluten && html`<${Badge} couleur="creme">Sans gluten<//>`}
        ${recette.regimes?.vegan && html`<${Badge} couleur="jaune">Végan<//>`}
        ${saison.statut === 'de_saison' && html`<${Badge} couleur="jaune">De saison<//>`}
        ${saison.statut === 'partiel' && html`<${Badge} couleur="creme">Partiellement de saison<//>`}
        ${saison.statut === 'hors_saison' && html`<${Badge} couleur="rouge">Hors saison<//>`}
        ${(recette.tags || [])
          .filter((t) => !TAGS_DEJA_AFFICHES.has(t.toLowerCase()))
          .slice(0, 4)
          .map((t) => html`<${Badge} couleur="creme">${t}<//>`)}
      </div>

      <!-- Chiffres clés : grille franche, gros caractères, lisible de loin -->
      <div class="grid grid-cols-4 border-[3px] border-noir bg-white shadow-dur mb-5">
        ${[
          [recette.tempsPrep, 'Prépa'],
          [recette.tempsCuisson, 'Cuisson'],
          [recette.portions, 'Portions'],
          [recette.effortScore ?? '—', 'Effort'],
        ].map(
          ([valeur, label], i) => html`
            <div class="${i < 3 ? 'border-r-[3px] border-noir' : ''} py-3 text-center">
              <div class="font-titre text-2xl leading-none">${valeur}</div>
              <div class="text-[9px] uppercase tracking-widest text-gris mt-1">${label}</div>
            </div>
          `
        )}
      </div>

      ${saison.horsSaison.length > 0 &&
      html`<${Alerte}>Hors saison en ce moment : ${saison.horsSaison.join(', ')}.<//>`}

      <!-- Nutrition + couverture des besoins -->
      <section class="mb-5">
        <${SousTitre}>Nutrition par portion${profil ? ` · besoins de ${profil.nom}` : ''}<//>
        <div class="bg-white border-[3px] border-noir shadow-dur p-3">
          ${LIGNES_NUTRITION.map(([cle, label, unite]) => {
            const valeur = recette.nutritionParPortion?.[cle] || 0;
            const pct = couverture?.[cle];
            return html`
              <div class="mb-3 last:mb-0">
                <div class="flex justify-between items-baseline mb-1">
                  <span class="font-titre text-[11px] uppercase tracking-widest">${label}</span>
                  <span class="font-titre text-sm">
                    ${valeur}${unite}
                    ${pct != null && html`<span class="text-rouge ml-2">${pct}%</span>`}
                  </span>
                </div>
                ${pct != null && html`<${Jauge} pourcentage=${pct} couleur=${pct > 130 ? 'jaune' : 'rouge'} />`}
              </div>
            `;
          })}
          ${!profil && html`<p class="text-xs text-gris mt-2">Crée un profil pour voir la couverture de tes besoins.</p>`}
        </div>
      </section>

      <section class="mb-5">
        <${SousTitre}>Ingrédients · ${recette.portions} portions<//>
        <div class="bg-white border-[3px] border-noir shadow-dur p-3">
          <ul class="space-y-1.5">
            ${(recette.ingredients || []).map(
              (i) => html`<li class="flex gap-2.5 text-sm">
                <span class="w-2 h-2 bg-rouge mt-1.5 shrink-0"></span>
                <span><strong class="font-titre text-xs">${i.quantite ? `${i.quantite} ${i.unite}` : ''}</strong> ${i.nom}</span>
              </li>`
            )}
          </ul>
        </div>
      </section>

      <section class="mb-5">
        <${SousTitre}>Préparation<//>
        ${etapes.length === 0
          ? html`<p class="text-sm text-gris">Aucune instruction enregistrée.</p>`
          : html`<ol class="space-y-2">
              ${etapes.map(
                (etape, i) => html`
                  <li class="flex gap-3 bg-white border-[3px] border-noir p-3">
                    <span class="font-titre text-xl text-rouge leading-none shrink-0">${String(i + 1).padStart(2, '0')}</span>
                    <span class="text-sm leading-snug">${etape}</span>
                  </li>
                `
              )}
            </ol>`}
        ${recette.url &&
        html`<a href=${recette.url} target="_blank" rel="noreferrer" class="inline-block mt-3 font-titre text-[11px] uppercase tracking-widest underline underline-offset-4">
          Voir la source ↗
        </a>`}
      </section>

      <div class="flex gap-2">
        <${Bouton} class="flex-1" onClick=${marquerConsommee}>Cuisinée aujourd'hui<//>
        <${Bouton} variante="danger" onClick=${supprimer}>Suppr.<//>
      </div>

      ${recette.historiqueConsommation?.length > 0 &&
      html`<p class="text-xs text-gris mt-3">
        Cuisinée ${recette.historiqueConsommation.length} fois · dernière le
        ${new Date(recette.historiqueConsommation.at(-1)).toLocaleDateString('fr-FR')}
      </p>`}
    </div>
  `;
};
