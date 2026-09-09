import { html } from '../../htm-preact.js';

export const Bouton = ({ children, onClick, variante = 'primaire', type = 'button', class: cls = '', disabled = false }) => {
  const base = 'min-h-[44px] px-4 py-2 rounded-xl font-semibold text-base active:scale-[0.98] transition disabled:opacity-40';
  const variantes = {
    primaire: 'bg-emerald-600 text-white',
    secondaire: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    fantome: 'bg-transparent text-slate-600',
  };
  return html`<button type=${type} disabled=${disabled} onClick=${onClick} class="${base} ${variantes[variante]} ${cls}">${children}</button>`;
};

export const Carte = ({ children, class: cls = '', onClick }) =>
  html`<div onClick=${onClick} class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${cls}">${children}</div>`;

export const Badge = ({ children, couleur = 'slate' }) => {
  const couleurs = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  return html`<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${couleurs[couleur]}">${children}</span>`;
};

export const Champ = ({ label, children }) =>
  html`<label class="block mb-3">
    <span class="block text-sm font-medium text-slate-600 mb-1">${label}</span>
    ${children}
  </label>`;

export const inputClass =
  'w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500';

export const Titre = ({ children }) => html`<h1 class="text-xl font-bold text-slate-900 mb-4">${children}</h1>`;

export const BarreProgression = ({ pourcentage, couleur = 'emerald' }) => {
  const p = Math.max(0, Math.min(100, pourcentage));
  const couleurs = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return html`<div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
    <div class="${couleurs[couleur]} h-full rounded-full transition-all" style=${`width:${p}%`}></div>
  </div>`;
};
