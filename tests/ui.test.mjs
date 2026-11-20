// Script-level interaction checks. This is not a browser or visual layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
class Element {
 constructor(){this.value='';this.dataset={};this.innerHTML='';this.checked=false;this.hidden=false;this.open=false;this.listeners={};this.classList={add(){},remove(){},toggle(){}};}
 addEventListener(name,fn){this.listeners[name]=fn;} dispatchEvent(event){this.listeners[event.type]?.(event);return !event.defaultPrevented;} querySelectorAll(){return [];} querySelector(){return new Element();} insertAdjacentHTML(_,s){this.innerHTML+=s;} setAttribute(){} removeAttribute(){} focus(){} scrollIntoView(){} showModal(){this.open=true;} close(){this.open=false;} closest(){return this;}
}
async function runtime(){
 const file=new URL('../dist/app.js',import.meta.url);let source=await readFile(file,'utf8');const bindings={};
 for(const match of source.matchAll(/import \{([^}]+)\} from '([^']+)';/g)){const mod=await import(new URL(match[2],file));for(const name of match[1].split(',').map(x=>x.trim()))bindings[name]=mod[name];}
 source=source.replace(/^import .*;\n/gm,'');const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},data=new Map();get('category').value='all';
 const doc=new Element();doc.getElementById=get;globalThis.document=doc;
 const ctx=vm.createContext({...bindings,document:doc,window:new Element(),localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},crypto:webcrypto,structuredClone,console,Intl,Event,CustomEvent,setTimeout:()=>0,clearTimeout(){},innerWidth:1200,matchMedia:()=>({matches:false})});
 vm.runInContext(source,ctx);return {ctx,nodes,get,run:code=>vm.runInContext(code,ctx)};
}
test('toutes les fiches rendent six cartes, sans erreur de script ni identifiant HTML en double',async()=>{
 const ui=await runtime();const ids=ui.run('state.records.map(r=>r.id)');
 for(const id of ids){ui.run(`selected=${JSON.stringify(id)};resetDraft();renderAll();`);const html=ui.get('editor-form').innerHTML;
  assert.equal((html.match(/class="form-section"/g)||[]).length,6,id);
  const fields=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(fields).size,fields.length,'duplicate HTML id '+id);
  for(const title of ['Posologie','Options','Conditions particulières','Préparation','Administration','Relecture'])assert.ok(html.includes('<strong>'+title+'</strong>'),title);
 }
});
test('les options masquent leurs champs et les affichent lorsqu’elles sont activées',async()=>{
 const ui=await runtime();ui.run("selected='propofol';resetDraft();renderAll();");assert.ok(!ui.get('editor-form').innerHTML.includes('id="panel-multiple"'));assert.ok(!ui.get('editor-form').innerHTML.includes('id="panel-adjustment"'));
 ui.run("setMultipleDoses(draft.record,true);renderEditor();");assert.ok(ui.get('editor-form').innerHTML.includes('id="panel-multiple"'));
 ui.run("setMultipleDoses(draft.record,false);draft.record.model.adjustmentStatus='enabled';draft.record.model.doseStep=0.5;renderEditor();");assert.ok(ui.get('editor-form').innerHTML.includes('id="panel-adjustment"'));assert.ok(ui.get('preview-result').innerHTML.includes('data-adjust="1"'));
});
test('nouveau médicament : nom, dose, enregistrement puis fiche visible dans la liste',async()=>{
 const ui=await runtime();ui.run("newMedication();draft.record.name='Nouveau test';draft.record.model.unit='mg';draft.record.model.coefficient=1;renderEditor();saveDialog();");ui.get('confirm-save').onclick();assert.equal(ui.run('state.records.length'),66);assert.ok(ui.get('med-list').innerHTML.includes('Nouveau test'));assert.ok(ui.get('preview-result').innerHTML.includes('Aucune ampoule affectée'));
});
test('abandonner une création vierge revient à une fiche existante',async()=>{
 const ui=await runtime();ui.run('newMedication();');ui.get('discard-btn').onclick();ui.get('discard-and-go').onclick();assert.equal(ui.run('state.records.length'),65);assert.ok(ui.run('state.records.some(r=>r.id===selected)'));
});
test('dose et préparation : champs de seuil partagés sans doublon d’identifiant',async()=>{
 const ui=await runtime();ui.run("selected='propofol';resetDraft();setPatientRule(draft.record,'dose',true);draft.record.patientRules.bands[0].until=12;draft.record.patientRules.bands[1].doses[0].coefficient=1;setPatientRule(draft.record,'preparation',true);renderEditor();");
 const html=ui.get('editor-form').innerHTML,ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.ok(html.includes('range-boundary-dose'));assert.ok(html.includes('range-boundary-prep'));
});
