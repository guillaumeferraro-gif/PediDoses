const reminderThresholdMl = 200;
const bagReminder = 'Une poche maximum. Vérifier le volume sur l’étiquette.';

export function isCgrBag(record) {
  return record.id === 'cgr' && record.model.unit === 'mL' && record.model.limitToOneBag === true;
}

export function getCgrReminder(record, result) {
  if (!isCgrBag(record) || result?.status !== 'calculated' || !Number.isFinite(result.dose)) return null;
  const enhanced = result.dose > reminderThresholdMl;
  return {
    enhanced,
    text: enhanced ? `Volume calculé supérieur à ${reminderThresholdMl} mL. ${bagReminder}` : bagReminder,
  };
}
