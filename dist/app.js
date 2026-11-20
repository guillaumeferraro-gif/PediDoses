import {newState,draftFor,clone,equal,fmt,normal,categoryName,smurCategories,modelFields,STORAGE_KEY,SOURCE_SHA,originals,stockConcentration,linkedRecords,draftChanged,withDraft,prepMode,prepNames,changePrep,posologyText,preparationText,preview,checkCases,prepareSave,commitSave,canRestore,restoreEvent,loadState,persistState,validateState,configuration,compileRecord,validateAtelier,createMedicationDraft,compatibleStocks,assignStock} from './domain.js';
import {doseUnits,stockUnits,routes,convertDoseUnit,convertDosePeriod,convertStockUnit,validateConfiguration} from './engine/protocol-config.js';
import {administrationMinutes} from './engine/administration.js';
import {hasAgeDoses,usageEligibility,setMultipleDoses,addDose,removeDose,setAgeDoses,setContinuous,convertUsageUnit,convertUsagePeriod} from './usage-options.js';
import {setPatientRule,addBand,removeBand,changeRuleAxis,bandLabel,ruleUnit,ruleEligibility,bandRecord,preparationOf,applyPreparation} from './patient-rules.js';
import {AmpouleEditor} from './stock-ui.js';
import {ReferenceEditor} from './reference-ui.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 check:'<path d="m5 12 4 4L19 6"/>',
 history:'<path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2"/>',
 link:'<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
 file:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.file)+'</svg>';
