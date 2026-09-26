import test from 'node:test';
import assert from 'node:assert/strict';
import {smurRecords} from '../dist/smur-data.js';
import {defaultAmpoules,applyAmpoules} from '../dist/ampoules.js';
import {calculateRecordForPatient,resolvePatientContext} from '../dist/patient-calculator.js';
import {buildMedicationSheet} from '../dist/smur-sheets.js';
import {buildSimulationRow,prepareSimulationRecords} from '../dist/simulation-data.js';
import {doseDefinition,nextDoseValue,recordWithDose,doseSteps} from '../dist/dose-adjustments.js';
const records=applyAmpoules(smurRecords,defaultAmpoules(smurRecords));
const record=id=>records.find(r=>r.id===id);
const patient=(weight=10,age=36)=>resolvePatientContext({weight:String(weight),age:age===null?'':String(age),ageUnit:'months'});
const calc=(id,weight=10,age=36)=>calculateRecordForPatient(record(id),patient(weight,age));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('calcium : expression distincte du sel et du volume de solution, plafonds avant conversion',()=>{
 for(const [weight,chloride,ml,gluconate] of [[5,100,1,2.5],[40,800,8,20],[50,1000,10,20],[70,1000,10,20]]) {
  assert.equal(calc('calcium-chlorure',weight).dose,chloride);
  assert.equal(calc('calcium-chlorure',weight).volumeMl,ml);
  assert.equal(calc('calcium-gluconate',weight).withdrawalMl,gluconate);
  assert.equal(calc('calcium-gluconate',weight).volumeMl,null);
  assert.equal(calc('calcium-gluconate',weight).mass,null);
 }
 assert.equal(record('calcium-chlorure').protocol.administration,'IVD');
});

test('amoxicilline/clavulanate : arrondi supérieur après division, sans double arrondi',()=>{
 for(const [weight,expected] of [[0.5,20],[0.75,20],[0.75001,30],[12,320],[12.00001,330],[12.34,330],[74.999,2000],[100,2000]]) assert.equal(calc('amoxicilline-clavulanique',weight).dose,expected,String(weight));
 assert.equal(record('amoxicilline-clavulanique').ampoule.amount,500);
 assert.match(record('amoxicilline-clavulanique').ampoule.presentation,/500 mg\/50 mg/);
});

test('insuline/G10 : plafonds indépendants à 50 et 100 kg, débit de glucose explicitement identifié',()=>{
 for(const [weight,insulin,glucose,rate] of [[10,1,50,100],[49,4.9,245,490],[50,5,250,500],[75,7.5,250,500],[100,10,250,500],[150,10,250,500]]) {
  const r=calc('insuline-glucose',weight);close(r.dose,insulin);close(r.volumeMl,glucose);close(r.exactRateMlH,rate);assert.equal(r.rateKind,'glucose');assert.equal(r.insulinWithdrawalMl,null);
 }
 const items=defaultAmpoules(smurRecords);const insulin=items.find(a=>a.id==='insuline-glucose');
 insulin.amount=1000;insulin.volumeMl=10;
 const configured=applyAmpoules(smurRecords,items).find(r=>r.id==='insuline-glucose');
 close(calculateRecordForPatient(configured,patient()).insulinWithdrawalMl,0.01);
 const row=buildSimulationRow(configured,patient());
 assert.equal(row.dose,'1 UI');assert.equal(row.volume,'50,00 mL');assert.equal(row.rateLabel,'Débit G10 %');
 assert.match(row.dilutionDetail,/0,01 mL d’insuline/);
});

test('triphosadénine : deux doses distinctes et plafonds indépendants',()=>{
 for(const [weight,first,second] of [[3,3,6],[10,10,20],[50,10,20]]) {
  assert.equal(calc('triphosadenine',weight).dose,first);assert.equal(calc('triphosadenine-2',weight).dose,second);
 }
});

