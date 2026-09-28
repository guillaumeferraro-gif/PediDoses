export function administrationMinutes(record){
  return ['fixed-duration-mixture','insulin-glucose'].includes(record.model.type) ? record.model.durationHours*60 : record.protocol.durationMinutes??null;
}
export function administrationText(record){
  const p=record.protocol;
  if(p.route===undefined)return p.administration??'';
  const minutes=administrationMinutes(record);
  const duration=minutes ? minutes%60===0 ? ` sur ${minutes/60} h`:` sur ${minutes} min` : '';
  return `${p.route}${duration}${p.administrationNote ? `${p.route||duration?' — ':''}${p.administrationNote}`:''}`;
}
