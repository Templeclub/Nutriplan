import { html } from './htm-preact.js';
import { useRoute, naviguerVers } from './router.js';
import { ProfileSwitcher } from './components/profiles/ProfileSwitcher.js';
import { ProfileList } from './components/profiles/ProfileList.js';
import { RecipeLibrary } from './components/recipes/RecipeLibrary.js';
import { RecipeDetail } from './components/recipes/RecipeDetail.js';
import { WeeklyPlanner } from './components/planning/WeeklyPlanner.js';

const ONGLETS = [
  { route: '/bibliotheque', label: 'Bibliothèque', icone: '📖' },
  { route: '/planning', label: 'Planning', icone: '🗓️' },
  { route: '/profils', label: 'Profils', icone: '👤' },
];

function ecranPourRoute(route) {
  if (route.startsWith('/recette/')) {
    const id = route.split('/')[2];
    return html`<${RecipeDetail} id=${id} />`;
  }
  if (route === '/planning') return html`<${WeeklyPlanner} />`;
  if (route === '/profils') return html`<${ProfileList} />`;
  return html`<${RecipeLibrary} />`;
}

export const App = () => {
  const route = useRoute();
  const ongletActif = route.startsWith('/recette/') ? '/bibliotheque' : route;

  return html`
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <header class="bg-white border-b border-slate-100 px-4 py-3">
        <h1 class="text-lg font-bold text-emerald-700">🥗 NutriPlan</h1>
      </header>
      <${ProfileSwitcher} />

      <main class="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        ${ecranPourRoute(route)}
      </main>

      <nav class="sticky bottom-0 bg-white border-t border-slate-200 flex safe-bottom">
        ${ONGLETS.map(
          (o) => html`
            <button
              class="flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-xs ${ongletActif === o.route ? 'text-emerald-700 font-semibold' : 'text-slate-500'}"
              onClick=${() => naviguerVers(`#${o.route}`)}
            >
              <span class="text-lg">${o.icone}</span>
              ${o.label}
            </button>
          `
        )}
      </nav>
    </div>
  `;
};