const statusLabels={todo:'À relire',reviewing:'En relecture',reviewed:'Relue dans le test'};
let state,loadFailed=false;
try{state=loadState(localStorage);}catch(error){state=newState();loadFailed=true;$('global-error').hidden=false;$('global-error').textContent='La sauvegarde locale ne peut pas être chargée : '+error.message+' Aucun remplacement automatique. Ouvrez les sauvegardes pour importer un fichier ou réinitialiser cet atelier.';}
let selected='ketamine-analgesie',draft=draftFor(state,selected),view='editor',toastTimer;
const openSections=new Set(['posology','options']);
let continuousBackup=null,previewAdjustment=0,rangeBackup=null;
const patient={weight:'10',age:'24',ageUnit:'months',bag:''};
const invalidInputs=new Set();
const invalidValues=new Map();
const getPath=(obj,path)=>path.split('.').reduce((a,k)=>a?.[k],obj);
function setPath(obj,path,value){const keys=path.split('.'),key=keys.pop();let target=obj;for(const k of keys){if(!target[k])target[k]={};target=target[k];}if(value===undefined)delete target[key];else target[key]=value;}
function option(value,label,current){return '<option value="'+esc(value)+'"'+(String(current??'')===String(value)?' selected':'')+'>'+esc(label)+'</option>';}
function field(label,path,{kind='text',value=getPath(draft,path),options,wide=false,hint='',special='',required=false,suffix=''}={}){
 const id='f-'+path.replaceAll('.','-')+(special.startsWith('range-boundary')?'-'+special:'');
 let input;
 const attrs=' id="'+id+'" data-path="'+esc(path)+'" data-kind="'+kind+'"'+(special?' data-special="'+special+'"':'')+(required?' required':'');
 if(options)input='<select'+attrs+'>'+options.map(o=>option(Array.isArray(o)?o[0]:o,Array.isArray(o)?o[1]:o,value)).join('')+'</select>';
 else if(kind==='textarea'||kind==='lines')input='<textarea'+attrs+' rows="3">'+esc(Array.isArray(value)?value.join('\n'):value)+'</textarea>';
 else input='<input'+attrs+' type="text"'+(kind==='number'?' inputmode="decimal"':'')+' value="'+esc(value)+'" autocomplete="off">';
 if(suffix)input='<span class="field-unit">'+input+'<b>'+esc(suffix)+'</b></span>';
 return '<label class="field'+(wide?' wide':'')+'" for="'+id+'">'+esc(label)+input+(hint?'<small>'+esc(hint)+'</small>':'')+'<small class="field-error" id="'+id+'-error" hidden></small></label>';
}
const number=(key,label=modelFields[key]||key,extra={})=>field(label,'record.model.'+key,{kind:'number',...extra});
function toggle(label,path,checked=getPath(draft,path),special=''){return '<label class="toggle-row"><input type="checkbox" data-path="'+esc(path)+'" data-kind="checkbox"'+(special?' data-special="'+special+'"':'')+(checked?' checked':'')+'>'+esc(label)+'</label>';}
function section(id,num,title,subtitle,content){return '<details class="form-section" data-section="'+id+'"'+(openSections.has(id)?' open':'')+'><summary><span class="section-number">'+num+'</span><span class="summary-text"><strong>'+title+'</strong><small>'+esc(subtitle)+'</small></span><span class="chevron" aria-hidden="true"></span></summary><div class="section-content">'+content+'</div></details>';}
function sub(title,body){return '<details class="subsection"><summary>'+esc(title)+' <span aria-hidden="true">+</span></summary>'+body+'</details>';}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function persist(next){
 if(loadFailed)throw Error('La sauvegarde existante doit être récupérée ou réinitialisée avant tout enregistrement.');
 persistState(localStorage,next);state=next;window.dispatchEvent(new Event('atelier-updated'));
}
function renderStats(){
 $('review-count').textContent=state.records.filter(r=>state.reviews[r.id].status!=='reviewed').length;
 $('revision-count').textContent=state.history.length?state.history.length+' modification'+(state.history.length>1?'s':'')+' enregistrée'+(state.history.length>1?'s':''):'Référentiel de test';
 $('total-count').textContent=state.records.length;
}
function renderList(){
 const q=normal($('search').value),cat=$('category').value,pending=$('only-pending').checked;
 const filtered=state.records.filter(r=>(cat==='all'||r.category===cat)&&(!pending||state.reviews[r.id].status!=='reviewed')&&normal(r.name+' '+categoryName(r.category)+' '+r.protocol.route).includes(q));
 $('filtered-count').textContent=filtered.length;
 $('med-list').innerHTML=filtered.length?filtered.map(r=>'<button class="med-item'+(r.id===selected?' active':'')+'" data-select="'+esc(r.id)+'" aria-pressed="'+(r.id===selected)+'"><strong>'+esc(r.name)+'</strong><small>'+esc(categoryName(r.category))+' · '+esc(r.protocol.route||'Consigne')+'</small><span class="state-dot '+state.reviews[r.id].status+'" title="'+statusLabels[state.reviews[r.id].status]+'"></span></button>').join(''):'<div class="empty-list">Aucun médicament ne correspond à ces filtres.</div>';
}
function renderHeading(){
 const r=draft.record;
 $('record-heading').innerHTML='<div class="record-heading"><div><h2>'+esc(r.name||'Nouveau médicament')+'</h2><p>'+esc(categoryName(r.category))+' <span aria-hidden="true">/</span> '+esc(r.model.type==='infusion'?'Perfusion continue':r.model.type==='instruction'?'Consigne':r.doses?'Doses successives':'Fiche médicament')+'</p></div><div class="record-heading-actions"><span class="version-label">Version '+(state.revisions[selected]||1)+'</span><span class="badge '+draft.review.status+'">'+statusLabels[draft.review.status]+'</span></div></div>';
}
function renderPresentation(){
 const a=draft.stock,r=draft.record;
 if(r.model.type==='instruction'||r.model.unit==='J')return '';
 const amount=x=>x.amount!==null?fmt(x.amount)+' '+x.unit+(x.volumeMl!==null?' / '+fmt(x.volumeMl)+' mL':' par contenant'):x.declaredConcentration!==null?fmt(x.declaredConcentration)+' '+x.unit+'/mL':x.volumeMl!==null?fmt(x.volumeMl)+' mL':'';
 const choices=[[null,'Aucune ampoule affectée'],...compatibleStocks(state,r).sort((x,y)=>x[1].presentation.localeCompare(y[1].presentation,'fr')).map(([id,stock])=>[id,stock.presentation+(amount(stock)?' — '+amount(stock):'')])];
 return '<div class="amp-association">'+field('Ampoule affectée','stockId',{value:draft.stockId??'',options:choices.map(([id,label])=>[id??'',label]),special:'stock-link',wide:true,hint:r.model.unit?'L’affectation sera appliquée lors de l’enregistrement de la fiche.':'Choisissez d’abord l’unité de la dose pour voir les ampoules compatibles.'})+'<div class="amp-readonly"><div><span class="eyebrow">CARACTÉRISTIQUES DE L’AMPOULE</span><strong>'+esc(a.presentation)+'</strong>'+(amount(a)?'<span>'+esc(amount(a))+(stockConcentration(a)!==null?' · '+fmt(stockConcentration(a))+' '+esc(a.unit)+'/mL':'')+'</span>':'')+'</div><button type="button" class="text-button" data-open-amp="'+esc(draft.stockId||'')+'">Ouvrir la fiche ampoule <span aria-hidden="true">→</span></button></div></div>';
}
function optionControl(title,description,checked,special,disabled=false){
 return '<label class="usage-option'+(checked?' checked':'')+(disabled?' unavailable':'')+'"><input id="option-'+special+'" type="checkbox" data-kind="checkbox" data-path="_'+special+'" data-special="'+special+'" aria-controls="panel-'+special+'"'+(checked?' checked':'')+(disabled?' disabled':'')+'><span><strong>'+title+'</strong><small>'+description+'</small></span></label>';
}
function renderAgeRows(target,path){
 return (target.tiers||[]).map((t,i)=>'<div class="tier-box"><div class="tier-title"><span>Tranche d’âge '+(i+1)+'</span>'+(target.tiers.length>2?'<button type="button" data-action="remove-age-row" data-tier-path="'+path+'.tiers" data-index="'+i+'">Retirer</button>':'')+'</div><div class="fields">'+(i<target.tiers.length-1?field('Jusqu’à cet âge, exclu (mois)',path+'.tiers.'+i+'.maxAgeMonthsExclusive',{kind:'number',hint:i?'À partir de la limite précédente.':'À partir de la naissance.'}):'<p class="hint">À partir de '+fmt(target.tiers[i-1]?.maxAgeMonthsExclusive)+' mois.</p>')+field('Dose par kg ('+draft.record.model.unit+(draft.record.model.type==='infusion'?(draft.record.model.periodMinutes===60?'/h':'/min'):'')+')',path+'.tiers.'+i+'.coefficient',{kind:'number'})+'</div></div>').join('')+'<button type="button" class="text-button" data-action="add-age-row" data-tier-path="'+path+'.tiers">+ Ajouter une tranche d’âge</button>';
}
function renderStep(step,path,index=null){
 let html=index!==null?'<div class="dose-step"><div class="dose-step-heading"><span class="dose-index">'+(index+1)+'</span><h3>Dose '+(index+1)+'</h3>'+(draft.record.doses.length>2?'<button type="button" class="text-button" data-action="remove-dose" data-index="'+index+'">Retirer</button>':'')+'</div>':'';
 html+='<div class="fields">'+(!step.tiers?field(draft.record.model.type==='infusion'?'Dose de départ par kg':'Dose par kg',path+'.coefficient',{kind:'number',hint:draft.record.model.type==='infusion'?'Exprimée dans l’unité et la période choisies.':''}):'')+(draft.record.model.type!=='infusion'?field('Dose maximale (facultatif)',path+'.maximumDose',{kind:'number',hint:'Quantité totale par dose, dans l’unité choisie.'}):'')+'</div>';
 if(step.tiers)html+=renderAgeRows(step,path);
 if(index!==null)html+=sub('Ajouter une consigne pour cette dose',field('Consigne (facultatif)',path+'.note',{wide:true}))+'</div>';
 return html;
}
function doseFields(target,path,{first=false}={}){
 const m=draft.record.model,unit=(m.unit||'unité')+'/kg'+(m.type==='infusion'?(m.periodMinutes===60?'/h':'/min'):'');
 return '<div class="fields dose-fields">'+field('Dose / kg',path+'.coefficient',{kind:'number',required:true,suffix:unit})+(first?field('Unité de la dose','record.model.unit',{options:m.unit?doseUnits:[['','Choisir une unité'],...doseUnits],special:'dose-unit',required:true}):'')+(m.type==='infusion'?(first?field('Posologie maximale (facultatif)','record.model.maximumCoefficient',{kind:'number',suffix:unit}):''):field('Dose maximale (facultatif)',path+'.maximumDose',{kind:'number',suffix:m.unit||'unité',hint:'Vide = aucun plafond.'}))+'</div>';
}
function renderPosology(){
 const r=draft.record,m=r.model;
 if(m.type==='instruction')return field('Consigne','record.protocol.posology',{kind:'textarea',wide:true});
 if(m.cases)return '<p class="hint">Doses fixes selon le poids.</p>'+m.cases.map((c,i)=>'<div class="tier-box"><div class="fields">'+(i<m.cases.length-1?field('Jusqu’à ce poids inclus','record.model.cases.'+i+'.maxWeightKg',{kind:'number',suffix:'kg'}):'<p class="hint">Au-delà du seuil précédent.</p>')+field('Dose fixe','record.model.cases.'+i+'.dose',{kind:'number',suffix:m.unit})+'</div></div>').join('');
 if(m.dailyCoefficient!==undefined)return '<div class="fields">'+number('dailyCoefficient')+number('divisionsPerDay')+number('roundDoseUpTo')+number('maximumDose','Dose maximale',{suffix:m.unit})+'</div>';
 const first=r.doses?.[0]||m,path=r.doses?'record.doses.0':'record.model';
 return (r.doses||r.patientRules?.dose?'<p class="section-intro">'+(r.doses?'Dose 1':'Dose de départ')+(r.patientRules?.dose?' · '+esc(bandLabel(r,0)):'')+'. Les autres valeurs se règlent dans Options.</p>':'')+doseFields(first,path,{first:true})+(m.type==='insulin-glucose'?'<div class="fields">'+number('glucoseMlPerKg')+number('maximumGlucoseMl')+number('glucoseConcentrationMgMl')+'</div>':'');
}
function rangeBoundary(i,context){
 const q=draft.record.patientRules;
 return i<q.bands.length-1?field('Seuil supérieur exclu','record.patientRules.bands.'+i+'.until',{kind:'number',suffix:ruleUnit(draft.record),special:'range-boundary-'+context,required:true}):'<p class="hint">Cette dernière tranche couvre toutes les valeurs à partir du seuil précédent.</p>';
}
function rangeAxis(context){
 return field('Définir les seuils en','_axis-'+context,{value:draft.record.patientRules.axis,options:[['age','Âge (mois)'],['weight','Poids (kg)']],special:'range-axis',wide:true});
}
function bandActions(i){return i>0&&draft.record.patientRules.bands.length>2?'<button class="text-button" type="button" data-action="remove-band" data-index="'+i+'">Retirer</button>':'';}
function renderDoseBands(){
 const r=draft.record,q=r.patientRules;
 if(!q?.dose)return '';
 return '<div id="panel-ranges" class="option-panel"><h3>Doses selon l’âge ou le poids</h3>'+rangeAxis('dose')+'<p class="hint">Les seuils sont communs avec la préparation lorsqu’elle varie aussi.</p>'+q.bands.map((b,i)=>'<div class="tier-box"><div class="tier-title"><strong data-band-label="'+i+'">'+esc(bandLabel(r,i))+'</strong>'+bandActions(i)+'</div>'+rangeBoundary(i,'dose')+(r.doses||[r.model]).map((d,j)=>'<div class="band-dose"><h4>'+(r.doses?'Dose '+(j+1):'Posologie')+'</h4>'+(i===0?'<p class="hint">'+fmt(d.coefficient)+' '+esc(r.model.unit)+'/kg'+(Number.isFinite(d.maximumDose)?' · max. '+fmt(d.maximumDose)+' '+esc(r.model.unit):'')+' — réglage '+(j===0?'dans la carte Posologie.':'dans Doses successives.')+'</p>':doseFields(b.doses[j],'record.patientRules.bands.'+i+'.doses.'+j))+'</div>').join('')+'</div>').join('')+'<button type="button" class="button secondary add-dose" data-action="add-band" data-section-target="options"'+(q.bands.length>=10?' disabled':'')+'>+ Ajouter un seuil</button></div>';
}
function renderOptions(){
 const r=draft.record,m=r.model,e=usageEligibility(r),re=ruleEligibility(r),continuous=m.type==='infusion',adjustable=['dose','infusion','fixed-duration-mixture'].includes(m.type)&&!r.doses&&!hasAgeDoses(r)&&!m.cases&&!m.dailyCoefficient;
 if(m.type==='instruction')return '<p class="hint">Cette fiche est une consigne sans calcul de dose.</p>';
 let html='<p class="section-intro">Cochez une option pour faire apparaître ses réglages.</p><div class="usage-options">'+optionControl('Doses successives','Une dose différente à chaque administration.',!!r.doses,'multiple',!e.multiple)+optionControl('Doses selon l’âge ou le poids',re.dose?'Des tranches communes avec la préparation si nécessaire.':'Les conditions particulières existantes sont conservées.',!!r.patientRules?.dose||hasAgeDoses(r),'ranges',!re.dose)+optionControl('Administration continue','Posologie par minute ou par heure.',continuous||m.type==='fixed-duration-mixture','continuous',!e.continuous)+optionControl('Boutons + / −',adjustable?'Définir le pas et les limites de réglage.':'Disponible pour une dose par kg unique.',m.adjustmentStatus==='enabled','adjustment',!adjustable)+'</div>';
 if(r.doses)html+='<div id="panel-multiple" class="option-panel"><h3>Doses successives</h3><p class="hint">La dose 1 se règle dans Posologie. Les préparations suivent les mêmes seuils pour toutes les doses.</p>'+r.doses.slice(1).map((d,j)=>'<div class="dose-step"><div class="dose-step-heading"><h3>Dose '+(j+2)+'</h3>'+(r.doses.length>2?'<button type="button" class="text-button" data-action="remove-dose" data-index="'+(j+1)+'">Retirer</button>':'')+'</div>'+doseFields(d,'record.doses.'+(j+1))+field('Consigne pour cette dose (facultatif)','record.doses.'+(j+1)+'.note')+'</div>').join('')+'<button type="button" class="button secondary add-dose" data-action="add-dose"'+(r.doses.length>=10?' disabled':'')+'>+ Ajouter une dose</button></div>';
 html+=renderDoseBands();
 if(continuous)html+='<div id="panel-continuous" class="option-panel"><h3>Administration continue</h3>'+field('Période de la posologie','record.model.periodMinutes',{options:[[60,'Par heure'],[1,'Par minute']],special:'period'})+'</div>';
 if(m.adjustmentStatus==='enabled')html+='<div id="panel-adjustment" class="option-panel"><h3>Réglage par boutons + / −</h3><div class="fields">'+number('doseStep','Pas de réglage',{required:true,suffix:m.unit+'/kg'+(continuous?(m.periodMinutes===60?'/h':'/min'):'')})+number('minimumCoefficient','Posologie minimale',{suffix:m.unit+'/kg'})+(continuous?'':number('maximumCoefficient','Limite non dépassable',{suffix:m.unit+'/kg'}))+number('warningCoefficient','Seuil d’avertissement',{suffix:m.unit+'/kg'})+'</div><p class="hint">Les boutons apparaissent dans l’aperçu. Ils ne changent pas la posologie enregistrée.</p></div>';
 // Keep older trials with independent age and weight axes fully editable.
 if(re.legacy){html+='<div class="option-panel"><h3>Tranches d’âge existantes</h3><p class="hint">Cette fiche conserve ses tranches existantes. Elles restent modifiables ci-dessous.</p>'+(r.doses||[m]).map((d,i)=>d.tiers?renderAgeRows(d,r.doses?'record.doses.'+i:'record.model'):'').join('')+'</div>';}
 return html;
}
function renderConditions(){
 const r=draft.record,m=r.model;
 const special=['fixedDoseFromWeightKg','fixedDoseFromAgeMonths','fixedDose','fixedHourlyFromAgeMonths','fixedHourlyAmount','fixedDurationHours','preparedCoefficient','preparedMaximumDose','pendingCeiling','minimumAgeMonthsExclusive',...(m.adjustmentStatus!=='enabled'?['minimumCoefficient','warningCoefficient',...(m.type==='infusion'?[]:['maximumCoefficient'])]:[])].filter(k=>m[k]!==undefined);
 return '<div class="fields">'+field('Conditions et précautions — une par ligne','record.protocol.particulars',{kind:'lines',wide:true})+number('minimumAgeMonths','Âge minimal autorisé',{suffix:'mois'})+special.map(k=>number(k)).join('')+'</div>'+sub('Conditions d’affichage de la fiche','<div class="fields">'+field('Masquer avant cet âge','record.hideBelowAgeMonths',{kind:'number',suffix:'mois'})+field('Masquer après cet âge','record.hideAboveAgeMonths',{kind:'number',suffix:'mois'})+'</div>')+(m.unit==='mL'?toggle('Limiter au volume de la poche renseigné','record.model.limitToOneBag',m.limitToOneBag):'');
}
function mixFields(path,title){
 const mix=getPath(draft,path);
 return '<div class="tier-box"><div class="tier-title">'+esc(title)+'</div>'+toggle('Sans dilution pour ce palier',path,!mix,'pure-mix')+(mix?'<div class="fields">'+field('Produit à prélever (mL)',path+'.takeMl',{kind:'number'})+field('Diluant à ajouter (mL)',path+'.addMl',{kind:'number'})+'</div>':'')+'</div>';
}
function preparationFields(m,path='record.model'){
 const r={...draft.record,model:m,ampoule:draft.stock},mode=prepMode(r);
 const number=(key,label=modelFields[key]||key,extra={})=>field(label,path+'.'+key,{kind:'number',...extra});
 if(mode==='na')return '<p class="hint">Aucune préparation médicamenteuse pour cette fiche.</p>';
 let html='';
 if(['fixed-mixture','associated','factor'].includes(mode))html+='<div class="shared-note">Schéma particulier conservé : '+esc(prepNames[mode])+'.</div>';
 else{
  let choices=['none','volumes','concentration'];if(mode==='weight')choices.push('weight');
  if(m.type==='dose')choices.push('fixed-volume','concentration-range','unknown');
  html+=field('Méthode de préparation',path+'.__mode',{value:mode,options:choices.map(k=>[k,prepNames[k]]),special:'prep-mode',wide:true});
 }
 html+='<div class="fields" style="margin-top:14px">';
 if(!['none','unknown'].includes(mode))html+=field('Diluant',path+'.diluent',{wide:true});
 if(mode==='volumes')html+=field('Produit à prélever (mL)',path+'.mix.takeMl',{kind:'number'})+field('Diluant à ajouter (mL)',path+'.mix.addMl',{kind:'number'});
 if(['fixed-volume','fixed-mixture'].includes(mode))html+=number('finalVolumeMl','Volume final total (mL)',{wide:true,hint:'Le diluant complète le prélèvement jusqu’à ce volume.'});
 if(mode==='concentration')html+=number('finalConcentration','Concentration cible ('+m.unit+'/mL)',{wide:true});
 if(mode==='concentration-range')html+=['minimumFinalConcentration','targetFinalConcentration','diluentRoundingMl','fineDiluentRoundingMl'].map(k=>number(k)).join('');
 if(mode==='factor')html+=(m.dilutionFactor!==undefined?number('dilutionFactor'):number('volumePerDose'));
 html+='</div>';
 if(mode==='weight'){
  if(m.weightMix)html+='<div class="fields" style="margin-top:12px">'+field('Seuil de poids (kg)','record.model.weightMix.thresholdKg',{kind:'number',wide:true})+'</div>'+mixFields('record.model.weightMix.below','En dessous du seuil')+mixFields('record.model.weightMix.atOrAbove','À partir du seuil');
  else html+=m.weightMixes.map((p,i)=>'<div class="tier-box"><div class="tier-title">Palier '+(i+1)+'</div><div class="fields">'+(i>0?field('Poids minimal inclus (kg)','record.model.weightMixes.'+i+'.minWeightKg',{kind:'number'}):'')+(i<m.weightMixes.length-1?field('Poids maximal exclu (kg)','record.model.weightMixes.'+i+'.maxWeightKgExclusive',{kind:'number'}):'')+'</div>'+mixFields('record.model.weightMixes.'+i+'.mix','Préparation')+'</div>').join('');
 }
 if(m.preparationMinimumAgeMonths!==undefined)html+='<div class="fields">'+number('preparationMinimumAgeMonths')+number('youngerFinalConcentration')+'</div>';
 if(mode==='unknown')html+='<p class="hint">La dose reste disponible. Aucun volume de préparation ou d’administration ne sera inventé.</p>';
 if(mode==='none')html+='<p class="hint">La concentration de la présentation est utilisée directement.</p>';
 return html;
}
function renderPreparation(){
 const r=draft.record,q=r.patientRules,e=ruleEligibility(r);
 if(prepMode({...r,ampoule:draft.stock})==='na')return '<p class="hint">Aucune préparation médicamenteuse pour cette fiche.</p>';
 let html=optionControl('Préparation selon l’âge ou le poids','Utiliser plusieurs préparations, avec les mêmes seuils que la posologie si elle varie.',!!q?.preparation,'prep-ranges',!e.preparation);
 if(!q?.preparation)return html+preparationFields(r.model);
 html+='<div id="panel-prep-ranges" class="option-panel">'+rangeAxis('prep')+'<p class="hint">'+(q.dose?'Les modifications de seuils s’appliquent aussi à la posologie.':'La dose reste identique dans toutes les tranches.')+'</p>'+q.bands.map((b,i)=>'<div class="tier-box"><div class="tier-title"><strong data-band-label="'+i+'">'+esc(bandLabel(r,i))+'</strong>'+bandActions(i)+'</div>'+rangeBoundary(i,'prep')+preparationFields(bandRecord(r,i).model,i?'record.patientRules.bands.'+i+'.preparation':'record.model')+'</div>').join('')+'<button type="button" class="button secondary add-dose" data-action="add-band" data-section-target="preparation"'+(q.bands.length>=10?' disabled':'')+'>+ Ajouter un seuil</button></div>';
 return html;
}
function renderAdministration(){
 const r=draft.record;
 return '<div class="fields">'+field('Voie d’administration','record.protocol.route',{options:routes.map(v=>[v,v||'Sans objet'])})+field('Durée (minutes)','_duration',{kind:'number',value:administrationMinutes(r),special:'duration',hint:'Vide = aucune durée prescrite.'})+field('Précisions d’administration','record.protocol.administrationNote',{wide:true,kind:'textarea',hint:'Uniquement les précisions non décrites par les champs précédents.'})+'</div>';
}
function renderReview(){
 const original=originals.get(selected);
 return '<div class="fields">'+field('État de la relecture','review.status',{options:[['todo','À relire'],['reviewing','En relecture'],['reviewed','Relue dans le test']]})+field('Nom du relecteur','review.reviewer')+field('Points à relire — un par ligne','review.questions',{kind:'lines',wide:true})+field('Sources et références','review.sources',{kind:'textarea',wide:true})+field('Notes de relecture','review.notes',{kind:'textarea',wide:true})+'</div><div class="review-checks">'+toggle('Posologie, unités et limites relues','review.checks.posology')+toggle('Présentation et préparation relues','review.checks.preparation')+toggle('Voie et administration relues','review.checks.administration')+'</div><p class="hint">Un changement des paramètres remet les fiches concernées « À relire ». Le statut est un essai du circuit de relecture.</p>'+(original?'<p class="hint">Origine : copie PediDose, commit '+SOURCE_SHA.slice(0,8)+'. '+esc((original.issues||[]).map(x=>x.message).join(' '))+'</p>':'<p class="hint">Fiche créée dans cet atelier. Renseignez vos sources avant la relecture.</p>');
}
function renderEditor(){
 $('editor-form').innerHTML=
 '<div class="record-identity fields">'+field('Médicament / usage','record.name',{required:true,wide:true})+field('Groupe','record.category',{options:smurCategories.map(c=>[c.id,c.label]),wide:true})+'</div>'+renderPresentation()+
 section('posology','01','Posologie',posologyText(draft.record),renderPosology())+
 section('options','02','Options','Afficher uniquement les réglages utiles',renderOptions())+
 section('conditions','03','Conditions particulières',(draft.record.protocol.particulars||[]).length+' consigne(s)',renderConditions())+
 section('preparation','04','Préparation',preparationText({...draft.record,ampoule:draft.stock}),renderPreparation())+
 section('administration','05','Administration',draft.record.protocol.route||'Voie à préciser',renderAdministration())+
 section('review','06','Relecture',draft.review.questions.length+' point(s) à relire',renderReview());
 const visiblePaths=new Set();
 for(const input of $('editor-form').querySelectorAll('[data-path]')){visiblePaths.add(input.dataset.path);const bad=invalidValues.get(input.dataset.path);if(bad){input.value=bad.value;input.classList.add('invalid');input.setAttribute('aria-invalid','true');const error=$(input.id+'-error');if(error){error.textContent=bad.message;error.hidden=false;}}}
 for(const path of invalidInputs)if(!visiblePaths.has(path)){invalidInputs.delete(path);invalidValues.delete(path);}
 for(const el of $('editor-form').querySelectorAll('.form-section'))el.addEventListener('toggle',()=>{if(el.open)openSections.add(el.dataset.section);else openSections.delete(el.dataset.section);});
 renderHeading();refreshLive();
}
function refreshLive(){
 const dirty=draftChanged(state,draft)||invalidInputs.size>0,n=invalidInputs.size;
 $('draft-indicator').textContent=dirty?'Brouillon modifié':'Enregistré';$('draft-indicator').className=dirty?'dirty':'';
 $('save-btn').disabled=!dirty||!!n||loadFailed;$('discard-btn').disabled=!dirty;
 $('save-status').textContent=n?'Corriger les champs signalés':dirty?'Modifications non enregistrées':'Aucune modification';
 if($('stock-concentration'))$('stock-concentration').textContent=fmt(stockConcentration(draft.stock))+' '+draft.stock.unit+'/mL';
 $('bag-label').hidden=!draft.record.model.limitToOneBag;
 renderPreview();
}
function renderPreview(){
 $('generated-text').innerHTML='<details class="generated-panel"><summary>'+icon('file')+'Textes générés automatiquement</summary><p><strong>POSOLOGIE</strong>'+esc(posologyText(draft.record))+'</p><p><strong>PRÉPARATION</strong>'+esc(preparationText({...draft.record,ampoule:draft.stock}))+'</p></details>';
 if(invalidInputs.size){$('preview-result').innerHTML='<div class="error-box"><strong>Paramètre à corriger</strong>Les champs numériques doivent contenir un nombre valide.</div>';return;}
 try{
  const p=preview(state,draft,patient,previewAdjustment),r=p.r,v=p.result;
  if(p.hidden){$('preview-result').innerHTML='<div class="muted-box">Cette fiche est masquée pour l’âge d’essai renseigné.</div>';return;}
  if(v.status==='empty'||v.status==='blocked'){ $('preview-result').innerHTML='<div class="muted-box">'+esc(v.message)+'</div>';return;}
  const resultBox=(label,value,unit,sub='')=>'<div><span class="result-label">'+label+'</span><div class="result-number">'+esc(value)+' <b>'+esc(unit)+'</b></div>'+(sub?'<div class="result-sub">'+esc(sub)+'</div>':'')+'</div>';
  let result='';
  if(v.status==='instruction')result='<div class="main-result"><p>'+esc(v.message)+'</p></div>';
  else{
   result='<div class="main-result">'+resultBox(v.hourlyAmount!=null?'Dose horaire':'Dose calculée',fmt(v.hourlyAmount??v.dose),v.unit+(v.hourlyAmount!=null?'/h':''),v.maximumApplied?'Plafond appliqué':'');
   result+=v.rateMlH!=null?resultBox('Débit à administrer',fmt(v.rateMlH,1),'mL/h'):resultBox('Volume à administrer',v.volumeMl===null?'—':fmt(v.volumeMl,2),'mL',r.model.limitToOneBag&&v.bagVolumeMl===null?'Renseigner la poche':'');
   result+='</div>';
   if(v.sequence)result+=v.sequence.slice(1).map((step,i)=>'<div class="main-result">'+resultBox('Dose '+(i+2),fmt(step.dose),v.unit)+(step.rateMlH!=null?resultBox('Débit · dose '+(i+2),fmt(step.rateMlH,1),'mL/h'):resultBox('Volume · dose '+(i+2),fmt(step.volumeMl,2),'mL'))+'</div>').join('');
  }
  if(r.model.adjustmentStatus==='enabled'&&Number.isFinite(r.model.doseStep))result+='<div class="preview-adjustment"><button type="button" class="button secondary" data-adjust="-1" aria-label="Diminuer la dose d’un pas">−</button><span>'+fmt(r.model.coefficient)+' '+esc(r.model.unit)+'/kg'+(r.model.type==='infusion'?(r.model.periodMinutes===60?'/h':'/min'):'')+'<small>Pas : '+fmt(r.model.doseStep)+'</small></span><button type="button" class="button secondary" data-adjust="1" aria-label="Augmenter la dose d’un pas">+</button>'+(previewAdjustment?'<button class="text-button" type="button" data-adjust="reset">Réinitialiser</button>':'')+'</div>';
  $('preview-result').innerHTML='<article class="med-preview"><div class="preview-head"><div><small>'+esc(categoryName(r.category))+'</small><h3>'+esc(r.name)+'</h3></div><span class="route-badge">'+esc(r.protocol.route||'Consigne')+'</span></div>'+result+'<div class="preview-details">'+p.details.map(d=>'<div class="preview-line"><span>'+esc(d.label)+'</span><strong>'+esc(d.value)+'</strong></div>').join('')+'</div><div class="preview-bottom"><span class="badge '+draft.review.status+'">'+statusLabels[draft.review.status]+'</span><span>'+draft.review.questions.length+' point'+(draft.review.questions.length>1?'s':'')+' de relecture</span></div></article>';
 }catch(error){$('preview-result').innerHTML='<div class="error-box"><strong>Calcul suspendu</strong>'+esc(error.message)+'<p style="margin-top:9px">Les paramètres enregistrés restent conservés.</p></div>';}
}
function dialog(title,description,body,footer=''){
 $('dialog-content').innerHTML='<div class="dialog-head"><div><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p></div><button class="dialog-close" aria-label="Fermer" data-close>×</button></div><div class="dialog-body">'+body+'</div><div class="dialog-footer">'+(footer||'<button class="button secondary" data-close>Fermer</button>')+'</div>';
 if(!$('dialog').open)$('dialog').showModal();
 for(const btn of $('dialog').querySelectorAll('[data-close]'))btn.onclick=()=>$('dialog').close();
}
function displayValue(v){
 if(v===null||v===undefined||v==='')return 'Non renseigné';
 if(typeof v==='boolean')return v?'Oui':'Non';
 if(Array.isArray(v))return v.map((x,i)=>{
  if(typeof x==='string')return state.records.find(r=>r.id===x)?.name||x;
  if(x&&typeof x==='object')return (x.maxAgeMonthsExclusive!==undefined?'Avant '+fmt(x.maxAgeMonthsExclusive)+' mois':'Dose / tranche '+(i+1))+' : '+(x.tiers?displayValue(x.tiers):fmt(x.coefficient))+(x.maximumDose!=null?' · plafond '+fmt(x.maximumDose):'');
  return String(x);
 }).join(' ; ');
 if(typeof v==='object')return Object.entries(v).map(([k,x])=>(modelFields[k]||k)+' : '+displayValue(x)).join(' ; ');
 return ({dose:'Ponctuel',infusion:'Continu',fixed:'Fixe',enabled:'Réglable',todo:'À relire',reviewed:'Relue dans le test',reviewing:'En relecture'})[v]||String(v);
}
function changeTable(changes){
 return '<div class="change-row change-header"><span>Paramètre</span><span>Avant</span><span>Après</span></div>'+changes.map(c=>'<div class="change-row"><span>'+esc(c.label)+'</span><del>'+esc(displayValue(c.before))+'</del><ins>'+esc(displayValue(c.after))+'</ins></div>').join('');
}
function errorDialog(message){dialog('Impossible d’enregistrer','Les données actives sont conservées.','<div class="error-box">'+esc(message)+'</div>');}
function saveDialog(){
 try{
  const prepared=prepareSave(state,draft);
  dialog('Enregistrer cette fiche',draft.record.name+' · version '+((state.revisions[selected]||0)+1),
   '<div class="success-info">'+icon('check')+' '+(draft.stockId===null?'Fiche enregistrable. Affectez son ampoule ici ou depuis l’espace Ampoules.':prepared.checks.length+' cas de calcul vérifiés')+'</div>'+
   (prepared.stockChanged&&prepared.affected.length>1?'<div class="shared-note"><strong>Cette présentation est partagée.</strong><p>'+prepared.affected.map(id=>esc(state.records.find(r=>r.id===id).name)).join(' · ')+'</p><p>Les '+prepared.affected.length+' fiches seront actualisées et remises à relire.</p></div>':'')+
   (prepared.clinical?'<p>Les paramètres changent : la fiche repassera « À relire ». Vérifiez aussi les consignes libres importées.</p>':'')+
   changeTable(prepared.changes),
   '<button class="button secondary" data-close>Continuer à modifier</button><button class="button primary" id="confirm-save">Confirmer l’enregistrement</button>');
  $('confirm-save').onclick=()=>{try{persist(commitSave(state,draft,prepared));resetDraft();$('dialog').close();renderAll();toast(prepared.affected.length>1?prepared.affected.length+' fiches mises à jour dans cet atelier.':'Fiche enregistrée dans cet atelier.');}catch(error){errorDialog(error.message);}};
 }catch(error){errorDialog(error.message);}
}
function guardLeave(action){
 if(view==='stocks'){ampEditor.guard(action);return;}
 if(view==='references'){referenceEditor.guard(action);return;}
 if(!draftChanged(state,draft)&&!invalidInputs.size){action();return;}
 dialog('Un brouillon est en cours','Cette fiche contient des modifications non enregistrées.','<p>Vous pouvez revenir à la fiche pour l’enregistrer, ou abandonner ce brouillon pour continuer.</p>','<button class="button secondary" data-close>Revenir au brouillon</button><button class="button danger" id="discard-and-go">Abandonner et continuer</button>');
 $('discard-and-go').onclick=()=>{resetDraft();invalidInputs.clear();$('dialog').close();action();};
}
function resetDraft(){if(!state.records.some(r=>r.id===selected))selected=state.records[0].id;draft=draftFor(state,selected);continuousBackup=null;rangeBackup=null;previewAdjustment=0;invalidInputs.clear();invalidValues.clear();}
function newMedication(){guardLeave(()=>{draft=createMedicationDraft();selected=draft.record.id;continuousBackup=null;rangeBackup=null;previewAdjustment=0;openSections.add('posology');openSections.add('options');setView('editor');renderAll();$('f-record-name').focus();$('workspace').scrollIntoView({block:'start'});});}
function selectRecord(id){
 if(id===selected&&view==='editor')return;
 guardLeave(()=>{selected=id;resetDraft();view='editor';setView('editor');renderAll();if(innerWidth<=600)$('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
}
function setView(next){
 view=next;
 for(const v of ['editor','stocks','references','history'])$(v+'-view').hidden=v!==next;
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===next);b.setAttribute('aria-current',b.dataset.view===next?'page':'false');});
 if(next==='stocks')renderStocks();
 if(next==='references')referenceEditor.show();
 if(next==='history')renderHistory();
}
function renderStocks(){ampEditor.show();}
function renderHistory(){
 $('history-view').innerHTML='<div class="collection-heading"><div><div class="eyebrow">SUIVRE LES ÉVOLUTIONS</div><h2>Historique des modifications</h2><p>Chaque enregistrement conserve le détail des changements et la version précédente.</p></div><button class="button secondary" data-view="editor">Retour aux fiches</button></div>'+
 (state.history.length?state.history.map(e=>'<article class="history-item"><div class="history-symbol">'+icon('history')+'</div><div class="history-main"><h3>'+esc(e.name)+'</h3><p>'+new Date(e.at).toLocaleString('fr-FR')+' · '+(e.kind==='references'?(e.restored?'Repères antérieurs restaurés':'Repères mis à jour'):e.kind==='restore'?'Version antérieure restaurée':e.kind==='create'?'Médicament créé':e.affected.length+' fiche'+(e.affected.length>1?'s':'')+' mise'+(e.affected.length>1?'s':'')+' à jour')+'</p>'+(e.kind==='references'?'':'<p>'+e.checks+' cas de calcul vérifiés</p>')+(e.changes.length?'<details><summary>Voir les '+e.changes.length+' changements</summary>'+changeTable(e.changes)+'</details>':'')+'</div><div><button class="button secondary" data-restore="'+esc(e.id)+'"'+(!canRestore(state,e)?' disabled title="Une modification plus récente concerne ces réglages"':'')+'>Revenir à la version précédente</button></div></article>').join(''):'<div class="empty-state">'+icon('history')+'<h3>L’historique commence avec votre premier essai.</h3><p>Modifiez une fiche et enregistrez-la pour retrouver ici son avant/après.</p></div>');
}
function restoreDialog(id){
 const event=state.history.find(e=>e.id===id);
 dialog('Restaurer la version précédente',event.name,(event.kind==='references'?'<p>Les valeurs mensuelles et la formule de la sonde avec ballonnet reviendront à leur état précédent.</p>':'<p>La restauration concerne '+event.affected.length+' fiche'+(event.affected.length>1?'s':'')+' et les présentations partagées associées. Ces fiches repasseront « À relire ».</p>')+'<p>Une nouvelle entrée sera ajoutée à l’historique.</p>','<button class="button secondary" data-close>Annuler</button><button class="button primary" id="confirm-restore">Restaurer cette version</button>');
 $('confirm-restore').onclick=()=>{try{persist(restoreEvent(state,event));resetDraft();$('dialog').close();ampEditor.reset();referenceEditor.reset();renderAll();renderHistory();toast(event.kind==='references'?'Repères restaurés.':'Version restaurée. Les fiches concernées sont à relire.');}catch(error){errorDialog(error.message);}};
}
function checksDialog(){
 try{
  const next=withDraft(state,draft);validateAtelier(next);
  const results=checkCases(next,selected);
  dialog('Contrôle des cas d’essai','Les poids usuels et les limites propres à cette fiche sont vérifiés.','<div class="success-info">'+results.filter(r=>r.ok).length+' / '+results.length+' cas sans erreur de calcul</div><p>Un calcul bloqué par une condition d’âge est un résultat attendu. Ce contrôle n’est pas une validation clinique.</p><div class="check-row change-header"><span>Patient d’essai</span><span>Dose</span><span>Résultat</span></div>'+results.map(c=>'<div class="check-row"><span>'+fmt(c.weightKg)+' kg · '+fmt(c.ageMonths)+' mois</span><span>'+fmt(c.dose)+' '+esc(c.unit||'')+'</span><b class="'+(!c.ok?'failed':'')+'">'+(c.ok?(c.status==='blocked'?'Palier bloqué':c.status==='instruction'?'Consigne':c.rate!=null?fmt(c.rate,1)+' mL/h':c.volume!=null?fmt(c.volume,2)+' mL':'Dose seule'):'Erreur')+'</b></div>').join(''));
 }catch(error){errorDialog(error.message);}
}
function settingsDialog(){
 dialog('Votre atelier de test','Un projet indépendant pour essayer la nouvelle gestion.',
 '<p>Les caractéristiques des ampoules se modifient dans leur espace dédié. Vous pouvez affecter une ampoule depuis une fiche médicament ou cocher les usages depuis une fiche ampoule. Les deux écrans partagent les mêmes affectations.<br><br>Les 65 fiches de départ proviennent d’une copie des paramètres de PediDose. Ce site ne modifie ni le dépôt ni l’application PediDose.</p><p class="storage-note">Vos essais et leur historique sont conservés uniquement dans ce navigateur. Exportez une sauvegarde pour les garder ou les transférer sur un autre appareil. Aucun patient d’essai n’est enregistré.</p><div class="settings-actions"><button class="button secondary" id="export-btn">Exporter ma sauvegarde<small>Fiches, ampoules, repères, relectures et historique · JSON</small></button><button class="button secondary" id="import-btn">Importer une sauvegarde de l’atelier<small>Un aperçu sera présenté avant remplacement.</small></button><button class="button danger" id="reset-btn">Réinitialiser cet atelier<small>Revenir à la copie initiale et effacer les essais de ce navigateur.</small></button></div><p>Source : <a href="https://github.com/guillaumeferraro-gif/PediDoses/tree/'+SOURCE_SHA+'" target="_blank" rel="noopener">PediDose · '+SOURCE_SHA.slice(0,8)+'</a></p><p>Prototype d’interface hors usage clinique. Les statuts de relecture ne constituent pas une validation de PediDose.</p>');
 $('export-btn').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pedidose-atelier-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Sauvegarde des versions enregistrées exportée.');
 };
 $('import-btn').onclick=()=>$('import-input').click();
 $('reset-btn').onclick=()=>{
  dialog('Réinitialiser l’atelier','Les essais de ce navigateur seront effacés.','<p>Cette action rétablit les paramètres de départ, les relectures et l’historique. PediDose reste inchangé.</p>','<button class="button secondary" data-close>Conserver mes essais</button><button class="button danger" id="confirm-reset">Réinitialiser le projet test</button>');
  $('confirm-reset').onclick=()=>{try{const next=newState();persistState(localStorage,next);state=next;window.dispatchEvent(new Event('atelier-updated'));loadFailed=false;$('global-error').hidden=true;resetDraft();$('dialog').close();renderAll();ampEditor.reset();referenceEditor.reset();if(view!=='editor')setView(view);toast('Atelier réinitialisé.');}catch(error){errorDialog(error.message);}};
 };
}
function renderAll(){renderStats();renderList();renderHeading();renderEditor();}
function handleField(el){
 const path=el.dataset.path,kind=el.dataset.kind,special=el.dataset.special;
 if(!path)return;
 previewAdjustment=0;
 let value=kind==='checkbox'?el.checked:el.value;
 try{
  if(kind==='number'){
   const str=String(value).trim();
   if(str&&!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(str))throw Error('Saisir un nombre valide.');
   value=str===''?(path.startsWith('stock.')||path==='record.protocol.durationMinutes'?null:undefined):Number(str.replace(',','.'));
   if(value!==undefined&&value!==null&&!Number.isFinite(value))throw Error('Saisir un nombre fini.');
  }
  invalidInputs.delete(path);invalidValues.delete(path);el.removeAttribute('aria-invalid');el.classList.remove('invalid');if($(el.id+'-error'))$(el.id+'-error').hidden=true;
  if(kind==='lines')value=String(value).split('\n').map(x=>x.trim()).filter(Boolean);
  if(special==='stock-link'){assignStock(state,draft,value||null);renderEditor();$('f-stockId')?.focus();return;}
  if(special==='dose-unit'){convertUsageUnit(draft.record,value);renderEditor();return;}
  if(special==='period'){convertUsagePeriod(draft.record,Number(value));renderEditor();return;}
  if(special==='duration'){
   if(['fixed-duration-mixture','insulin-glucose'].includes(draft.record.model.type))setPath(draft,'record.model.durationHours',value==null?undefined:value/60);
   else draft.record.protocol.durationMinutes=value??null;
  }else if(special==='prep-mode'){
   const targetPath=path.replace(/\.__mode$/,'');
   const target=getPath(draft,targetPath);
   if(targetPath==='record.model')changePrep({record:{model:target}},value);
   else{const model=clone(draft.record.model);applyPreparation(model,target);changePrep({record:{model}},value);setPath(draft,targetPath,preparationOf(model));}
   renderEditor();toast('Méthode modifiée dans le brouillon. Vérifiez les nouveaux paramètres.');return;
  }else if(special==='multiple'){
   setMultipleDoses(draft.record,value);renderEditor();document.getElementById('option-multiple')?.focus();return;
  }else if(special==='ranges'||special==='prep-ranges'){
   const part=special==='ranges'?'dose':'preparation';
   if(!value)rangeBackup=clone(draft.record.patientRules);
   if(value&&rangeBackup&&!draft.record.patientRules){draft.record.patientRules=clone(rangeBackup);rangeBackup=null;}else setPatientRule(draft.record,part,value);
   renderEditor();document.getElementById('option-'+special)?.focus();return;
  }else if(special==='range-axis'){changeRuleAxis(draft.record,value);renderEditor();toast('Axe modifié : renseignez les seuils dans la nouvelle unité.');return;
  }else if(special==='adjustment'){
   draft.record.model.adjustmentStatus=value?'enabled':'fixed';
   if(value)draft.record.model.doseStep=null;else delete draft.record.model.doseStep;
   renderEditor();document.getElementById('option-adjustment')?.focus();return;
  }else if(special==='age'){
   setAgeDoses(draft.record,value);renderEditor();document.getElementById('option-age')?.focus();return;
  }else if(special==='continuous'){
   if(continuousBackup&&continuousBackup.model.type===(value?'infusion':'dose')){draft.record.model=clone(continuousBackup.model);draft.record.protocol=clone(continuousBackup.protocol);if(continuousBackup.patientRules)draft.record.patientRules=clone(continuousBackup.patientRules);else delete draft.record.patientRules;continuousBackup=null;}
   else{continuousBackup={model:clone(draft.record.model),protocol:clone(draft.record.protocol),patientRules:clone(draft.record.patientRules)};setContinuous(draft.record,value);}
   renderEditor();document.getElementById('option-continuous')?.focus();toast('Mode modifié. Renseignez la posologie et vérifiez la préparation.');return;
  }else if(special==='pure-mix'){setPath(draft,path,value?null:{takeMl:1,addMl:9});renderEditor();return;}
  else setPath(draft,path,value);
  if(special?.startsWith('range-boundary')){for(const input of $('editor-form').querySelectorAll('[data-path]'))if(input!==el&&input.dataset.path===path)input.value=el.value;for(const label of $('editor-form').querySelectorAll('[data-band-label]'))label.textContent=bandLabel(draft.record,Number(label.dataset.bandLabel));}
  if(path.startsWith('review.')||path==='record.name'||path==='record.category')renderHeading();
  refreshLive();
 }catch(error){
  invalidInputs.add(path);invalidValues.set(path,{value:el.value,message:error.message});el.setAttribute('aria-invalid','true');el.classList.add('invalid');
  const node=$(el.id+'-error');if(node){node.textContent=error.message;node.hidden=false;}
  refreshLive();
 }
}
$('editor-form').addEventListener('submit',e=>e.preventDefault());
$('editor-form').addEventListener('input',e=>{if(e.target.tagName==='SELECT'||e.target.type==='checkbox')return;handleField(e.target);});
$('editor-form').addEventListener('change',e=>{if(e.target.tagName==='SELECT'||e.target.type==='checkbox')handleField(e.target);});
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.id==='new-medication'){newMedication();return;}
 if(b.dataset.adjust){
  if(b.dataset.adjust==='reset'){previewAdjustment=0;renderPreview();return;}
  const direction=Number(b.dataset.adjust),next=previewAdjustment+direction;
  try{const p=preview(state,draft,patient,next),m=p.r.model;
   const apply=()=>{previewAdjustment=next;renderPreview();};
   if(direction>0&&Number.isFinite(m.warningCoefficient)&&m.coefficient>m.warningCoefficient){dialog('Seuil d’avertissement dépassé','Réglage temporaire du patient d’essai.','<p>La posologie proposée est de '+esc(fmt(m.coefficient))+' '+esc(m.unit)+'/kg. Le seuil renseigné est '+esc(fmt(m.warningCoefficient))+'.</p>','<button class="button secondary" data-close>Annuler</button><button class="button primary" id="confirm-adjust">Tester cette valeur</button>');$('confirm-adjust').onclick=()=>{$('dialog').close();apply();};}else apply();
  }catch(e){toast(e.message);}return;
 }
 if(b.dataset.action==='add-band'||b.dataset.action==='remove-band'){try{if(b.dataset.action==='add-band')addBand(draft.record);else removeBand(draft.record,Number(b.dataset.index));renderEditor();if(b.dataset.sectionTarget){openSections.add(b.dataset.sectionTarget);const section=$('editor-form').querySelector('[data-section="'+b.dataset.sectionTarget+'"]');section.open=true;section.querySelector('[data-path="record.patientRules.bands.'+(draft.record.patientRules.bands.length-2)+'.until"]')?.focus();}}catch(e){toast(e.message);}return;}
 if(b.dataset.select){selectRecord(b.dataset.select);return;}
 if(b.dataset.view){guardLeave(()=>setView(b.dataset.view));return;}
 if(b.dataset.restore){restoreDialog(b.dataset.restore);return;}
 if(b.hasAttribute('data-open-amp')){guardLeave(()=>{setView('stocks');ampEditor.show(b.dataset.openAmp||undefined);});return;}
 if(b.dataset.action==='add-dose'){try{addDose(draft.record);renderEditor();}catch(e){toast(e.message);}return;}
 if(b.dataset.action==='remove-dose'){removeDose(draft.record,Number(b.dataset.index));renderEditor();return;}
 if(b.dataset.action==='add-age-row'){
  const rows=getPath(draft,b.dataset.tierPath),last=rows.at(-1);last.maxAgeMonthsExclusive=null;rows.push({coefficient:null});renderEditor();return;
 }
 if(b.dataset.action==='remove-age-row'){
  const rows=getPath(draft,b.dataset.tierPath);rows.splice(Number(b.dataset.index),1);delete rows.at(-1).maxAgeMonthsExclusive;renderEditor();return;
 }
 if(b.dataset.preset){
  const [weight,age]=b.dataset.preset.split(',');previewAdjustment=0;Object.assign(patient,{weight,age,ageUnit:'months'});$('patient-weight').value=weight;$('patient-age').value=age;$('patient-age-unit').value='months';document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));renderPreview();
 }
});
for(const id of ['search','category','only-pending'])$(id).addEventListener(id==='search'?'input':'change',renderList);
for(const [id,key]of [['patient-weight','weight'],['patient-age','age'],['patient-age-unit','ageUnit'],['patient-bag','bag']])$(id).addEventListener(id==='patient-age-unit'?'change':'input',()=>{previewAdjustment=0;patient[key]=$(id).value;document.querySelectorAll('[data-preset]').forEach(x=>x.classList.remove('active'));renderPreview();});
$('save-btn').onclick=saveDialog;
$('discard-btn').onclick=()=>guardLeave(()=>{resetDraft();renderAll();});
$('check-cases-btn').onclick=checksDialog;
$('settings-btn').onclick=settingsDialog;$('about-btn').onclick=settingsDialog;
$('show-preview').onclick=()=>{$('workspace').classList.add('preview-mode');$('show-preview').classList.add('active');$('show-editor').classList.remove('active');};
$('show-editor').onclick=()=>{$('workspace').classList.remove('preview-mode');$('show-editor').classList.add('active');$('show-preview').classList.remove('active');};
$('import-input').addEventListener('change',async()=>{
 const file=$('import-input').files[0];if(!file)return;
 try{
  if(file.size>12000000)throw Error('La sauvegarde dépasse 12 Mo.');
  const next=validateState(JSON.parse(await file.text()));
  dialog('Importer cette sauvegarde',file.name,'<p>'+next.records.length+' fiches et '+next.history.length+' entrées d’historique seront restaurées, ainsi que les repères vitaux et d’intubation.</p><p>Les essais actuels de ce navigateur seront remplacés, y compris le brouillon ouvert.</p>','<button class="button secondary" data-close>Annuler</button><button class="button primary" id="confirm-import">Remplacer les essais actuels</button>');
  $('confirm-import').onclick=()=>{try{persistState(localStorage,next);state=next;window.dispatchEvent(new Event('atelier-updated'));loadFailed=false;$('global-error').hidden=true;resetDraft();$('dialog').close();renderAll();ampEditor.reset();referenceEditor.reset();if(view!=='editor')setView(view);toast('Sauvegarde de l’atelier importée.');}catch(error){errorDialog(error.message);}};
 }catch(error){errorDialog(error.message);}finally{$('import-input').value='';}
});
window.addEventListener('atelier-admin-leave',event=>{event.preventDefault();let proceeded=false;guardLeave(()=>{proceeded=true;event.detail.proceed();});if(!proceeded)$('dialog').addEventListener('close',()=>{if(!proceeded)event.detail.cancel?.();},{once:true});});
window.addEventListener('atelier-open-record',event=>selectRecord(event.detail.id));
window.addEventListener('beforeunload',e=>{if(draftChanged(state,draft)||invalidInputs.size||ampEditor.dirty()||referenceEditor.dirty()){e.preventDefault();e.returnValue='';}});
const ampEditor=new AmpouleEditor({getState:()=>state,persist,onCommit:()=>{resetDraft();renderAll();},dialog,notify:toast});
const referenceEditor=new ReferenceEditor({getState:()=>state,persist,onCommit:()=>renderStats(),dialog,notify:toast});
for(const c of smurCategories)$('category').insertAdjacentHTML('beforeend',option(c.id,c.label,'all'));
renderAll();
