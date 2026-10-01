import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultConfiguration,validateConfiguration,upgradeConfiguration,parseConfiguration,configurationStorageKey,convertDoseUnit,convertStockUnit} from '../dist/protocol-config.js';
import {createProtocolStore} from '../dist/protocol-store.js';
import {AdminAccess} from '../dist/admin-access.js';
import {calculateRecordForPatient,resolvePatientContext} from '../dist/patient-calculator.js';
import {buildSimulationRow,simulationListContent} from '../dist/simulation-data.js';
import {buildMedicationSheet} from '../dist/smur-sheets.js';

const records=validateConfiguration(defaultConfiguration());
const record=id=>records.find(r=>r.id===id);
const row=(config,id)=>config.records.find(r=>r.id===id);
const context=(weight=10,age=36)=>resolvePatientContext({weight:String(weight),age:String(age),ageUnit:'months'});
const calc=(r,weight=10,age=36)=>calculateRecordForPatient(r,context(weight,age));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('triphosadénine : une fiche, deux doses et volumes, plafonds indépendants, préparation commune',()=>{
 assert.equal(records.filter(r=>r.id.startsWith('triphosadenine')).length,1);
 for(const kg of [.5,3,9.99,10,40,200]){
  const result=calc(record('triphosadenine'),kg);
  close(result.dose,Math.min(kg,10));close(result.secondDose.dose,Math.min(2*kg,20));
  close(result.volumeMl,result.dose/10);close(result.secondDose.volumeMl,result.secondDose.dose/10);
  assert.equal(result.concentration,result.secondDose.concentration);
 }
 const content=simulationListContent(buildSimulationRow(record('triphosadenine'),context(3)));
 assert.deepEqual(content.metrics.map(m=>[m.label,m.value]),[['1re dose','3 mg'],['Volume · 1re dose','0,30 mL'],['2e dose','6 mg'],['Volume · 2e dose','0,60 mL']]);
 const sheet=buildMedicationSheet(record('triphosadenine'));
 assert.equal(sheet.doseRows.length,2);assert.equal(sheet.preparations.length,1);assert.match(sheet.ceiling,/1re dose : 10 mg ; 2e dose : 20 mg/);
 const config=defaultConfiguration(),r=row(config,'triphosadenine');
 r.model.mix={takeMl:1,addMl:9};r.model.secondMaximumDose=12;
 convertDoseUnit(r,'g');convertStockUnit(r,'g');
 const result=calc(validateConfiguration(config).find(r=>r.id==='triphosadenine'),8);
 close(result.dose,.008);close(result.secondDose.dose,.012);
 close(result.volumeMl,8);close(result.secondDose.volumeMl,12);
});

test('magnésium : 50 mL finaux à tout poids, plafond de 2 g et prélèvement maximal de 13,333… mL',()=>{
 for(const kg of [.5,10,39.999,40,200]){
  const result=calc(record('magnesium'),kg);
  close(result.dose,Math.min(50*kg,2000));close(result.withdrawalMl,result.dose/150);
  close(result.volumeMl,50);close(result.withdrawalMl+result.addMl,50);
  close(result.concentration,result.dose/50);close(result.exactRateMlH,150);
 }
 const max=calc(record('magnesium'),200);close(max.withdrawalMl,2000/150);close(max.addMl,50-2000/150);
 const content=simulationListContent(buildSimulationRow(record('magnesium'),context(40)));
 assert.match(content.dilution,/13,33 mL de produit \+ 36,67 mL NaCl 0,9 %/);assert.match(content.dilutionDetail,/50,00 mL/);
 const config=defaultConfiguration(),r=row(config,'magnesium');r.model.finalVolumeMl=40;r.ampoule.amount=1;
 const updated=calc(validateConfiguration(config).find(r=>r.id==='magnesium'),40);
 close(updated.withdrawalMl,20);close(updated.addMl,20);close(updated.exactRateMlH,120);
 r.model.finalVolumeMl=10;assert.throws(()=>validateConfiguration(config),/prélèvement dépasse/);
});

