import {adminAccess} from './admin-access.js';
import {protocolStore} from './ampoules-ui.js';
import {modelFields,doseUnits,stockUnits,routes,parseConfiguration,serializeConfiguration} from './protocol-config.js';
import {smurCategories} from './smur-data.js';
import {stockConcentration} from './ampoules.js';
import {convertDoseUnit,convertDosePeriod,convertStockUnit} from './protocol-config.js';
import {administrationMinutes} from './administration.js';

const byId=id=>document.getElementById(id);
const make=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
const fmt=n=>n==null?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:8}).format(n);
let draft=null,dirty=false,fieldSequence=0;
const normal=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function message(text,error=false){const n=byId('admin-status');n.textContent=text;n.className=error?'quick-error':'admin-status';}
function edited(){dirty=true;byId('admin-save').disabled=false;message('Modifications non enregistrées. Enregistrer pour actualiser les calculs.');}
function input(label,value,onChange,{number=false,lines=false,allowNull=true}={}){
 const wrap=make('label',label,'admin-field');const el=make(lines?'textarea':'input');el.id=`admin-field-${++fieldSequence}`;
 if(!lines){el.type='text';if(number)el.inputMode='decimal';}else el.rows=3;
 el.value=value??'';el.autocomplete='off';el.maxLength=lines?4000:2000;
 el.addEventListener('input',()=>{
  adminAccess.requireUnlocked();let value=el.value;
  if(number){value=value.trim()===''&&allowNull?null:Number(value.trim().replace(',','.'));if(value===null||Number.isFinite(value))el.removeAttribute('aria-invalid');else el.setAttribute('aria-invalid','true');}
  onChange(value);edited();
 });wrap.append(el);return wrap;
}
function select(label,value,options,onChange){
 const wrap=make('label',label,'admin-field'),el=make('select');
 for(const option of options){const o=make('option',typeof option==='string'?option:option[1]);o.value=typeof option==='string'?option:option[0];el.append(o);}el.value=value??'';
 el.addEventListener('change',()=>{adminAccess.requireUnlocked();try{onChange(el.value);edited();}catch(error){el.value=value??'';message(error.message,true);}});
 wrap.append(el);return wrap;
}
function toggle(label,checked,onChange){const wrap=make('label','','admin-toggle'),el=make('input');el.type='checkbox';el.checked=checked;el.addEventListener('change',()=>{adminAccess.requireUnlocked();onChange(el.checked);edited();});wrap.append(el,document.createTextNode(label));return wrap;}
function setNumber(obj,key,value){if(value===null)delete obj[key];else obj[key]=value;}
const number=(obj,key,label=modelFields[key]??key)=>input(label,obj[key],v=>setNumber(obj,key,v),{number:true});
function doseUnit(record,next){convertDoseUnit(record,next);renderTable();}
function stockUnit(record,next){convertStockUnit(record,next);renderTable();}
function stockSummary(record){const c=stockConcentration(record.ampoule);return c==null?'Concentration non renseignée':`${fmt(c)} ${record.ampoule.unit}/mL`;}
function preparationSummary(record){const m=record.model;if(m.weightMixes||m.weightMix)return 'Dilutions selon le poids — voir Détails';if(m.finalConcentration)return `${fmt(m.finalConcentration)} ${m.unit}/mL`;if(m.mix)return `${fmt(m.mix.takeMl)} mL + ${fmt(m.mix.addMl)} mL`;if(m.finalVolumeMl)return `Compléter à ${fmt(m.finalVolumeMl)} mL`;if(m.dilutionFactor)return `Volume prélevé × ${fmt(m.dilutionFactor)}`;return m.volumeKind==='withdrawal'?'Dilution à préciser':'Sans dilution renseignée';}
function updateConcentration(record){const n=byId(`admin-concentration-${record.id}`);if(n)n.textContent=stockSummary(record);}
function setDuration(record,value){
 if(['fixed-duration-mixture','insulin-glucose'].includes(record.model.type)){if(value===null)delete record.model.durationHours;else record.model.durationHours=value/60;}
 else record.protocol.durationMinutes=value;
 if(value!==null)record.protocol.administrationNote=record.protocol.administrationNote.replace(/^sur .*?(?:min|h)\b\s*/, '');
}
function renderTable(){
 if(!adminAccess.unlocked)return;
 const query=normal(byId('admin-search').value),category=byId('admin-category').value;
 const filtered=draft.records.filter(r=>(category==='all'||r.category===category)&&normal(r.name).includes(query));
 const body=make('tbody');
 for(const r of filtered){
  const tr=make('tr');tr.dataset.recordId=r.id;const name=make('th');name.scope='row';name.append(make('strong',r.name),make('small',smurCategories.find(c=>c.id===r.category).label));tr.append(name);
  const dose=make('td');
  if(r.model.coefficient!==undefined){
   if(r.model.tiers)dose.append(make('small','Doses par palier d’âge — Détails'));
   else dose.append(number(r.model,r.model.dailyCoefficient!==undefined?'dailyCoefficient':'coefficient',r.model.dailyCoefficient!==undefined?'Dose par kg et par jour':'Départ par kg'));
   dose.append(select('Unité',r.model.unit,doseUnits,v=>doseUnit(r,v)));
   if(r.model.type==='infusion')dose.append(select('Période',String(r.model.periodMinutes),[['1','par minute'],['60','par heure']],v=>{convertDosePeriod(r,Number(v));renderTable();}));
   if(r.model.dailyCoefficient||r.model.fixedDoseFromAgeMonths!==undefined)dose.append(make('small','Règle à paliers ou journalière : voir Détails'));
  }else if(r.model.type==='conditional-dose')dose.append(make('small','Doses par palier — Détails'),select('Unité',r.model.unit,doseUnits,v=>doseUnit(r,v)));
  else dose.append(make('small','Consigne — Détails'));
  const adjustment=make('td');if(['dose','infusion','fixed-duration-mixture'].includes(r.model.type)&&!r.model.tiers&&!r.model.dailyCoefficient){adjustment.append(select('Réglage',r.model.adjustmentStatus??'fixed',[['fixed','Sans pas'],['enabled','Avec +/−'],['suspended','En suspens']],v=>{r.model.adjustmentStatus=v;}),number(r.model,'doseStep','Pas (unité de posologie)'));}else adjustment.append(make('span','—'));
  const threshold=make('td');if(r.model.coefficient!==undefined)threshold.append(number(r.model,'warningCoefficient','Seuil dépassable après avertissement'),...(r.model.type==='infusion'?[]:[number(r.model,'maximumDose','Plafond par dose (quantité)')]));else threshold.append(make('span','—'));
  const ampoule=make('td');if(r.ampoule.status!=='sans objet'){
   for(const [key,label]of [['amount','Quantité par contenant'],['volumeMl','Volume du contenant (mL)']])ampoule.append(input(label,r.ampoule[key],v=>{r.ampoule[key]=v;updateConcentration(r);},{number:true}));
   ampoule.append(select('Unité de l’ampoule',r.ampoule.unit,['',...stockUnits],v=>stockUnit(r,v)));
   const concentration=make('small',stockSummary(r));concentration.id=`admin-concentration-${r.id}`;ampoule.append(concentration);
  }else ampoule.append(make('span','Sans ampoule'));
  const preparation=make('td');preparation.append(make('p',preparationSummary(r)),make('small',r.model.diluent??''));
  const administration=make('td');administration.append(select('Voie',r.protocol.route,routes.map(route=>[route,route||'Non applicable']),v=>{r.protocol.route=v;}),input('Durée d’injection (min)',administrationMinutes(r),v=>setDuration(r,v),{number:true}));
  const detail=make('td'),button=make('button','Détails','button button-soft');button.type='button';button.setAttribute('aria-label',`Tous les paramètres de ${r.name}`);button.addEventListener('click',()=>editRecord(r));detail.append(button);
  tr.append(dose,adjustment,threshold,ampoule,preparation,administration,detail);body.append(tr);
 }
 byId('admin-table-body').replaceWith(body);body.id='admin-table-body';byId('admin-count').textContent=`${filtered.length} / ${draft.records.length} lignes`;
}
function editMix(parent,key,label,container){
 const section=make('fieldset');section.append(make('legend',label));
 const body=make('div','','admin-fields');
 const refresh=()=>{body.replaceChildren();const mix=parent[key];if(mix)body.append(number(mix,'takeMl','Produit à prélever (mL)'),number(mix,'addMl','Diluant à ajouter (mL)'));};
 section.append(toggle('Dilution par volumes',!!parent[key],checked=>{parent[key]=checked?{takeMl:null,addMl:0}:null;refresh();}),body);refresh();container.append(section);
}
function editRecord(r){
 adminAccess.requireUnlocked();const root=byId('admin-editor-fields');root.replaceChildren();byId('admin-editor-title').textContent=r.name;
 const section=(title)=>{const s=make('fieldset');s.append(make('legend',title));const body=make('div','','admin-fields');s.append(body);root.append(s);return body;};
 const identity=section('Médicament');identity.append(input('Nom',r.name,v=>{r.name=v;}),select('Groupe',r.category,smurCategories.map(c=>[c.id,c.label]),v=>{r.category=v;}));
 const dose=section(`Posologie et limites — unité : ${r.model.unit??'sans objet'}`);
 const optional=['pendingCeiling','minimumCoefficient','maximumCoefficient','warningCoefficient'];
 if(r.model.type!=='infusion')optional.push('maximumDose');
 if(r.model.type==='dose')optional.push('finalConcentration');
 if(r.model.volumeKind==='withdrawal')optional.push('dilutionFactor');
 if(r.model.type==='infusion')optional.push('finalConcentration');
 if(r.model.preparationMinimumAgeMonths!==undefined)optional.push('youngerFinalConcentration');
 for(const key of Object.keys(modelFields))if(r.model[key]!==undefined||optional.includes(key)){
  if(key==='coefficient'&&(r.model.tiers||r.model.dailyCoefficient!==undefined))continue;
  if(key==='periodMinutes'||(key==='maximumDose'&&r.model.type==='infusion'))continue;
  if(['massPerMl'].includes(key)&&['ssh','glucose10'].includes(r.id))continue;
  dose.append(number(r.model,key));
 }
 if(r.model.volumeKind!==undefined)dose.append(select('Volume calculé',r.model.volumeKind,[['withdrawal','Prélèvement avant dilution'],['final','Volume final administré']],v=>{r.model.volumeKind=v;}));
 if(r.model.limitToOneBag!==undefined)dose.append(toggle('Limiter au volume de la poche renseigné',r.model.limitToOneBag,v=>{r.model.limitToOneBag=v;}));
 const amp=section('Ampoule et présentation');
 for(const [key,label]of [['presentation','Présentation'],['expression','Expression de la quantité'],['comment','Commentaire'],['source','Source']])amp.append(input(label,r.ampoule[key],v=>{r.ampoule[key]=v;}));
 amp.append(input('Concentration déclarée (si quantité ou volume absent)',r.ampoule.declaredConcentration,v=>{r.ampoule.declaredConcentration=v;},{number:true}),select('Statut',r.ampoule.status,['confirmé','à confirmer','sans objet'],v=>{r.ampoule.status=v;}));
 const prep=section('Préparation et dilution');prep.append(input('Diluant',r.model.diluent??'',v=>{r.model.diluent=v;}));
 if(!r.model.weightMix&&!r.model.weightMixes&&!['instruction','conditional-dose','fixed-duration-mixture'].includes(r.model.type))editMix(r.model,'mix','Dilution commune',prep);
 if(r.model.weightMix){const w=r.model.weightMix;prep.append(number(w,'thresholdKg','Seuil de poids (kg)'));editMix(w,'below','Sous le seuil',prep);editMix(w,'atOrAbove','Dès le seuil',prep);}
 if(r.model.weightMixes)for(const [i,w]of r.model.weightMixes.entries()){
  const box=make('fieldset');box.append(make('legend',`Palier de dilution ${i+1}`));if(i>0)box.append(number(w,'minWeightKg','Poids minimal inclus (kg)'));if(i<r.model.weightMixes.length-1)box.append(number(w,'maxWeightKgExclusive','Poids maximal exclu (kg)'));editMix(w,'mix','Volumes',box);prep.append(box);
 }
 for(const [key,title,bound,label,amount]of [['tiers','Paliers d’âge','maxAgeMonthsExclusive','Âge maximal exclu (mois)','coefficient'],['cases','Paliers de dose selon le poids','maxWeightKg','Poids maximal inclus (kg)','dose']])if(r.model[key]){
  const body=section(title);r.model[key].forEach((tier,i)=>{const box=make('fieldset');box.append(make('legend',`Palier ${i+1}`));if(i<r.model[key].length-1)box.append(number(tier,bound,label));box.append(number(tier,amount,`Dose ${amount==='coefficient'?'par kg':''} (${r.model.unit})`));body.append(box);});
 }
 const visibility=section('Affichage selon l’âge');visibility.append(number(r,'hideBelowAgeMonths','Masquer avant cet âge (mois)'),number(r,'hideAboveAgeMonths','Masquer au-delà de cet âge (mois)'));
 const notes=section('Textes de la fiche');
 for(const [key,label]of [['administrationNote','Précisions d’administration'],['dilution','Texte de préparation'],['posology','Consigne / texte de posologie']])notes.append(input(label,r.protocol[key],v=>{r.protocol[key]=v;},{lines:true}));
 for(const [key,label]of [['questions','Questions restantes (une par ligne)'],['particulars','Précisions (une par ligne)']])notes.append(input(label,r.protocol[key].join('\n'),v=>{r.protocol[key]=v.split('\n').filter(x=>x.trim());},{lines:true}));
 byId('admin-editor').showModal();
}
function closeEditor(){byId('admin-editor').close();renderTable();}
function lock({discard=false}={}){
 if(dirty&&!discard&&!window.confirm('Abandonner les modifications non enregistrées et verrouiller l’administration ?'))return false;
 adminAccess.lock();dirty=false;draft=null;byId('admin-editor').close();byId('admin-editor-fields').replaceChildren();byId('admin-table-body').replaceChildren();byId('admin-unlocked').hidden=true;byId('admin-login').hidden=false;byId('admin-code').value='';return true;
}
byId('admin-login').addEventListener('submit',async event=>{
 event.preventDefault();const code=byId('admin-code').value;byId('admin-code').value='';byId('admin-login-error').textContent='';
 try{if(!await adminAccess.unlock(code)){byId('admin-login-error').textContent='Code incorrect.';return;}
  draft=protocolStore.getConfiguration();dirty=false;byId('admin-save').disabled=true;byId('admin-login').hidden=true;byId('admin-unlocked').hidden=false;message(protocolStore.message);renderTable();byId('admin-search').focus();
 }catch{byId('admin-login-error').textContent='Impossible de vérifier le code dans ce navigateur.';}
});
byId('admin-lock').addEventListener('click',()=>lock());
byId('admin-editor-close').addEventListener('click',closeEditor);
byId('admin-editor').addEventListener('close',()=>{if(adminAccess.unlocked)renderTable();});
byId('admin-save').addEventListener('click',()=>{
 try{adminAccess.requireUnlocked();protocolStore.apply(draft);draft=protocolStore.getConfiguration();dirty=false;byId('admin-save').disabled=true;message('Réglages enregistrés. Les calculs ont été actualisés ; les posologies reviennent à leur dose de départ.');renderTable();}
 catch(error){message(`Enregistrement refusé : ${error.message} Les réglages actifs sont conservés.`,true);}
});
byId('admin-export').addEventListener('click',()=>{
 adminAccess.requireUnlocked();const url=URL.createObjectURL(new Blob([serializeConfiguration(protocolStore.getConfiguration())],{type:'application/json'})),a=make('a');a.href=url;a.download='PediDoses-configuration.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
byId('admin-import').addEventListener('change',async event=>{
 try{adminAccess.requireUnlocked();const file=event.target.files?.[0];if(!file)return;if(file.size>1500000)throw new Error('Fichier supérieur à 1,5 Mo.');const session=adminAccess.session;const text=await file.text();adminAccess.requireUnlocked();if(session!==adminAccess.session)return;const imported=parseConfiguration(text);draft=imported;edited();renderTable();message('Configuration importée dans le tableau. Enregistrer pour l’appliquer.');}
 catch(error){if(adminAccess.unlocked)message(`Import refusé : ${error.message}`,true);}finally{event.target.value='';}
});
byId('admin-reset').addEventListener('click',()=>{
 try{adminAccess.requireUnlocked();if(!window.confirm('Rétablir toutes les variables fournies avec cette version sur cet appareil ?'))return;protocolStore.reset();draft=protocolStore.getConfiguration();dirty=false;byId('admin-save').disabled=true;message(protocolStore.message);renderTable();}
 catch(error){message(error.message,true);}
});
byId('admin-search').addEventListener('input',renderTable);byId('admin-category').addEventListener('change',renderTable);
for(const c of smurCategories){const option=make('option',c.label);option.value=c.id;byId('admin-category').append(option);}
window.addEventListener('admin-leave',event=>{if(!lock())event.preventDefault();});
window.addEventListener('pagehide',()=>lock({discard:true}));
window.addEventListener('pageshow',event=>{if(event.persisted)lock({discard:true});});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
