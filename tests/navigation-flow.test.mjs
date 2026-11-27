// Script-level integration of both screens, with DOM/event doubles (no visual rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {newState,draftFor,commitSave,STORAGE_KEY} from '../dist/domain.js';
import {defaultConfiguration} from '../dist/engine/protocol-config.js';

async function runtime({locks=true,initial=null}={}){
 const nodes=new Map();let doc;
 class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.attributes={};this.listeners=new Map();this.value='';this.checked=false;this.hidden=false;this.open=false;this.className='';this._text='';this.innerHTML='';this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' '),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(' ').filter(x=>!names.includes(x)).join(' ');},toggle:(name,on)=>on?this.classList.add(name):this.classList.remove(name)};}
  set id(id){this._id=id;nodes.set(id,this);} get id(){return this._id;}
  set textContent(s){this._text=String(s);this.children=[];} get textContent(){return this._text+this.children.map(x=>typeof x==='string'?x:x.textContent).join('');}
  append(...children){this.children.push(...children);} replaceChildren(...children){this._text='';this.children=children;}
  addEventListener(name,fn,options={}){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push({fn,once:options.once});}
  dispatchEvent(event){for(const item of [...this.listeners.get(event.type)||[]]){item.fn(event);if(item.once)this.listeners.set(event.type,this.listeners.get(event.type).filter(x=>x!==item));}return !event.defaultPrevented;}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=v;} getAttribute(k){return this.attributes[k];} hasAttribute(k){return k in this.attributes;} removeAttribute(k){delete this.attributes[k];}
  querySelectorAll(){return [];} querySelector(s){return s.startsWith('#')?doc.getElementById(s.slice(1)):new Element();} insertAdjacentHTML(_,s){this.innerHTML+=s;}
  click(){} focus(){} scrollIntoView(){} closest(s){if(s==='[data-screen]')return this.dataset.screen?this:null;return this;}
  showModal(){this.open=true;} close(){this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
  reset(){if(this.id==='quick-patient-form'){doc.getElementById('quick-weight').value='';doc.getElementById('quick-age').value='';doc.getElementById('quick-age-unit').value='years';}}
 }
 doc=new Element();doc.getElementById=id=>{if(!nodes.has(id)){const e=new Element();e.id=id;}return nodes.get(id);};doc.createElement=tag=>new Element(tag);doc.createTextNode=text=>{const e=new Element();e.textContent=text;return e;};
 const win=new Element();win.scrollY=0;win.scrollTo=()=>{};win.confirm=()=>true;win.alert=message=>{throw Error(message);};win.print=()=>win.dispatchEvent(new Event('beforeprint'));
 const location={hash:''};const stack=[{state:null,hash:''}];let index=0;
 const history={replaceState:(state,_,hash)=>{stack[index]={state,hash};location.hash=hash;},pushState:(state,_,hash)=>{stack.splice(index+1);stack.push({state,hash});index++;location.hash=hash;},go:delta=>{index+=delta;location.hash=stack[index].hash;win.dispatchEvent({type:'popstate',state:stack[index].state});}};
 const mem=new Map(initial?[['pedidose-atelier.independent.v1',JSON.stringify(initial)]]:[]),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),key:i=>[...mem.keys()][i]??null,get length(){return mem.size;}};
 const downloads=[];
 for(const id of ['quick-category','category'])doc.getElementById(id).value='all';doc.getElementById('quick-age-unit').value='years';
 Object.assign(globalThis,{document:doc,window:win,localStorage:storage});
 const ctx=vm.createContext({document:doc,window:win,localStorage:storage,history,location,crypto:webcrypto,structuredClone,console,Intl,Event,CustomEvent,navigator:{locks:locks===true?{request:async(name,options,fn)=>fn()}:locks||undefined},Blob,URL:{createObjectURL:blob=>{downloads.push(blob);return 'blob:fictif';},revokeObjectURL(){}},queueMicrotask,setTimeout:()=>0,clearTimeout(){},innerWidth:1200,matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>fn()});
 async function evaluate(path){const file=new URL(path,import.meta.url);let source=await readFile(file,'utf8');for(const match of source.matchAll(/import \{([^}]+)\} from '([^']+)';/g)){const mod=await import(new URL(match[2],file));for(const name of match[1].split(',').map(x=>x.trim()))ctx[name]=mod[name];}source=source.replace(/^import .*;\n/gm,'');vm.runInContext(source,ctx);}
 await evaluate('../dist/app.js');await evaluate('../dist/visual/smur-ui.js');await evaluate('../dist/navigation.js');
 return {run:code=>vm.runInContext(code,ctx),get:id=>doc.getElementById(id),history,location,mem,win,downloads,clickScreen:screen=>{const target=new Element('button');target.dataset.screen=screen;doc.dispatchEvent({type:'click',target,preventDefault(){}});}};
}

