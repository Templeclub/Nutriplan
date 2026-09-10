import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Champ, Chip, Titre, SousTitre, inputClass } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { calculerBesoins, NIVEAUX_ACTIVITE, LABELS_ACTIVITE } from '../../domain/nutrition.js';
import { definirProfilActif } from '../../hooks/useActiveProfile.js';

const PREFERENCES_DISPONIBLES = [
  { type: 'gluten', label: 'Gluten' },
  { type: 'lactose', label: 'Lactose' },
];

const INTENSITES = [
  { valeur: 'aucune_contrainte', label: 'Aucune' },
  { valeur: 'a_reduire', label: 'À réduire' },
  { valeur: 'a_eviter_strictement', label: 'À éviter' },
];

function valeursParDefaut(profil) {
  return (
    profil || {
      nom: '',
      actif: false,
      poidsKg: 70,
      tailleCm: 175,
      age: 30,
      sexe: 'homme',
      niveauActiviteDuJour: 'modere',
      preferencesAlimentaires: PREFERENCES_DISPONIBLES.map((p) => ({ type: p.type, intensite: 'aucune_contrainte' })),
      besoinsBase: { kcal: 0, proteines: 0, glucides: 0, lipides: 0 },
    }
  );
}

export const ProfileForm = ({ profil, onTermine }) => {
  const [form, setForm] = useState(valeursParDefaut(profil));

  const majChamp = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));
  const majPreference = (type, intensite) =>
    setForm((f) => ({
      ...f,
      preferencesAlimentaires: f.preferencesAlimentaires.map((p) => (p.type === type ? { ...p, intensite } : p)),
    }));

  // Aperçu live : l'utilisateur voit ses besoins bouger pendant qu'il saisit.
  const apercuBesoins = calculerBesoins(
    { poidsKg: Number(form.poidsKg), tailleCm: Number(form.tailleCm), age: Number(form.age), sexe: form.sexe },
    form.niveauActiviteDuJour
  );

  const enregistrer = async (e) => {
    e.preventDefault();
    const donnees = {
      ...form,
      besoinsBase: apercuBesoins,
      poidsKg: Number(form.poidsKg),
      tailleCm: Number(form.tailleCm),
      age: Number(form.age),
    };

    if (profil?.id) {
      await db.profiles.update(profil.id, donnees);
    } else {
      const nbProfils = await db.profiles.count();
      const id = await db.profiles.add({ ...donnees, actif: nbProfils === 0 });
      if (nbProfils === 0) await definirProfilActif(id);
    }
    onTermine?.();
  };

  return html`
    <form onSubmit=${enregistrer} class="pb-10">
      <div class="flex items-start justify-between gap-3">
        <${Titre}>${profil ? 'Modifier' : 'Nouveau profil'}<//>
        <button type="button" class="font-titre text-xs uppercase underline underline-offset-4 mt-1.5" onClick=${() => onTermine?.()}>Fermer</button>
      </div>

      <${Champ} label="Nom">
        <input class=${inputClass} required value=${form.nom} onInput=${(e) => majChamp('nom', e.target.value)} placeholder="Moi" />
      <//>

      <div class="grid grid-cols-3 gap-2">
        <${Champ} label="Poids (kg)">
          <input class=${inputClass} type="number" inputmode="decimal" value=${form.poidsKg} onInput=${(e) => majChamp('poidsKg', e.target.value)} />
        <//>
        <${Champ} label="Taille (cm)">
          <input class=${inputClass} type="number" inputmode="numeric" value=${form.tailleCm} onInput=${(e) => majChamp('tailleCm', e.target.value)} />
        <//>
        <${Champ} label="Âge">
          <input class=${inputClass} type="number" inputmode="numeric" value=${form.age} onInput=${(e) => majChamp('age', e.target.value)} />
        <//>
      </div>

      <${SousTitre}>Métabolisme de base<//>
      <div class="flex gap-1.5 mb-5">
        ${[['homme', 'Homme'], ['femme', 'Femme']].map(
          ([val, label]) => html`<${Chip} actif=${form.sexe === val} onClick=${() => majChamp('sexe', val)}>${label}<//>`
        )}
      </div>

      <${SousTitre}>Activité du jour<//>
      <div class="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        ${NIVEAUX_ACTIVITE.map(
          (n) => html`<${Chip} actif=${form.niveauActiviteDuJour === n} onClick=${() => majChamp('niveauActiviteDuJour', n)}>${LABELS_ACTIVITE[n]}<//>`
        )}
      </div>

      <!-- Retour immédiat sur l'impact des saisies -->
      <div class="grid grid-cols-4 border-[3px] border-noir bg-noir text-creme shadow-dur-rouge mb-6">
        ${[
          [apercuBesoins.kcal, 'kcal/j'],
          [`${apercuBesoins.proteines}g`, 'Prot.'],
          [`${apercuBesoins.glucides}g`, 'Gluc.'],
          [`${apercuBesoins.lipides}g`, 'Lip.'],
        ].map(
          ([valeur, label], i) => html`
            <div class="${i < 3 ? 'border-r-[3px] border-creme' : ''} py-3 text-center">
              <div class="font-titre text-lg leading-none">${valeur}</div>
              <div class="text-[9px] uppercase tracking-widest text-creme/60 mt-1">${label}</div>
            </div>
          `
        )}
      </div>

      <${SousTitre}>Préférences alimentaires<//>
      <div class="space-y-3 mb-6">
        ${PREFERENCES_DISPONIBLES.map((pref) => {
          const courante = form.preferencesAlimentaires.find((p) => p.type === pref.type);
          return html`
            <div>
              <span class="block font-titre text-[11px] uppercase tracking-widest mb-1.5">${pref.label}</span>
              <div class="flex gap-1.5 overflow-x-auto pb-1">
                ${INTENSITES.map(
                  (int) => html`<${Chip} actif=${courante?.intensite === int.valeur} onClick=${() => majPreference(pref.type, int.valeur)}>${int.label}<//>`
                )}
              </div>
            </div>
          `;
        })}
      </div>
      <p class="text-xs text-gris mb-6">
        « À réduire » influence le classement des recettes. « À éviter » les retire complètement.
      </p>

      <${Bouton} type="submit" class="w-full">Enregistrer<//>
    </form>
  `;
};
