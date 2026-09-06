import { catalogRecords, categories } from './catalog-data.js';

export const smurSources = Object.freeze({
  isofundine: Object.freeze({
    title: 'BDPM · Isofundine, RCP',
    url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/66312310/extrait#tab-rcp',
  }),
  remplissage: Object.freeze({
    title: 'RCUK 2025 · Remplissage par cristalloïde isotonique équilibré',
    url: 'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/paediatric-basic-life-support-guidelines',
  }),
});

// Added reference, explicitly separate from the 63 unchanged imported rows.
export const isofundine = Object.freeze({
  id: 'isofundine', category: 'remplissage', name: 'Isofundine',
  kind: 'reference', validation: 'pending', maximumDose: null,
  sourceCells: Object.freeze(['Isofundine, solution pour perfusion', '10 mL/kg · bolus de remplissage', 'Solution prête à l’emploi · voie IV', '', '', '']),
  model: Object.freeze({ type: 'dose', coefficient: 10, unit: 'mL', stock: null, mix: null }),
  sources: Object.freeze(['isofundine', 'remplissage']),
  issues: Object.freeze([
    Object.freeze({ code: 'fluid-indication', message: 'Repère de 10 mL/kg issu des recommandations RCUK 2025 pour les cristalloïdes équilibrés en choc hypovolémique, obstructif ou distributif. Réévaluation après chaque bolus ; aucune répétition ni vitesse n’est automatisée. Ce repère n’est pas la posologie journalière du RCP ni un protocole local validé.' }),
    Object.freeze({ code: 'fluid-contraindications', message: 'RCP : contre-indiqué notamment en cas d’hyperkaliémie, d’hypervolémie, d’insuffisance cardiaque congestive sévère, d’insuffisance rénale avec oligurie/anurie, d’œdème généralisé sévère, d’hypercalcémie ou d’alcalose métabolique. Ne pas utiliser le même dispositif que pour une transfusion. Voir le RCP complet.' }),
  ]),
});

export const smurCategories = Object.freeze([
  categories[0], Object.freeze({ id: 'remplissage', label: 'Remplissage' }), ...categories.slice(1),
]);
export const smurRecords = Object.freeze([...catalogRecords, isofundine]);
