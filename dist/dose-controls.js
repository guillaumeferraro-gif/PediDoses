import { currentDose, nextDoseValue, changeDose } from './dose-adjustments.js';

export function doseControls(record,context,prefix) {
  const dose=currentDose(record,context);
  if(!dose) return null;
  const group=document.createElement('div');
  group.className='dose-adjustment'; group.setAttribute('role','group');
  group.setAttribute('aria-label',`Régler la posologie de ${record.name}`);
  const display=document.createElement('output');
  display.className='dose-adjustment-value'; display.setAttribute('aria-live','polite');
  display.textContent=dose.value===null ? 'Âge nécessaire' : `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(dose.value)} ${dose.unit}`;
  const button=(direction,label) => {
    const el=document.createElement('button');
    el.type='button'; el.textContent=direction===1 ? '+' : '−';
    el.id=`${prefix}-dose-${record.id}-${direction===1 ? 'plus':'minus'}`;
    el.setAttribute('aria-label',`${label} la posologie de ${record.name}`);
    el.disabled=!context || !dose.step || dose.value===null;
    if(!el.disabled) el.disabled=nextDoseValue(dose,dose.value,direction)===dose.value;
    el.addEventListener('click',()=>{
      changeDose(record,context,direction);
      queueMicrotask(()=>document.getElementById(el.id)?.focus());
    });
    return el;
  };
  const note=document.createElement('small');
  note.textContent=dose.step ? `Pas : ${dose.step} ${dose.unit}` : 'Pas à définir';
  group.append(button(-1,'Diminuer'),display,button(1,'Augmenter'),note);
  return group;
}