test('plafonds confirmés et plafonds retirés restent cohérents dans les deux vues',()=>{
 const capped=[['clonazepam-bolus',1],['diazepam-ir',10],['phenobarbital',600],['levetiracetam',3000],['phenytoine',1000],['flumazenil',200],['naloxone',2000]];
 for(const [id,dose] of capped){assert.equal(calc(id,200).dose,dose,id);assert.equal(buildMedicationSheet(record(id)).pendingCeiling,null,id);}
 const simulation=prepareSimulationRecords(records);
 for(const id of ['etomidate','propofol','cafeine','sugammadex','glucose10']) {
  const r=simulation.find(r=>r.id===id);assert.equal(r.model.maximumDose,null,id);assert.equal(buildMedicationSheet(r).pendingCeiling,null,id);
  assert.equal(calculateRecordForPatient(r,patient(200)).maximumApplied,false,id);
 }
 assert.equal(calc('propofol-lisa',10).dose,5);assert.equal(calc('propofol-lisa',10).volumeMl,0.5);
 assert.equal(calc('atracurium-bolus',20).dose,10);assert.equal(calc('atracurium-bolus',20).volumeMl,10);
});

test('présentations et voies demandées : aucune confusion mcg/mg pour le sufentanil',()=>{
 for(const [id,amount,volume] of [['magnesium',1.5,10],['propofol',200,20],['suxamethonium',100,2],['levetiracetam',500,5],['flumazenil',1,10],['sugammadex',200,2],['naloxone',0.4,1],['sufentanil',50,10]]){
  assert.equal(record(id).ampoule.amount,amount,id);assert.equal(record(id).ampoule.volumeMl,volume,id);
 }
 assert.equal(record('sufentanil').ampoule.unit,'mcg');
 close(calc('sufentanil',10).stockConcentration,5);close(calc('sufentanil',10).concentration,1);close(calc('sufentanil',10).hourlyAmount,2);close(calc('sufentanil',10).exactRateMlH,2);
 assert.equal(buildSimulationRow(record('sufentanil'),patient()).dose,'2 mcg/h');
 for(const [id,route] of [['clonazepam-bolus','IVL sur 10 min'],['phenobarbital','IVL sur 20 min'],['levetiracetam','IVL sur 5 min'],['phenytoine','IVL sur 20 min'],['ssh','IVL sur 20 min'],['cafeine','IVL sur 20 min'],['suxamethonium','IVL']])assert.equal(record(id).protocol.administration,route,id);
 for(const id of ['clonazepam-bolus','clonazepam-ivc','salbutamol-nebulise','naloxone'])assert.doesNotMatch(buildMedicationSheet(record(id)).questions.join(' '),/solvant fourni|répétition/i);
 for(const id of ['cgr','pfc','cpa']){assert.equal(buildMedicationSheet(record(id)).administration,'');assert.equal(buildMedicationSheet(record(id)).questions.length,0);assert.equal(buildSimulationRow(record(id),patient()).rate,'—');}
});

test('Exacyl : bascule à dix ans sans imposer huit heures aux plus jeunes',()=>{
 assert.equal(calc('tranexamique-bolus',20,119.999).dose,400);
 assert.equal(calc('tranexamique-bolus',20,120).dose,1000);
 const child=calc('tranexamique-ivc',20,119.999), older=calc('tranexamique-ivc',20,120);
 close(child.hourlyAmount,40);assert.equal(child.exactRateMlH,null);assert.equal(child.concentration,null);assert.equal(child.prescribedDurationHours,undefined);
 const childRow=buildSimulationRow(record('tranexamique-ivc'),patient(20,119.999));
 assert.equal(childRow.dose,'40 mg/h');assert.equal(childRow.rate,'—');assert.match(childRow.dilution,/concentration finale à préciser/);
 close(older.hourlyAmount,125);close(older.exactRateMlH,2);assert.equal(older.prescribedDurationHours,8);
 assert.throws(()=>calc('tranexamique-ivc',20,null),/Âge nécessaire/);
});

