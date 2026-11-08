import { shortAmpoule, shortPosology } from './simulation-data.js';
import { volumeText, numberText } from './smur-sheets.js';

const ml = value => `${volumeText(value)} mL`;
const rate = value => `${numberText(value, 1)} mL/h`;
const known = Number.isFinite;
const glucose = model => `G${numberText((model.glucoseConcentrationMgMl ?? 100) / 10)} %`;

// Display only: use the quick view's existing result, never the simulation's
// provisional ceilings and never recompute a preparation from rounded values.
export function quickMedicationDetails(record, result, context, sheet) {
  const model = record.model;
  const calculated = result.status === 'calculated';
  const prep = calculated ? result.preparation : null;
  const irrelevant = model.type === 'instruction' || model.unit === 'J';
  const doseOnly = model.preparationMode === 'dose-only';
  let withdrawal = irrelevant ? 'Sans objet' : doseOnly ? 'Non documenté' : '—';
  let diluent = irrelevant ? 'Sans objet' : doseOnly ? 'Non documenté' : '—';
  let finalVolume = irrelevant ? 'Sans objet' : doseOnly ? 'Non documenté' : '—';
  let administration = sheet.administration || 'À préciser';

  if (calculated && !irrelevant && !doseOnly) {
    if (model.type === 'insulin-glucose') {
      withdrawal = known(result.insulinWithdrawalMl) ? `Insuline : ${ml(result.insulinWithdrawalMl)}` : 'Concentration d’insuline à préciser';
      diluent = `${glucose(model)} associé`;
      finalVolume = known(result.volumeMl) ? `${glucose(model)} : ${ml(result.volumeMl)}` : 'À préciser';
    } else if (model.limitToOneBag) {
      withdrawal = 'Sans objet';
      diluent = 'Sans objet';
      finalVolume = 'Selon le contenu de la poche';
    } else if (model.unit === 'mL' && !model.stock && !prep?.mix && /prêt|aucune manipulation|sans dilution|pur/i.test(record.protocol.dilution)) {
      withdrawal = 'Sans objet';
      diluent = record.protocol.dilution;
      finalVolume = known(result.volumeMl) ? ml(result.volumeMl) : 'À préciser';
    } else {
      const pure = prep && !prep.mix && known(result.stockConcentration) && result.stockConcentration === result.concentration;
      const take = result.withdrawalMl ?? prep?.takeMl ?? (pure ? result.volumeMl : null);
      const add = result.addMl ?? prep?.addMl;
      const total = result.mixtureVolumeMl ?? prep?.finalVolumeMl ?? result.volumeMl;
      withdrawal = known(take) ? ml(take) : 'À préciser';
      if (known(add)) diluent = `${model.diluent || prep?.diluent || 'Diluant à préciser'} · ${ml(add)}`;
      else if (pure) diluent = 'Sans dilution';
      else diluent = model.diluent || (record.category === 'antibiotiques' ? 'Selon dilution IDE' : 'À préciser');
      finalVolume = known(total) ? ml(total) : 'À préciser';
      if (result.secondDose) {
        const second = result.secondDose;
        const secondTake = second.withdrawalMl ?? (pure ? second.volumeMl : null);
        if ((!prep?.mix || known(result.withdrawalMl)) && known(take) && known(secondTake)) withdrawal = `1re : ${ml(take)} ; 2e : ${ml(secondTake)}`;
        if (!known(result.mixtureVolumeMl) && !known(prep?.finalVolumeMl) && known(result.volumeMl) && known(second.volumeMl)) finalVolume = `1re : ${ml(result.volumeMl)} ; 2e : ${ml(second.volumeMl)}`;
      }
    }
    if (known(result.rateMlH)) {
      const label = result.rateKind === 'glucose' ? `Débit ${glucose(model)}` : 'Débit';
      const rates = result.secondDose
        ? `1re : ${rate(result.rateMlH)}${known(result.secondDose.rateMlH) ? ` ; 2e : ${rate(result.secondDose.rateMlH)}` : ''}`
        : rate(result.rateMlH);
      administration += ` · ${label} : ${rates}`;
    }
  }

  return [
    { key: 'presentation', label: 'Présentation', value: shortAmpoule(record) || sheet.presentation },
    { key: 'posology', label: 'Posologie', value: model.type === 'unresolved' ? record.protocol.posology || 'À préciser' : shortPosology(record, result, context) },
    { key: 'withdrawal', label: 'Prélèvement', value: withdrawal },
    { key: 'diluent', label: 'Diluant', value: diluent },
    { key: 'final-volume', label: 'Volume final', value: finalVolume },
    { key: 'administration', label: 'Administration', value: administration },
  ];
}
