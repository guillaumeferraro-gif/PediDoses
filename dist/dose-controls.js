import {currentDose,nextDoseValue,proposeDoseChange,commitDoseChange} from './dose-adjustments.js';
const format=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(n);
export function doseControls(record,context,prefix){
  const dose=currentDose(record,context);if(!dose)return null;
  const group=document.createElement('div');group.className='dose-adjustment';group.setAttribute('role','group');group.setAttribute('aria-label',`Régler la posologie de ${record.name}`);
  if(dose.suspended){const text=document.createElement('small');text.textContent='Réglage de posologie en suspens';group.append(text);return group;}
  const display=document.createElement('output');display.className='dose-adjustment-value';display.setAttribute('aria-live','polite');display.textContent=dose.value===null?'Âge nécessaire':`${format(dose.value)} ${dose.unit}`;
  const button=(direction,label)=>{
    const el=document.createElement('button');el.type='button';el.textContent=direction===1?'+':'−';el.id=`${prefix}-dose-${record.id}-${direction===1?'plus':'minus'}`;el.setAttribute('aria-label',`${label} la posologie de ${record.name}`);
    el.disabled=!context||!dose.step||dose.value===null;
    if(!el.disabled)el.disabled=nextDoseValue(dose,dose.value,direction)===dose.value;
    el.addEventListener('click',()=>{
      try{
        const proposal=proposeDoseChange(record,context,direction);
        const confirmed=proposal.requiresConfirmation && window.confirm(`${record.name}\n\nPosologie demandée : ${format(proposal.value)} ${proposal.unit}\nSeuil d’avertissement : ${format(proposal.warning)} ${proposal.unit}\n\nConfirmer le dépassement pour appliquer cette posologie et recalculer le débit ?`);
        commitDoseChange(record,context,proposal,{confirmed});
        queueMicrotask(()=>document.getElementById(el.id)?.focus());
      }catch(error){window.alert(error.message);}
    });return el;
  };
  const note=document.createElement('small');note.textContent=`Pas : ${format(dose.step)} ${dose.unit}${dose.warning!==null?` · Avertissement au-delà de ${format(dose.warning)}`:''}`;
  group.append(button(-1,'Diminuer'),display,button(1,'Augmenter'),note);
  if(dose.warning!==null&&dose.value>dose.warning){const warning=document.createElement('strong');warning.className='dose-warning';warning.textContent='Dépassement confirmé';group.append(warning);}
  return group;
}