test('lévétiracétam : arrondi du diluant, dose plafonnée et concentration réelle entre 10 et 15 mg/mL',()=>{
 for(const [kg,dose,draw,diluent,total]of [[.5,20,.2,1.2,1.4],[10,400,4,23,27],[12.34,493.6,4.936,28,32.936],[75,3000,30,170,200],[200,3000,30,170,200]]){
  const result=calc(record('levetiracetam'),kg);
  close(result.dose,dose);close(result.withdrawalMl,draw);close(result.addMl,diluent);close(result.volumeMl,total);
  close(result.concentration,dose/total);close(result.exactRateMlH,total*12);
 }
 for(let i=0;i<=1995;i++){
  const result=calc(record('levetiracetam'),.5+i/10);
  assert.ok(result.concentration>=10-1e-9&&result.concentration<=15+1e-9);
  close(result.dose,result.concentration*result.volumeMl);
  close(result.addMl*10,Math.round(result.addMl*10));
 }
 const content=simulationListContent(buildSimulationRow(record('levetiracetam'),context()));
 assert.match(content.dilution,/4,00 mL de produit \+ 23,00 mL NaCl 0,9 %/);assert.match(content.dilutionDetail,/27,00 mL/);
});

test('les paramètres de dilution du lévétiracétam sont modifiables, convertibles et validés',()=>{
 const config=defaultConfiguration(),r=row(config,'levetiracetam');
 convertDoseUnit(r,'g');convertStockUnit(r,'g');
 let updated=calc(validateConfiguration(config).find(r=>r.id==='levetiracetam'));
 close(updated.dose,.4);close(updated.volumeMl,27);close(updated.addMl,23);
 r.model.targetFinalConcentration=.012;r.ampoule.amount=.25;
 updated=calc(validateConfiguration(config).find(r=>r.id==='levetiracetam'));
 close(updated.withdrawalMl,8);close(updated.addMl,26);close(updated.volumeMl,34);
 for(const mutate of [m=>{m.minimumFinalConcentration=20;},m=>{m.fineDiluentRoundingMl=2;},m=>{m.targetFinalConcentration=0;},m=>{m.minimumFinalConcentration=15;m.fineDiluentRoundingMl=1;},m=>{m.mix={takeMl:1,addMl:9};}]){
  const invalid=defaultConfiguration();mutate(row(invalid,'levetiracetam').model);assert.throws(()=>validateConfiguration(invalid));
 }
 const diluteStock=defaultConfiguration();row(diluteStock,'levetiracetam').ampoule.amount=25;assert.throws(()=>validateConfiguration(diluteStock),/Plage de concentration impossible/);
});

test('kétamine sans plafond, midazolam IJ à 10 mg et retrait du seul atracurium bolus',()=>{
 close(calc(record('ketamine-analgesie'),200).dose,100);close(calc(record('ketamine-intubation'),200).dose,400);
 for(const id of ['ketamine-analgesie','ketamine-intubation']){
  assert.equal(calc(record(id),200).maximumApplied,false);assert.equal(buildMedicationSheet(record(id)).pendingCeiling,null);
  assert.equal(buildSimulationRow(record(id),context(200)).result.dose,calc(record(id),200).dose);
 }
 for(const [kg,dose]of [[10,3],[33,9.9],[34,10],[200,10]]){
  const result=calc(record('midazolam-ij'),kg);close(result.dose,dose);close(result.volumeMl,dose/5);
 }
 assert.equal(record('midazolam-ij').ampoule.amount,5);assert.equal(record('midazolam-ij').ampoule.volumeMl,1);
 assert.deepEqual(buildMedicationSheet(record('midazolam-ij')).questions,[]);
 assert.equal(record('atracurium-bolus'),undefined);assert.ok(record('atracurium-ivc'));close(calc(record('atracurium-ivc')).exactRateMlH,5);
});

test('morphine titration et propofols : IVL sans débit ni durée ; pas de critère d’arrêt ajouté',()=>{
 for(const id of ['morphine-titration','propofol','propofol-lisa']){
  const r=record(id),result=calc(r),sheet=buildMedicationSheet(r),simulation=buildSimulationRow(r,context());
  assert.equal(sheet.administration,'IVL');assert.equal(simulation.administration,'IVL');
  assert.equal(result.exactRateMlH,null);assert.equal(result.rateMlH,null);
  assert.equal(simulationListContent(simulation).metrics.some(m=>m.type==='rate'),false);
  assert.deepEqual(sheet.questions,[]);
 }
 const r=record('morphine-titration');assert.doesNotMatch(JSON.stringify([r.protocol,buildMedicationSheet(r)]),/critère|arrêt|jusqu’à analgésie/i);
});

