import { useRef, useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Carte } from '../ui/ui.js';
import { db } from '../../db/db.js';

/** Export/import JSON de toute la base locale — sauvegarde et portabilité des données. */
export const DataBackup = () => {
  const inputRef = useRef(null);
  const [message, setMessage] = useState('');

  const exporter = async () => {
    const [recipes, profiles, weeklyPlans] = await Promise.all([
      db.recipes.toArray(),
      db.profiles.toArray(),
      db.weeklyPlans.toArray(),
    ]);
    const donnees = { version: 1, exporteLe: new Date().toISOString(), recipes, profiles, weeklyPlans };
    const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutriplan-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importer = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setMessage('');
    try {
      const texte = await fichier.text();
      const donnees = JSON.parse(texte);
      if (!donnees || typeof donnees !== 'object') throw new Error('Fichier invalide');

      const confirmation = confirm(
        'Importer remplacera toutes tes données actuelles (recettes, profils, plannings) par celles du fichier. Continuer ?'
      );
      if (!confirmation) return;

      await db.transaction('rw', db.recipes, db.profiles, db.weeklyPlans, async () => {
        await Promise.all([db.recipes.clear(), db.profiles.clear(), db.weeklyPlans.clear()]);
        if (Array.isArray(donnees.recipes)) await db.recipes.bulkAdd(donnees.recipes.map(({ id, ...r }) => r));
        if (Array.isArray(donnees.profiles)) await db.profiles.bulkAdd(donnees.profiles.map(({ id, ...p }) => p));
        if (Array.isArray(donnees.weeklyPlans)) await db.weeklyPlans.bulkAdd(donnees.weeklyPlans.map(({ id, ...w }) => w));
      });
      setMessage('Import réussi.');
    } catch (err) {
      setMessage(`Échec de l'import : ${err.message}`);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return html`
    <${Carte} class="mt-2">
      <p class="font-semibold mb-1">Sauvegarde des données</p>
      <p class="text-xs text-slate-500 mb-3">Tes données restent locales à cet appareil. Exporte régulièrement une sauvegarde JSON.</p>
      <div class="flex gap-2">
        <${Bouton} variante="secondaire" onClick=${exporter}>Exporter (JSON)<//>
        <${Bouton} variante="secondaire" onClick=${() => inputRef.current?.click()}>Importer<//>
      </div>
      <input ref=${inputRef} type="file" accept="application/json" class="hidden" onChange=${importer} />
      ${message && html`<p class="text-xs mt-2 text-slate-600">${message}</p>`}
    <//>
  `;
};
