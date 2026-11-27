// Print is a projection of the current reading view, never a second calculator.
import {smurCategories} from '../engine/smur-data.js';
import {numberText,volumeText,concentrationText} from '../engine/smur-sheets.js';
import {administrationMinutes} from '../engine/administration.js';
import {getCgrReminder} from '../engine/cgr-reminder.js';
import {withCurrentDose} from './data.js';
import {doseModel} from '../usage-options.js';
import {modelForSecondDose} from '../engine/smur-preparation.js';

const known=Number.isFinite;
// Preserve the screen's rounding, omitting only redundant decimal zeroes.
const volume=v=>volumeText(v).replace(/,00$/,'').replace(/(,\d)0$/,'$1');
const ml=v=>`${volume(v)} mL`;
const amount=(v,u)=>`${u==='mL'?volume(v):v>0&&v<0.000001?'< 0,000001':numberText(v)} ${u}`;
const glucose=m=>`G${numberText((m.glucoseConcentrationMgMl??100)/10)} %`;
const join=items=>items.filter(Boolean).join(' · ');

// These standard reminders remain in the full on-screen medication sheet.
// Only this explicit set is omitted; other custom instructions are preserved.
const generalReminders=new Set([
 'flash, puis rincer avec 5 ml de nacl 0,9 %',
 'puis rincer avec 5 ml de nacl 0,9 %',
 'mettre le défibrillateur en mode « synchrone »',
 'défibrillation','consigne','à passer le plus rapidement possible'
]);
const compactRoutes={'Intergingivojugale':'IJ','Intrarectale':'IR','Nébulisation':'Nébul.'};
export function printAdministration(record,result){
 const p=record.protocol,m=record.model;
 const route=compactRoutes[p.route]||p.route||'';
 let note=(p.administrationNote??(p.route===undefined?p.administration:'')??'').trim();
 if(generalReminders.has(note.toLocaleLowerCase('fr-FR').replace(/[.!]+$/,'').replace(/\s+/g,' ')))note='';
 let minutes=administrationMinutes(record);
 if(!minutes&&m.type==='infusion'&&result.prescribedDurationHours)minutes=result.prescribedDurationHours*60;
 const duration=minutes?minutes%60===0?`${numberText(minutes/60)} h`:`${numberText(minutes)} min`:'';
 // Timing sometimes lives in a legacy free-text note (e.g. ketamine 2–3 min).
 const timing=note.match(/^sur\s+(\d+(?:[.,]\d+)?)\s*(?:à|a|[-–])\s*(\d+(?:[.,]\d+)?)\s*(min|h)$/i);
 if(timing)note=`${timing[1]}–${timing[2]} ${timing[3]}`;
 if(/^(modalités|durée|dilution et durée) à préciser$/i.test(note))note='(à préciser)';
 return [route,duration,note].filter(Boolean).join(' ')||(m.unit==='J'?'—':'À préciser');
}

function presentation(r){
 const a=r.ampoule,m=r.model;
 if(m.type==='instruction'||m.unit==='J')return '—';
 if(m.limitToOneBag)return 'Poche de volume variable';
 if(a&&known(a.amount)&&known(a.volumeMl))return `${amount(a.amount,a.unit)}/${numberText(a.volumeMl)} mL`;
 if(a&&known(a.amount))return amount(a.amount,a.unit);
 if(m.stock)return `${amount(m.stock.amount,m.stock.unit)}/${numberText(m.stock.volumeMl)} mL`;
 if(known(a?.volumeMl))return `${numberText(a.volumeMl)} mL`;
 return 'Présentation à préciser';
}

