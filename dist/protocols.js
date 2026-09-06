import { catalogMeta, catalogRecords } from './catalog-data.js';

export const clinicalCatalog = Object.freeze({
  status: 'imported-unvalidated',
  jurisdiction: catalogMeta.jurisdiction,
  institution: null,
  version: catalogMeta.version,
  protocols: catalogRecords,
});

/** All numbers in this separate demo protocol are synthetic software fixtures. */
export const demoProtocol = Object.freeze({
  id: 'demo-substance-a',
  kind: 'simulation',
  version: 'DEMO-1.0',
  name: 'Substance fictive A',
  indication: 'Scénario de démonstration',
  route: 'Voie fictive',
  unit: 'u. démo',
  dosePerKg: 1.7,
  maximumDose: 29,
  concentrationPerMl: 4,
  // Technical demo bounds; they are not clinical eligibility rules.
  minWeightKg: 1,
  maxWeightKg: 100,
  minAgeMonths: 1,
  maxAgeMonths: 215,
  source: 'Données fictives créées pour tester le logiciel. Aucune source clinique.',
});
