import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createDocument,descendants} from './helpers/dom.mjs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const {document,window}=createDocument(html);globalThis.document=document;globalThis.window=window;
const byId=id=>document.getElementById(id);
const {adminAccess}=await import('../dist/admin-access.js');
adminAccess.expectedDigest=createHash('sha256').update('654321').digest('hex');
await import('../dist/admin-ui.js');
await import('../dist/app.js');
await import('../dist/smur-ui.js');
await import('../dist/simulation-ui.js');
const {protocolStore}=await import('../dist/ampoules-ui.js');
const {currentDose,changeDose,clearDoseSettings}=await import('../dist/dose-adjustments.js');
const {doseControls}=await import('../dist/dose-controls.js');
const {resolvePatientContext}=await import('../dist/patient-calculator.js');
const login=async code=>{byId('admin-code').value=code;await byId('admin-login').emit('submit');};
const drug=id=>protocolStore.getRecords().find(r=>r.id===id);
const adminRow=id=>byId('admin-table-body').children.find(r=>r.dataset.recordId===id);
const field=(root,label)=>descendants(root).find(e=>e.tagName==='LABEL'&&e._text===label)?.children[0];

test('interface administration : verrou, édition, sauvegarde et recalcul effectifs dans les deux vues',async()=>{
 byId('quick-weight').value='10';byId('quick-age').value='3';await byId('quick-weight').emit('input');
 assert.equal(byId('simulation-weight').value,'10');
 await byId('ampoules-tab').emit('click');
 await login('000000');assert.equal(adminAccess.unlocked,false);assert.equal(byId('admin-unlocked').hidden,true);
 await login('654321');assert.equal(adminAccess.unlocked,true);assert.equal(byId('admin-table-body').children.length,67);
 const start=field(adminRow('sufentanil'),'Départ par kg');assert.ok(start);start.value='0,3';await start.emit('input');
 assert.equal(drug('sufentanil').model.coefficient,.2);
 await byId('admin-save').emit('click');assert.equal(drug('sufentanil').model.coefficient,.3);assert.match(byId('admin-status').textContent,/enregistrés/);
 assert.equal(byId('admin-save').disabled,true);
 const quick=descendants(byId('quick-groups')).find(e=>e.dataset?.recordId==='sufentanil');
 const simulation=descendants(byId('simulation-list')).find(e=>e.dataset?.recordId==='sufentanil');
 assert.match(descendants(quick).find(e=>e.className==='dose-values').textContent,/3 mL\/h/);
 assert.match(descendants(simulation).find(e=>e.className==='sim-list-values').textContent,/3 mcg\/h/);
 const broken=field(adminRow('sufentanil'),'Pas (unité de posologie)');broken.value='-1';await broken.emit('input');await byId('admin-save').emit('click');
 assert.match(byId('admin-status').textContent,/refusé/);assert.equal(drug('sufentanil').model.doseStep,.1);
 window.confirm=()=>false;await byId('quick-tab').emit('click');assert.equal(adminAccess.unlocked,true);assert.equal(byId('ampoules-tab').getAttribute('aria-selected'),'true');
 window.confirm=()=>true;await byId('quick-tab').emit('click');assert.equal(adminAccess.unlocked,false);assert.equal(byId('admin-table-body').children.length,0);
 assert.equal(byId('quick-tab').getAttribute('aria-selected'),'true');
});

test('interface détails : tous les médicaments ouvrent leurs paramètres, code exigé à la réouverture',async()=>{
 await byId('ampoules-tab').emit('click');assert.equal(byId('admin-login').hidden,false);await login('654321');
 for(const tr of [...byId('admin-table-body').children]){
  const detail=descendants(tr).find(e=>e.tagName==='BUTTON'&&e.textContent==='Détails');await detail.emit('click');
  assert.equal(byId('admin-editor').open,true,tr.dataset.recordId);assert.ok(byId('admin-editor-fields').children.length);
  await byId('admin-editor-close').emit('click');assert.equal(byId('admin-editor').open,false);
 }
 const daily=field(adminRow('amoxicilline-clavulanique'),'Dose par kg et par jour');assert.ok(daily);assert.equal(daily.value,80);
 assert.equal(field(adminRow('suxamethonium'),'Départ par kg'),undefined);
 await byId('admin-lock').emit('click');assert.equal(adminAccess.unlocked,false);
});

test('bouton + : annulation conserve le débit, confirmation applique la hausse et affiche le dépassement',async()=>{
 clearDoseSettings();const r=drug('sufentanil'),c=resolvePatientContext({weight:'10',age:'3'});
 while(currentDose(r,c).value<1)changeDose(r,c,1);
 let confirmations=0;window.confirm=()=>{confirmations++;return false;};
 let controls=doseControls(r,c,'test'),plus=descendants(controls).find(e=>e.textContent==='+');
 await plus.emit('click');assert.equal(confirmations,1);assert.equal(currentDose(r,c).value,1);
 window.confirm=()=>{confirmations++;return true;};await plus.emit('click');assert.equal(currentDose(r,c).value,1.1);
 controls=doseControls(r,c,'test');assert.match(controls.textContent,/Dépassement confirmé/);
 assert.equal(doseControls(drug('clonazepam-ivc'),c,'test'),null);
 assert.doesNotMatch(doseControls(drug('morphine-ivc'),c,'test').textContent,/\+/);
});
