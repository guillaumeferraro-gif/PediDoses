import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,draftFor,commitSave,STORAGE_KEY,clone} from '../dist/domain.js';
import {createStateStore,draftRecovery,referenceDifferences} from '../dist/state-store.js';

export function serialLocks(){
 let tail=Promise.resolve();return {request(name,options,action){assert.equal(options.mode,'exclusive');const result=tail.then(action);tail=result.catch(()=>{});return result;}};
}
function setup(){const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)},locks=serialLocks();return {mem,storage,locks,a:createStateStore(storage,{locks}),b:createStateStore(storage,{locks})};}
function edit(s,id='propofol'){const d=draftFor(s,id);d.record.name+=' corrigé';return commitSave(s,d);}
test('deux écritures simultanées : une seule réussit, même sur des fiches différentes',async()=>{
 const {a,b,mem}=setup(),sa=a.read(),sb=b.read(),nextA=edit(sa),nextB=edit(sb,'magnesium');
 const results=await Promise.allSettled([a.save(nextA),b.save(nextB)]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'state-conflict');
 const saved=JSON.parse(mem.get(STORAGE_KEY));assert.equal(saved.records.find(r=>r.id==='propofol').name,'Propofol corrigé');assert.equal(saved.history.length,1);
 assert.equal(nextB.records.find(r=>r.id==='magnesium').name,'Sulfate de magnésium corrigé');
});
test('import, reset et restauration ne peuvent pas remplacer une base obsolète',async()=>{
 for(const operation of ['import','reset','restore']){
  const {a,b,mem}=setup();const s=a.read();b.read();await a.save(edit(s));const saved=mem.get(STORAGE_KEY);
  await assert.rejects(b.save(newState()),{code:'state-conflict'},operation);assert.equal(mem.get(STORAGE_KEY),saved);
 }
});
test('la base est comparée sous verrou et le candidat est capturé avant attente',async()=>{
 const {a,b,mem}=setup();const s=a.read();b.read();const candidate=edit(s);const p=a.save(candidate);candidate.records[0].name='Mutation tardive';await p;
 assert.notEqual(JSON.parse(mem.get(STORAGE_KEY)).records[0].name,'Mutation tardive');assert.equal(b.changed(),true);
 const latest=b.read();await b.save(edit(latest,'magnesium'));assert.equal(a.changed(),true);
});
test('une confirmation ouverte garde sa base même si le lecteur a été rafraîchi',async()=>{
 const {a,b,mem}=setup();const old=a.read(),token=a.token();b.read();await b.save(edit(old));a.read();
 const raw=mem.get(STORAGE_KEY);await assert.rejects(a.save(edit(old,'magnesium'),{expectedBase:token}),{code:'state-conflict'});assert.equal(mem.get(STORAGE_KEY),raw);
});
test('quota plein, verrou indisponible et API absente conservent la base et les données',async()=>{
 const {storage,locks}=setup();const a=createStateStore(storage,{locks}),s=a.read(),base=a.token();storage.setItem=()=>{throw Error('Quota plein');};
 await assert.rejects(a.save(s),/Quota plein/);assert.equal(a.token(),base);
 const unavailable=createStateStore(storage);assert.deepEqual(unavailable.read(),newState());await assert.rejects(unavailable.save(s),/navigateur/);
 const rejected=createStateStore(storage,{locks:{request:()=>Promise.reject(Error('Verrou refusé'))}});rejected.read();await assert.rejects(rejected.save(s),/Verrou refusé/);
});
test('validation et sauvegarde de récupération précèdent tout remplacement',async()=>{
 const {a,storage,mem}=setup(),s=a.read();await a.save(s);const before=mem.get(STORAGE_KEY),invalid=clone(s);invalid.reviews.propofol.status='reviewed';
 await assert.rejects(a.save(invalid));assert.equal(mem.get(STORAGE_KEY),before);
 const original=storage.setItem;storage.setItem=(k,v)=>{if(k!==STORAGE_KEY)throw Error('Copie impossible');original(k,v);};
 await assert.rejects(a.save(edit(s),{backups:[{key:STORAGE_KEY+'.backup.test',value:'source'}]}),/Copie impossible/);assert.equal(mem.get(STORAGE_KEY),before);
});
test('une copie de migration conserve le source et le référentiel précédent',async()=>{
 const {a,mem}=setup(),s=a.read();await a.save(s);const raw=mem.get(STORAGE_KEY);
 await a.save(edit(s),{backups:[{key:STORAGE_KEY+'.backup.source',value:'source historique'},{key:STORAGE_KEY+'.backup.before',value:raw}]});
 assert.equal(mem.get(STORAGE_KEY+'.backup.source'),'source historique');assert.equal(mem.get(STORAGE_KEY+'.backup.before'),raw);
});
test('comparaison et récupération des brouillons excluent le contexte patient',()=>{
 const s=newState(),next=edit(s),d=draftFor(s,'propofol');d.record.name='Brouillon';
 const recovery=draftRecovery({state:s,medication:d,patient:{age:'7',weight:'23'},invalidValues:[['record.model.coefficient','saisie à corriger']]});
 assert.equal('patient' in recovery,false);assert.equal(recovery.medication.record.name,'Brouillon');assert.equal(recovery.invalidValues[0][1],'saisie à corriger');
 assert.ok(referenceDifferences(s,next).some(c=>c.label.includes('Nom')&&c.after==='Propofol corrigé'));
});