test('le rappel CGR suit le volume calculé et disparaît après une saisie invalide', async () => {
 const ui = await runtime();
 const weight = ui.get('quick-weight');
 const card = ui.run("cards.get('cgr')");
 for (const [input, volume, enhanced] of [['19,9',199,false], ['20,1',201,true], ['20',200,false], ['50',500,true]]) {
  weight.value = input;
  weight.dispatchEvent(new Event('input'));
  assert.equal(ui.run("results.get('cgr').dose"), volume);
  assert.match(card.values.textContent, /Volume calculé au poids/);
  assert.match(card.notes.textContent, /Une poche maximum.*étiquette/);
  assert.equal(card.notes.textContent.includes('200 mL'), enhanced);
  assert.equal(card.notes.children[0].tagName === 'STRONG', enhanced);
  assert.doesNotMatch(card.calculation.textContent, /solution finale à administrer/);
  for (const id of ['pfc','cpa']) assert.doesNotMatch(ui.run(`cards.get('${id}').notes.textContent`), /200 mL|étiquette/);
 }
 weight.value = 'incorrect';
 weight.dispatchEvent(new Event('input'));
 assert.doesNotMatch(card.notes.textContent, /200 mL|Une poche maximum/);
});

test('parcours complet : visualisation, administration, brouillon, sauvegarde et retour sans perdre le patient',async()=>{
 const ui=await runtime();
 assert.equal(ui.get('visualisation-screen').hidden,false);assert.equal(ui.get('administration-screen').hidden,true);assert.equal(ui.get('administration-style').disabled,true);
 ui.get('quick-weight').value='10';ui.get('quick-age').value='2';ui.get('quick-weight').dispatchEvent(new Event('input'));
 ui.get('quick-search').value='Propofol';ui.get('quick-search').dispatchEvent(new Event('input'));ui.run("cards.get('propofol').details.open=true;");
 assert.equal(ui.run("results.get('propofol').dose"),20);
 ui.clickScreen('administration');assert.equal(ui.get('administration-screen').hidden,false);assert.equal(ui.get('visual-base-style').disabled,true);
 ui.run("selectRecord('propofol');draft.record.model.coefficient=3;");assert.equal(ui.run("results.get('propofol').dose"),20);
 ui.clickScreen('visualisation');assert.equal(ui.get('administration-screen').hidden,false);assert.equal(ui.get('dialog').open,true);
 await ui.get('discard-and-go').onclick();await Promise.resolve();assert.equal(ui.get('visualisation-screen').hidden,false);assert.equal(ui.get('quick-weight').value,'10');assert.equal(ui.get('quick-search').value,'Propofol');assert.equal(ui.run("cards.get('propofol').details.open"),true);
 ui.clickScreen('administration');ui.run("selectRecord('propofol');draft.record.model.coefficient=3;saveDialog();");await ui.get('confirm-save').onclick();await Promise.resolve();
 assert.equal(ui.run("results.get('propofol').dose"),30);assert.equal(ui.run("cards.get('propofol').details.open"),true);
 ui.clickScreen('visualisation');assert.equal(ui.get('quick-weight').value,'10');assert.equal(ui.get('quick-age').value,'2');assert.equal(ui.get('quick-search').value,'Propofol');assert.equal(ui.run("cards.get('propofol').values.textContent.includes('30 mg')"),true);
 // Native Back returns to admin; cancelling a further Back preserves the draft and URL.
 ui.history.go(-1);assert.equal(ui.get('administration-screen').hidden,false);ui.run('draft.record.model.coefficient=4;');ui.history.go(-1);assert.equal(ui.get('administration-screen').hidden,false);ui.get('dialog').close();await Promise.resolve();assert.equal(ui.location.hash,'#administration');assert.equal(ui.run('draft.record.model.coefficient'),4);
 // Discard and return; the saved dose remains the one displayed.
 ui.clickScreen('visualisation');await ui.get('discard-and-go').onclick();await Promise.resolve();assert.equal(ui.run("results.get('propofol').dose"),30);
 // Assign from a medication and verify the reverse editor and main screen.
 ui.clickScreen('administration');ui.run("selectRecord('propofol');assignStock(state,draft,state.links['ketamine-analgesie']);saveDialog();");await ui.get('confirm-save').onclick();await Promise.resolve();
 assert.equal(ui.run("results.get('propofol').volumeMl"),0.6);
 ui.run("setView('stocks');ampEditor.show(state.links['ketamine-analgesie']);");assert.equal(ui.run("ampEditor.draft.assignedIds.includes('propofol')"),true);
 // Reassign back through the ampoule, then verify the medication link and viewer.
 ui.run("ampEditor.show('stock-propofol');ampEditor.draft.assignedIds.push('propofol');ampEditor.save();");await ui.get('amp-confirm-save').onclick();await Promise.resolve();assert.equal(ui.run("state.links.propofol"),'stock-propofol');assert.equal(ui.run("results.get('propofol').volumeMl"),3);
 ui.clickScreen('visualisation');assert.equal(ui.get('quick-weight').value,'10');assert.equal(ui.get('quick-search').value,'Propofol');
 assert.equal([...ui.mem.keys()].some(k=>/patient/.test(k)),false);
 // Printing uses only the displayed medications and never opens/closes disclosures.
 ui.get('quick-print').dispatchEvent(new Event('click'));await Promise.resolve();
 assert.match(ui.get('quick-print-document').innerHTML,/30 mg/);assert.equal(ui.get('quick-print-document').dataset.pages,'1');
 assert.doesNotMatch(ui.get('quick-print-document').innerHTML,/Adrénaline/);assert.equal(ui.run("cards.get('propofol').details.open"),true);
 ui.run("window.dispatchEvent(new Event('afterprint'));");assert.equal(ui.get('quick-weight').value,'10');assert.equal(ui.get('quick-search').value,'Propofol');assert.equal(ui.run("cards.get('propofol').details.open"),true);
 // A subsequent print replaces the old patient calculation, including an invalid input.
 ui.get('quick-weight').value='20';ui.get('quick-weight').dispatchEvent(new Event('input'));ui.run("window.dispatchEvent(new Event('beforeprint'));");assert.match(ui.get('quick-print-document').innerHTML,/60 mg/);
 ui.get('quick-weight').value='incorrect';ui.get('quick-weight').dispatchEvent(new Event('input'));ui.run("window.dispatchEvent(new Event('beforeprint'));");assert.doesNotMatch(ui.get('quick-print-document').innerHTML,/60 mg/);assert.match(ui.get('quick-print-document').innerHTML,/NON CALCULÉ/);
});