test('salbutamol : trois dilutions, y compris les poids décimaux entre 41 et 42 kg',()=>{
 for(const [weight,concentration] of [[20.999,100],[21,200],[41,200],[41.999,200],[42,300]]){
  const r=calc('salbutamol-ivc',weight);assert.equal(r.concentration,concentration);close(r.exactRateMlH,0.1*weight*60/concentration);assert.equal(r.mixtureVolumeMl,50);
 }
 const items=defaultAmpoules(smurRecords),salbutamol=items.find(a=>a.id==='salbutamol-ivc');salbutamol.amount=10;
 const changed=applyAmpoules(smurRecords,items).find(r=>r.id==='salbutamol-ivc');
 for(const [weight,expected,take] of [[20,100,2.5],[21,200,5],[42,300,7.5]]){
  const r=calculateRecordForPatient(changed,patient(weight));assert.equal(r.concentration,expected);assert.equal(r.preparation.takeMl,take);
 }
});

test('morphine : concentration au seuil de 10 kg, sans blocage ni changement à trois mois',()=>{
 for(const age of [null,0,2.99,3,120]) {
  close(calc('morphine-ivc',9.99,age).hourlyAmount,199.8);close(calc('morphine-ivc',9.99,age).concentration,100);
  close(calc('morphine-ivc',10,age).hourlyAmount,200);close(calc('morphine-ivc',10,age).concentration,1000);
 }
});

test('réglages : toutes les perfusions et la charge de nicardipine attendent un pas explicite',()=>{
 assert.equal(records.filter(r=>r.adjustable).length,15);
 for(const r of records.filter(r=>r.category==='ivc')){
  const d=doseDefinition(r,patient());assert.ok(d);assert.equal(d.step,null);assert.throws(()=>nextDoseValue(d,d.initial,1),/Pas de réglage/);
 }
 assert.ok(Object.values(doseSteps).every(step=>step===null));
 assert.equal(doseDefinition(record('tranexamique-ivc'),patient(20,120)).unit,'mg/h');
 assert.equal(doseDefinition(record('tranexamique-ivc'),patient(20,null)).initial,null);
});

test('titration : le débit suit la posologie et la concentration reste constante',()=>{
 // Test increments are fixtures, not saved clinical defaults.
 for(const [id,value,expectedRate] of [['sufentanil',0.4,4],['morphine-ivc',40,0.4],['nicardipine',1,3],['salbutamol-ivc',0.2,1.2]]){
  const original=record(id), context=patient();
  const changed=recordWithDose(original,context,{value,mode:'coefficient'});
  const before=calculateRecordForPatient(original,context),after=calculateRecordForPatient(changed,context);
  close(after.concentration,before.concentration);close(after.exactRateMlH,expectedRate);
 }
 const clona=record('clonazepam-ivc'),context=patient(5);
 const changed=recordWithDose(clona,context,{value:0.05,mode:'coefficient'});
 const after=calculateRecordForPatient(changed,context);
 close(after.dose,0.25);close(after.preparedDose,0.5);close(after.concentration,0.5/6);close(after.exactRateMlH,0.5);
 for(const id of ['adrenaline-ivc','noradrenaline','dopamine','dobutamine']){
  const original=record(id),d=doseDefinition(original,context),modified=recordWithDose(original,context,{value:d.initial*2,mode:'coefficient'});
  close(calculateRecordForPatient(modified,context).exactRateMlH,10/3);
 }
 const tranex=recordWithDose(record('tranexamique-ivc'),patient(30,120),{value:100,mode:'hourly'});
 close(calculateRecordForPatient(tranex,patient(30,120)).exactRateMlH,1.6);
});

test('bornes des commandes : minima, plafonds de posologie et valeurs invalides',()=>{
 for(const [id,max] of [['isoprenaline',2],['salbutamol-ivc',2],['nicardipine',5],['nicardipine-charge',20]]) {
  const d=doseDefinition(record(id),patient());assert.equal(d.max,max);
  assert.equal(nextDoseValue(d,max,1,0.1),max);
  if(d.min>0)assert.equal(nextDoseValue(d,d.min,-1,0.1),d.min);
 }
 const d=doseDefinition(record('sufentanil'),patient());
 close(nextDoseValue(d,0.2,1,0.1),0.3);close(nextDoseValue(d,0.3,-1,0.1),0.2);
 for(const step of [0,-1,NaN,Infinity,null])assert.throws(()=>nextDoseValue(d,0.2,1,step));
 for(const value of [0,-1,NaN,Infinity])assert.throws(()=>recordWithDose(record('sufentanil'),patient(),{value,mode:'coefficient'}));
});
