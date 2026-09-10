import { html } from '../../htm-preact.js';

// Grammaire visuelle constructiviste : aplats francs, bordures noires épaisses,
// aucun arrondi, ombres dures décalées, typographie sans-serif en capitales.

export const Bouton = ({ children, onClick, variante = 'primaire', type = 'button', class: cls = '', disabled = false }) => {
  const base =
    'press min-h-[48px] px-5 py-3 border-[3px] border-noir font-titre text-sm uppercase tracking-wide disabled:opacity-30 disabled:shadow-none';
  const variantes = {
    primaire: 'bg-rouge text-creme shadow-dur',
    secondaire: 'bg-creme text-noir shadow-dur',
    sombre: 'bg-noir text-creme shadow-dur-rouge',
    jaune: 'bg-jaune text-noir shadow-dur',
    danger: 'bg-creme text-rouge border-rouge shadow-[5px_5px_0_0_#D81E27]',
    plat: 'bg-transparent border-transparent shadow-none text-noir underline underline-offset-4',
  };
  return html`<button type=${type} disabled=${disabled} onClick=${onClick} class="${base} ${variantes[variante]} ${cls}">${children}</button>`;
};

export const Bloc = ({ children, class: cls = '', onClick, accent = false }) =>
  html`<div
    onClick=${onClick}
    class="bg-white border-[3px] border-noir ${accent ? 'shadow-dur-rouge' : 'shadow-dur'} ${onClick ? 'press cursor-pointer' : ''} ${cls}"
  >${children}</div>`;

export const Badge = ({ children, couleur = 'noir' }) => {
  const couleurs = {
    noir: 'bg-noir text-creme',
    rouge: 'bg-rouge text-creme',
    jaune: 'bg-jaune text-noir',
    bleu: 'bg-bleu text-creme',
    creme: 'bg-creme text-noir border-2 border-noir',
  };
  return html`<span class="inline-flex items-center px-2 py-1 font-titre text-[10px] uppercase tracking-wider ${couleurs[couleur]}">${children}</span>`;
};

export const Champ = ({ label, children, indice }) =>
  html`<label class="block mb-4">
    <span class="block font-titre text-[11px] uppercase tracking-widest mb-1.5">${label}</span>
    ${children}
    ${indice && html`<span class="block text-xs text-gris mt-1">${indice}</span>`}
  </label>`;

export const inputClass =
  'w-full min-h-[48px] px-3 py-2 bg-white border-[3px] border-noir text-base font-corps focus:outline-none focus:border-rouge';

/** Titre d'écran : gros capital + barre rouge, la signature visuelle de l'app. */
export const Titre = ({ children, compteur }) => html`
  <div class="mb-5">
    <div class="flex items-baseline gap-3">
      <h1 class="font-titre text-3xl uppercase leading-none tracking-tight">${children}</h1>
      ${compteur != null && html`<span class="font-titre text-xl text-rouge">${compteur}</span>`}
    </div>
    <div class="h-1.5 bg-rouge mt-2 w-24"></div>
  </div>
`;

export const SousTitre = ({ children }) =>
  html`<h2 class="font-titre text-xs uppercase tracking-[0.2em] mb-2">${children}</h2>`;

/** Jauge segmentée — plus graphique qu'une barre continue, dans l'esprit du style. */
export const Jauge = ({ pourcentage, couleur = 'rouge' }) => {
  const segments = 10;
  const remplis = Math.round((Math.max(0, Math.min(150, pourcentage)) / 100) * segments);
  const couleurs = { rouge: 'bg-rouge', jaune: 'bg-jaune', noir: 'bg-noir', bleu: 'bg-bleu' };
  return html`<div class="flex gap-[3px] h-3">
    ${Array.from({ length: segments }).map(
      (_, i) => html`<div class="flex-1 border-2 border-noir ${i < remplis ? couleurs[couleur] : 'bg-white'}"></div>`
    )}
  </div>`;
};

/** Bandeau d'état (erreur, info) — bloc plein, pas de texte gris timide. */
export const Alerte = ({ children, ton = 'info' }) => {
  const tons = { info: 'bg-jaune text-noir', erreur: 'bg-rouge text-creme' };
  return html`<div class="border-[3px] border-noir px-3 py-2 text-sm font-medium mb-4 ${tons[ton]}">${children}</div>`;
};

/** Chip de filtre/sélection, tactile. */
export const Chip = ({ children, actif, onClick }) => html`
  <button
    type="button"
    onClick=${onClick}
    class="min-h-[40px] px-3 py-1.5 border-[3px] border-noir font-titre text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors ${actif ? 'bg-noir text-creme' : 'bg-white text-noir'}"
  >${children}</button>
`;