test('repères : édition mensuelle, protection du brouillon, sauvegarde, impression et retour au patient',async()=>{
 const ui=await runtime();
 ui.get('quick-weight').value='12';ui.get('quick-age').value='6';ui.get('quick-age-unit').value='months';ui.get('quick-age').dispatchEvent(new Event('input'));
 assert.match(ui.get('quick-reference-cards').textContent,/À renseigner/);
 ui.clickScreen('administration');ui.run("setView('references');referenceEditor.month=6;referenceEditor.render();");
 const input=ui.get('reference-6-tam');input.value='60,5';input.dataset.referenceField='tam';
 ui.get('references-view').dispatchEvent({type:'input',target:input});
 assert.equal(ui.run('referenceEditor.draft.months[6].tam'),60.5);assert.equal(ui.run('patientReferences.tam'),null);
 ui.clickScreen('visualisation');assert.equal(ui.get('dialog').open,true);assert.equal(ui.get('visualisation-screen').hidden,true);
 await ui.get('reference-abandon').onclick();await Promise.resolve();assert.equal(ui.get('visualisation-screen').hidden,false);assert.equal(ui.run('patientReferences.tam'),null);
 ui.clickScreen('administration');ui.run("setView('references');referenceEditor.month=6;referenceEditor.render();");
 input.value='60,5';ui.get('references-view').dispatchEvent({type:'input',target:input});
 const tube=ui.get('reference-6-cuffed');tube.tagName='SELECT';tube.dataset.referenceField='cuffed';tube.value='3.5';ui.get('references-view').dispatchEvent({type:'change',target:tube});
 ui.run('referenceEditor.save()');assert.match(ui.get('dialog-content').innerHTML,/60,5/);await ui.get('reference-confirm-save').onclick();await Promise.resolve();
 assert.equal(ui.run('patientReferences.tam'),60.5);assert.equal(ui.run('patientReferences.cuffed'),3.5);assert.equal(ui.run('referenceEditor.dirty()'),false);
 assert.equal(ui.run('loadState(localStorage).clinicalReferences.months[6].tam'),60.5);
 ui.clickScreen('visualisation');assert.equal(ui.get('quick-age').value,'6');assert.match(ui.get('quick-reference-cards').textContent,/60,5/);
 const print=ui.run('preparePrint()');assert.equal(print.pages.length,2);assert.match(ui.get('quick-print-document').innerHTML,/60,5/);assert.match(ui.get('quick-print-document').innerHTML,/3,5/);
 ui.get('quick-age').value='7';ui.get('quick-age').dispatchEvent(new Event('input'));assert.equal(ui.run('patientReferences.tam'),null);assert.match(ui.get('quick-reference-cards').textContent,/À renseigner/);
 ui.get('quick-age').value='12';ui.get('quick-age').dispatchEvent(new Event('input'));assert.equal(ui.run('patientReferences.tam'),56.5);assert.equal(ui.run('patientReferences.cuffed'),3.25);
 ui.get('quick-age').value='18';ui.get('quick-age').dispatchEvent(new Event('input'));assert.equal(ui.run('patientReferences.tam'),57.25);
 ui.get('quick-weight').value='incorrect';ui.get('quick-weight').dispatchEvent(new Event('input'));assert.match(ui.get('quick-reference-cards').textContent,/Saisie à corriger/);assert.equal(ui.run('patientReferences.tam'),undefined);
 ui.get('quick-reset').dispatchEvent(new Event('click'));assert.match(ui.get('quick-reference-cards').textContent,/Âge requis/);assert.equal(ui.run('patientReferences.tam'),undefined);
});