function preparation(r,v){
 const m=r.model,p=v.preparation;
 if(m.unit==='J'||m.type==='instruction')return '—';
 if(m.preparationMode==='dose-only')return 'Préparation non documentée';
 if(m.limitToOneBag)return 'Volume variable · max. 1 poche';
 if(m.type==='insulin-glucose')return known(v.insulinWithdrawalMl)?`Insuline : prélever ${ml(v.insulinWithdrawalMl)}`:'Insuline : prélèvement à préciser';
 const take=v.withdrawalMl??p?.takeMl,add=v.addMl??p?.addMl;
 if(known(take)&&known(add))return `${ml(take)} + ${ml(add)} ${m.diluent||p?.diluent||'(diluant à préciser)'}`;
 if(known(take))return `Prélever ${ml(take)} ; dilution ?`;
 if(p&&!p.mix&&known(v.stockConcentration)&&v.stockConcentration===v.concentration)return 'Sans dilution';
 if(m.unit==='mL'&&!m.stock&&!p?.mix&&/prêt|aucune manipulation|sans dilution|pur/i.test(r.protocol.dilution))return 'Prêt à l’emploi';
 if(known(v.concentration))return `${concentrationText(v.concentration,v.unit)}${m.diluent?` · ${m.diluent}`:''}`;
 if(m.volumePerDose)return r.protocol.dilution||'Préparation à préciser';
 return m.diluent?`${m.diluent} ; dilution à préciser`:'Préparation à préciser';
}

function dose(r,v){
 const m=r.model;
 const value=known(v.dose)?amount(v.dose,v.unit):known(v.hourlyAmount)?amount(v.hourlyAmount,`${v.unit}/h`):'—';
 return value+(m.durationHours&&known(v.dose)&&m.type!=='insulin-glucose'?` / ${numberText(m.durationHours)} h`:'');
}
function toAdminister(r,v){
 if(r.model.unit==='J')return '—';
 const values=[];
 if(known(v.volumeMl))values.push(ml(v.volumeMl));
 if(known(v.rateMlH))values.push(`${numberText(v.rateMlH,1)} mL/h`);
 let value=values.join(' ; ')||'À préciser';
 if(v.rateKind==='glucose')value=`${glucose(r.model).replace(' %','%')} : ${value}`;
 return value;
}
function steps(values,shared=false){return values.length===1||(shared&&values.every(x=>x===values[0]))?values[0]:values.join(' → ');}

export function buildPrintRows(records,results,context,{visibleIds=null}={}){
 const included=visibleIds?new Set(visibleIds):null;
 return smurCategories.flatMap(category=>records.filter(r=>r.category===category.id&&(!included||included.has(r.id))).map(original=>{
  const r=withCurrentDose(original,context),v=results.get(r.id),m=r.model;
  const name=r.name;
  const common={id:r.id,category:category.id,categoryLabel:category.label,name:r.name,status:v?.status??'empty'};
  if(!v||v.status!=='calculated'){
   const message=v?.status==='instruction'?v.message:v?.status==='blocked'?`NON CALCULÉ : ${v.message}`:'NON CALCULÉ : renseigner un poids ou un âge valide.';
   return {...common,cells:[name,message],spanMessage:true};
  }
  const sequence=v.sequence||[v,...(v.secondDose?[v.secondDose]:[])];
  const variants=sequence.map((value,i)=>({value,record:i===0?r:{...r,model:r.doses?doseModel(r,r.doses[i]):modelForSecondDose(m)}}));
  const cgrReminder=getCgrReminder(r,v);
  const prep=cgrReminder?'Vérifier le volume sur l’étiquette':steps(variants.map(({record,value})=>preparation(record,value)),true);
  const source=presentation(r);
  const values=cgrReminder?'Une poche maximum':steps(variants.map(({record,value})=>toAdminister(record,value)));
  let admin=printAdministration(r,v);
  const pending=known(m.pendingCeiling)&&sequence.some(x=>known(x.dose)&&x.dose>m.pendingCeiling);
  if(pending)admin+=' ; plafond à valider dépassé';
  return {...common,highlightBagLimit:cgrReminder?.enhanced===true,cells:[name,steps(variants.map(({record,value})=>dose(record,value))),source==='—'||m.limitToOneBag||m.type==='insulin-glucose'&&source==='Présentation à préciser'?prep:join([source,prep]),values,admin]};
 }));
}

export function printPatientLabel(context){
 if(!context)return 'Poids / âge non renseignés ou invalides — aucun calcul patient';
 const age=context.ageMonths===null?'âge non renseigné':context.ageMonths>=24&&context.ageMonths%12===0?`${numberText(context.ageMonths/12)} ans`:`${numberText(context.ageMonths)} mois`;
 return `${numberText(context.weightKg)} kg (${context.weightSource==='estimated'?'poids estimé':'poids saisi'}) · ${age}`;
}