test('phénobarbital : palier inclusif à un mois, plafond conservé, poudre sans volume ni dilution affichée',()=>{
 for(const [age,dose]of [[0,200],[.999,200],[1,150],[36,150]])close(calc(record('phenobarbital'),10,age).dose,dose);
 for(const age of [0,1,36]){
  const result=calc(record('phenobarbital'),200,age);close(result.dose,600);
  for(const key of ['volumeMl','withdrawalMl','concentration','stockConcentration','exactRateMlH','rateMlH'])assert.equal(result[key],null,key);
 }
 const sheet=buildMedicationSheet(record('phenobarbital')),content=simulationListContent(buildSimulationRow(record('phenobarbital'),context()));
 assert.match(sheet.presentation,/poudre injectable/);assert.deepEqual(sheet.preparations,[]);assert.deepEqual(sheet.questions,[]);
 assert.equal(sheet.administration,'IVL sur 20 min');assert.equal(content.dilution,'');
 assert.deepEqual(content.metrics.map(m=>m.type),['dose']);assert.doesNotMatch(JSON.stringify([sheet,content]),/IDE|à préciser|à confirmer/);
});

// Minimal former schema with its two retired records, old preparation fields and local overrides.
function previousConfiguration(){
 const config=defaultConfiguration();config.schemaVersion=1;
 const first=row(config,'triphosadenine'),second=structuredClone(first);
 second.id='triphosadenine-2';second.ampoule.id=second.id;second.model.coefficient=2;second.model.maximumDose=20;
 for(const r of [first,second]){delete r.model.secondCoefficient;delete r.model.secondMaximumDose;}
 const bolus=structuredClone(first);bolus.id='atracurium-bolus';bolus.ampoule.id=bolus.id;
 config.records.push(second,bolus);
 row(config,'sufentanil').model.doseStep=.2;row(config,'cafeine').ampoule.amount=40;
 row(config,'ketamine-analgesie').model.pendingCeiling=80;row(config,'ketamine-analgesie').model.maximumDose=80;
 row(config,'propofol').protocol.durationMinutes=5;row(config,'propofol').protocol.administrationNote='Ancienne durée';
 row(config,'midazolam-ij').ampoule.volumeMl=5;row(config,'midazolam-ij').model.maximumDose=null;
 for(const id of ['magnesium','phenobarbital','levetiracetam']){
  const r=row(config,id);delete r.model.preparationMode;
  r.model.volumeKind='withdrawal';r.model.dilutionFactor=2;r.protocol.dilution='Ancienne dilution';r.protocol.questions=['Ancienne question'];
 }
 row(config,'phenobarbital').ampoule.volumeMl=1;row(config,'phenobarbital').ampoule.declaredConcentration=200;
 row(config,'phenobarbital').model.tiers=[{maxAgeMonthsExclusive:2,coefficient:20},{coefficient:15}];
 return config;
}

test('migration v0.10 : corrections appliquées sans perdre les autres réglages ni le schéma de deuxième dose',()=>{
 const old=previousConfiguration();
 const second=row(old,'triphosadenine-2');second.model.coefficient=2.5;second.model.maximumDose=25;convertDoseUnit(second,'g');
 const original=structuredClone(old),updated=upgradeConfiguration(old);assert.deepEqual(old,original);
 assert.equal(updated.schemaVersion,2);assert.equal(updated.records.length,65);
 assert.equal(row(updated,'sufentanil').model.doseStep,.2);assert.equal(row(updated,'cafeine').ampoule.amount,40);
 assert.equal(row(updated,'ketamine-analgesie').model.maximumDose,null);assert.equal(row(updated,'ketamine-analgesie').model.pendingCeiling,undefined);
 assert.equal(row(updated,'propofol').protocol.durationMinutes,null);assert.equal(row(updated,'propofol').protocol.administrationNote,'');
 assert.equal(row(updated,'phenobarbital').ampoule.volumeMl,null);assert.equal(row(updated,'phenobarbital').model.tiers[0].maxAgeMonthsExclusive,1);
 const rr=validateConfiguration(updated),find=id=>rr.find(r=>r.id===id);
 close(calc(find('triphosadenine')).secondDose.dose,25);close(calc(find('magnesium')).volumeMl,50);
 close(calc(find('midazolam-ij'),100).volumeMl,2);close(calc(find('levetiracetam')).volumeMl,27);
 assert.equal(calc(find('phenobarbital')).volumeMl,null);
 assert.deepEqual(parseConfiguration(JSON.stringify(old)),updated);
 const storage={getItem:key=>key===configurationStorageKey?JSON.stringify(old):null,setItem:()=>assert.fail('Aucune écriture sans déverrouillage')};
 const store=createProtocolStore({storage,access:new AdminAccess()});assert.match(store.message,/Corrections v0.11/);assert.deepEqual(store.getConfiguration(),updated);
 old.records.pop();assert.throws(()=>upgradeConfiguration(old),/incomplète/);
 const fresh=defaultConfiguration();row(fresh,'magnesium').model.finalVolumeMl=60;assert.deepEqual(upgradeConfiguration(fresh),fresh);
});