test('repères : une saisie invalide survit au changement de mois et un échec de stockage conserve le brouillon',async()=>{
 const ui=await runtime();ui.clickScreen('administration');ui.run("setView('references');");
 const input=ui.get('reference-0-tam');input.dataset.referenceField='tam';input.value='pas un nombre';ui.get('references-view').dispatchEvent({type:'input',target:input});
 assert.equal(ui.get('reference-save').disabled,true);assert.equal(ui.run('referenceEditor.dirty()'),true);
 ui.run('referenceEditor.month=1;referenceEditor.render();referenceEditor.month=0;referenceEditor.render();');assert.match(ui.get('references-view').innerHTML,/pas un nombre/);
 input.value='60';ui.get('references-view').dispatchEvent({type:'input',target:input});assert.equal(ui.get('reference-save').disabled,false);
 ui.run("var originalSetItem=localStorage.setItem;localStorage.setItem=()=>{throw Error('Quota plein');};referenceEditor.save();");
 await ui.get('reference-confirm-save').onclick();await Promise.resolve();assert.equal(ui.run('referenceEditor.dirty()'),true);assert.equal(ui.run('state.clinicalReferences.months[0].tam'),null);assert.match(ui.get('reference-errors').textContent,/Quota plein/);
 ui.run('localStorage.setItem=originalSetItem;referenceEditor.save();');await ui.get('reference-confirm-save').onclick();await Promise.resolve();assert.equal(ui.run('referenceEditor.dirty()'),false);
 ui.run("setView('history');restoreDialog(state.history[0].id);");assert.match(ui.get('dialog-content').innerHTML,/valeurs mensuelles/);await ui.get('confirm-restore').onclick();await Promise.resolve();
 assert.equal(ui.run('state.clinicalReferences.months[0].tam'),null);ui.run("setView('references');");assert.equal(ui.run('referenceEditor.draft.months[0].tam'),null);
});

