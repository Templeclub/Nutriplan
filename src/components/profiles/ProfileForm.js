import { useState } from 'preact/hooks';
import { html } from '../../htm-preact.js';
import { Bouton, Champ, inputClass, Titre } from '../ui/ui.js';
import { db } from '../../db/db.js';
import { calculerBesoins, NIVEAUX_ACTIVITE, LABELS_ACTIVITE } from '../../domain/nutrition.js';
import { definirProfilActif } from '../../hooks/useActiveProfile.js';

const PREFERENCES_DISPONIBLES = ['gluten', 'lactose'];
const LABELS_INTENSITE = {
  aucune_contrainte: 'Aucune contrainte',
  a_reduire: 'À réduire',
  a_eviter_strictement: 'À éviter strictement',
};

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
      preferencesAlimentaires: PREFERENCES_DISPONIBLES.map((type) => ({
        type,
        intensite: 'aucune_contrainte',
      })),
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
      preferencesAlimentaires: f.preferencesAlimentaires.map((p) =>
        p.type === type ? { ...p, intensite } : p
      ),
    }));

  const enregistrer = async (e) => {
    e.preventDefault();
    const besoinsBase = calculerBesoins(
      { poidsKg: Number(form.poidsKg), tailleCm: Number(form.tailleCm), age: Number(form.age), sexe: form.sexe },
      form.niveauActiviteDuJour
    );
    const donnees = { ...form, besoinsBase, poidsKg: Number(form.poidsKg), tailleCm: Number(form.tailleCm), age: Number(form.age) };

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
    <form onSubmit=${enregistrer}>
      <${Titre}>${profil ? 'Modifier le profil' : 'Nouveau profil'}<//>

      <${Champ} label="Nom">
        <input class=${inputClass} required value=${form.nom}
          onInput=${(e) => majChamp('nom', e.target.value)} placeholder="ex. Moi" />
      <//>

      <div class="grid grid-cols-2 gap-3">
        <${Champ} label="Poids (kg)">
          <input class=${inputClass} type="number" value=${form.poidsKg}
            onInput=${(e) => majChamp('poidsKg', e.target.value)} />
        <//>
        <${Champ} label="Taille (cm)">
          <input class=${inputClass} type="number" value=${form.tailleCm}
            onInput=${(e) => majChamp('tailleCm', e.target.value)} />
        <//>
        <${Champ} label="Âge">
          <input class=${inputClass} type="number" value=${form.age}
            onInput=${(e) => majChamp('age', e.target.value)} />
        <//>
        <${Champ} label="Sexe (calcul BMR)">
          <select class=${inputClass} value=${form.sexe} onChange=${(e) => majChamp('sexe', e.target.value)}>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
          </select>
        <//>
      </div>

      <${Champ} label="Niveau d'activité aujourd'hui">
        <select class=${inputClass} value=${form.niveauActiviteDuJour}
          onChange=${(e) => majChamp('niveauActiviteDuJour', e.target.value)}>
          ${NIVEAUX_ACTIVITE.map((n) => html`<option value=${n}>${LABELS_ACTIVITE[n]}</option>`)}
        </select>
      <//>

      <p class="text-sm font-medium text-slate-600 mb-2 mt-1">Préférences alimentaires</p>
      ${form.preferencesAlimentaires.map(
        (pref) => html`
          <${Champ} label=${pref.type === 'gluten' ? 'Gluten' : 'Lactose'}>
            <select class=${inputClass} value=${pref.intensite}
              onChange=${(e) => majPreference(pref.type, e.target.value)}>
              ${Object.entries(LABELS_INTENSITE).map(
                ([val, label]) => html`<option value=${val}>${label}</option>`
              )}
            </select>
          <//>
        `
      )}

      <div class="flex gap-2 mt-4">
        <${Bouton} type="submit">Enregistrer<//>
        ${onTermine && html`<${Bouton} variante="fantome" onClick=${() => onTermine?.()}>Annuler<//>`}
      </div>
    </form>
  `;
};
