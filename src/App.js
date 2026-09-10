import { html } from './htm-preact.js';
import { useRoute, naviguerVers } from './router.js';
import { ProfileSwitcher } from './components/profiles/ProfileSwitcher.js';
import { ProfileList } from './components/profiles/ProfileList.js';
import { RecipeLibrary } from './components/recipes/RecipeLibrary.js';
import { RecipeDetail } from './components/recipes/RecipeDetail.js';
import { WeeklyPlanner } from './components/planning/WeeklyPlanner.js';

const ONGLETS = [
  { route: '/bibliotheque', label: 'Recettes' },
  { route: '/planning', label: 'Semaine' },
  { route: '/profils', label: 'Profils' },
];

function ecranPourRoute(route) {
  if (route.startsWith('/recette/')) return html`<${RecipeDetail} id=${route.split('/')[2]} />`;
  if (route === '/planning') return html`<${WeeklyPlanner} />`;
  if (route === '/profils') return html`<${ProfileList} />`;
  return html`<${RecipeLibrary} />`;
}

export const App = () => {
  const route = useRoute();
  const ongletActif = route.startsWith('/recette/') ? '/bibliotheque' : route;

  return html`
    <div class="min-h-screen flex flex-col">
      <!-- Bandeau titre : bloc noir plein, logotype géométrique -->
      <header class="bg-creme border-b-[3px] border-noir">
        <div class="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div class="w-7 h-7 bg-rouge shrink-0" style="clip-path: polygon(0 0, 100% 0, 100% 100%)"></div>
          <h1 class="font-titre text-xl uppercase tracking-tight leading-none">Nutri<span class="text-rouge">plan</span></h1>
        </div>
      </header>

      <${ProfileSwitcher} />

      <main class="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        ${ecranPourRoute(route)}
      </main>

      <nav class="sticky bottom-0 bg-creme border-t-[3px] border-noir safe-bottom">
        <div class="max-w-lg mx-auto flex">
          ${ONGLETS.map(
            (o) => html`
              <button
                class="flex-1 min-h-[56px] font-titre text-xs uppercase tracking-widest border-r-[3px] border-noir last:border-r-0 transition-colors ${ongletActif === o.route
                  ? 'bg-noir text-creme'
                  : 'bg-creme text-noir'}"
                onClick=${() => naviguerVers(`#${o.route}`)}
              >${o.label}</button>
            `
          )}
        </div>
      </nav>
    </div>
  `;
};