function externalSave(ui){
 const s=ui.mem.has(STORAGE_KEY)?JSON.parse(ui.mem.get(STORAGE_KEY)):newState(),d=draftFor(s,'propofol');d.record.model.coefficient=4;
 const value=JSON.stringify(commitSave(s,d));ui.mem.set(STORAGE_KEY,value);ui.win.dispatchEvent({type:'storage',key:STORAGE_KEY});return value;
}
test('notification externe : lecteur actualisé, brouillons et saisies invalides préservés',async()=>{
 const ui=await runtime();ui.get('quick-weight').value='10';ui.get('quick-age').value='2';ui.get('quick-weight').dispatchEvent(new Event('input'));
 ui.run("selectRecord('propofol');draft.record.model.coefficient=3;invalidInputs.add('record.model.maximumDose');invalidValues.set('record.model.maximumDose','essai invalide');");
 const saved=externalSave(ui);assert.equal(ui.run("results.get('propofol').dose"),40);assert.equal(ui.run('draft.record.model.coefficient'),3);assert.equal(ui.run('state.records.find(r=>r.id===\'propofol\').model.coefficient'),2);
 assert.equal(ui.get('storage-notice').hidden,false);assert.equal(ui.run("invalidValues.get('record.model.maximumDose')"),'essai invalide');
 ui.run('compareStored()');assert.match(ui.get('dialog-content').innerHTML,/4/);await ui.get('reload-conflict').onclick();assert.match(ui.get('dialog-content').innerHTML,/abandonnés/);
 ui.get('dialog').close();assert.equal(ui.run('draft.record.model.coefficient'),3);assert.equal(ui.mem.get(STORAGE_KEY),saved);
 ui.run('recoverDrafts()');const recovered=JSON.parse(await ui.downloads[0].text());assert.equal(recovered.medication.record.model.coefficient,3);assert.equal(recovered.invalidValues[0][1],'essai invalide');assert.equal('patient' in recovered,false);
 ui.run('compareStored()');await ui.get('reload-conflict').onclick();await ui.get('confirm-reload').onclick();assert.equal(ui.run('draft.record.model.coefficient'),4);assert.equal(ui.get('storage-notice').hidden,true);
});
test('notification sans brouillon : administration et lecteur adoptent la version enregistrée',async()=>{
 const ui=await runtime();externalSave(ui);assert.equal(ui.run("state.records.find(r=>r.id==='propofol').model.coefficient"),4);assert.equal(ui.get('storage-notice').hidden,true);
});
test('toutes les confirmations refusent une écriture externe survenue pendant leur ouverture',async()=>{
 for(const operation of ['fiche','ampoule','repères','import','reset','restauration']){
  const ui=await runtime();ui.clickScreen('administration');let button;
  if(operation==='fiche'){ui.run("selectRecord('magnesium');draft.record.name+=' essai';saveDialog()");button='confirm-save';}
  if(operation==='ampoule'){ui.run("setView('stocks');ampEditor.draft.stock.presentation+=' essai';ampEditor.save()");button='amp-confirm-save';}
  if(operation==='repères'){ui.run("setView('references');referenceEditor.draft.months[0].tam=60;referenceEditor.save()");button='reference-confirm-save';}
  if(operation==='import'){ui.run('importText(JSON.stringify(newState()))');button='confirm-import';}
  if(operation==='reset'){ui.run('settingsDialog()');await ui.get('reset-btn').onclick();button='confirm-reset';}
  if(operation==='restauration'){ui.run("selectRecord('magnesium');draft.record.name+=' essai';saveDialog()");await ui.get('confirm-save').onclick();ui.run('restoreDialog(state.history[0].id)');button='confirm-restore';}
  const saved=externalSave(ui);await ui.get(button).onclick();assert.equal(ui.mem.get(STORAGE_KEY),saved,operation);assert.equal(ui.get('storage-notice').hidden,false,operation);
  if(operation==='fiche')assert.equal(ui.run('draft.record.name.endsWith(\' essai\')'),true);
  if(operation==='ampoule')assert.equal(ui.run('ampEditor.dirty()'),true);
  if(operation==='repères')assert.equal(ui.run('referenceEditor.dirty()'),true);
 }
});
test('import invalide ou annulé : ni stockage ni brouillon remplacés ; import confirmé actualise le lecteur',async()=>{
 const ui=await runtime();ui.run("selectRecord('propofol');draft.record.name='Brouillon fictif'");
 const bad=newState();bad.reviews.propofol.status='reviewed';assert.throws(()=>ui.run('importText('+JSON.stringify(JSON.stringify(bad))+')'),/relecteur/);
 assert.equal(ui.mem.size,0);assert.equal(ui.run('draft.record.name'),'Brouillon fictif');
 const source=newState();source.records.find(r=>r.id==='propofol').name='Nom importé';
 ui.run('importText('+JSON.stringify(JSON.stringify(source))+')');ui.get('dialog').close();assert.equal(ui.mem.size,0);assert.equal(ui.run('draft.record.name'),'Brouillon fictif');
 ui.run('importText('+JSON.stringify(JSON.stringify(source))+')');await ui.get('confirm-import').onclick();assert.equal(ui.run('draft.record.name'),'Nom importé');assert.ok(ui.mem.has(STORAGE_KEY));
});
test('reprise GitHub : aperçu annulable, sauvegardes préalables et conflit refusé',async()=>{
 const ui=await runtime(),old=defaultConfiguration(),source=JSON.stringify(old);ui.run('importText('+JSON.stringify(source)+')');assert.equal(ui.mem.size,0);ui.get('dialog').close();assert.equal(ui.mem.size,0);
 ui.run('importText('+JSON.stringify(source)+')');const saved=externalSave(ui);await ui.get('confirm-legacy-import').onclick();assert.equal(ui.mem.get(STORAGE_KEY),saved);assert.equal(ui.mem.size,1);
 ui.get('dialog').close();ui.run('reloadReference();importText('+JSON.stringify(source)+')');await ui.get('confirm-legacy-import').onclick();
 assert.equal(ui.mem.size,3);assert.ok([...ui.mem.entries()].some(([k,v])=>k.endsWith('.github-source')&&v===source));assert.ok([...ui.mem.entries()].some(([k,v])=>k.endsWith('.atelier-before')&&v===saved));
 assert.equal(ui.run('state.history[0].name'),'Reprise des réglages GitHub');
});
test('sans Web Locks : lecture disponible, refus d’écriture et récupération du brouillon',async()=>{
 const ui=await runtime({locks:false});assert.equal(ui.run('state.records.length'),65);assert.equal(ui.get('storage-notice').hidden,false);
 ui.run("selectRecord('propofol');draft.record.name='Essai sans verrou';saveDialog()");await ui.get('confirm-save').onclick();assert.equal(ui.mem.size,0);assert.equal(ui.run('draft.record.name'),'Essai sans verrou');assert.match(ui.get('dialog-content').innerHTML,/navigateur/);
 ui.run('recoverDrafts()');assert.equal(JSON.parse(await ui.downloads[0].text()).medication.record.name,'Essai sans verrou');
});
test('sauvegarde locale refusée : récupération exacte, aucune réparation ni écriture automatique',async()=>{
 const bad=newState();bad.reviews.propofol.status='reviewed';const ui=await runtime({initial:bad}),raw=ui.mem.get(STORAGE_KEY);
 assert.equal(ui.get('global-error').hidden,false);ui.run('settingsDialog()');await ui.get('recover-unreadable').onclick();
 assert.equal(await ui.downloads[0].text(),raw);assert.equal(ui.mem.get(STORAGE_KEY),raw);
 ui.run("selectRecord('magnesium');draft.record.name+=' essai';saveDialog()");await ui.get('confirm-save').onclick();assert.equal(ui.mem.get(STORAGE_KEY),raw);assert.match(ui.get('dialog-content').innerHTML,/récupérée/);
});
test('une saisie d’ampoule invalide survit au rendu et figure dans la copie des brouillons',async()=>{
 const ui=await runtime();ui.run("setView('stocks')");const input=ui.get('amp-amount');input.tagName='INPUT';input.dataset.ampField='amount';input.setAttribute('data-number','');input.value='erreur fictive';
 ui.get('stocks-view').dispatchEvent({type:'input',target:input});ui.run('ampEditor.render();recoverDrafts()');
 assert.equal(ui.run("ampEditor.invalidValues.get('amount')"),'erreur fictive');assert.equal(ui.run('ampEditor.dirty()'),true);
 assert.deepEqual(JSON.parse(await ui.downloads[0].text()).ampouleInvalid,[['amount','erreur fictive']]);
});
test('attente de verrou : la confirmation reste ouverte et la navigation attend la fin de l’écriture',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;}),ui=await runtime({locks:{request:(_name,_options,action)=>gate.then(action)}});
 ui.clickScreen('administration');ui.run("selectRecord('propofol');draft.record.name='Enregistrement différé';saveDialog()");const saved=ui.get('confirm-save').onclick();
 assert.equal(ui.get('dialog').getAttribute('aria-busy'),'true');assert.equal(ui.mem.size,0);
 const cancel=new Event('cancel',{cancelable:true});ui.get('dialog').dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);
 ui.clickScreen('visualisation');assert.equal(ui.get('visualisation-screen').hidden,true);
 release();await saved;assert.equal(ui.get('dialog').open,false);assert.equal(ui.run('draft.record.name'),'Enregistrement différé');assert.ok(ui.mem.has(STORAGE_KEY));
});
