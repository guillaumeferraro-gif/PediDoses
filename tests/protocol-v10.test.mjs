import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultConfiguration,validateConfiguration,parseConfiguration,serializeConfiguration,configurationStorageKey,convertDoseUnit,convertDosePeriod,convertStockUnit} from '../dist/protocol-config.js';
import {createProtocolStore} from '../dist/protocol-store.js';
import {AdminAccess} from '../dist/admin-access.js';
import {ampouleStorageKey,defaultAmpoules} from '../dist/ampoules.js';
import {smurRecords} from '../dist/smur-data.js';
import {calculateRecordForPatient,resolvePatientContext} from '../dist/patient-calculator.js';
import {buildSimulationRow} from '../dist/simulation-data.js';
import {buildMedicationSheet} from '../dist/smur-sheets.js';
import {doseDefinition,currentDose,proposeDoseChange,commitDoseChange,changeDose,clearDoseSettings,withCurrentDose} from '../dist/dose-adjustments.js';
import {setPatientInput} from '../dist/patient-state.js';
const context=(weight=10,age=36)=>resolvePatientContext({weight:String(weight),age:String(age),ageUnit:'months'});
const records=validateConfiguration(defaultConfiguration());
const record=id=>records.find(r=>r.id===id);
const row=(config,id)=>config.records.find(r=>r.id===id);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const calc=(record,patient=context())=>calculateRecordForPatient(record,patient);
const settings=[
 ['adrenaline-ivc',.05,.1,1,'mcg',1,3],['alprostadil',5,25,100,'ng',1,1.5],
 ['dobutamine',1,5,20,'mcg',1,3],['dopamine',1,5,20,'mcg',1,3],
 ['isoprenaline',.02,.02,1,'mcg',1,1.2],['midazolam-ivc',1,2,6,'mcg',1,1.2],
 ['noradrenaline',.05,.1,1,'mcg',1,3],['nicardipine',.25,.5,2,'mcg',1,1.5],
 ['salbutamol-ivc',.1,.1,5,'mcg',1,.6],['sufentanil',.1,.2,1,'mcg',60,2],
];
test.beforeEach(()=>clearDoseSettings());

test('les dix doses de départ, pas, unités, seuils et débits correspondent aux paramètres fournis',()=>{
 assert.equal(records.filter(r=>r.adjustable).length,10);
 for(const [id,step,initial,warning,unit,period,rate] of settings){
  const r=record(id),d=currentDose(r,context());
  assert.equal(d.value,initial,id);assert.equal(d.step,step,id);assert.equal(d.warning,warning,id);assert.equal(d.max,null,id);
  assert.equal(r.model.unit,unit,id);assert.equal(r.model.periodMinutes,period,id);close(calc(r).exactRateMlH,rate);
 }
});

test('une augmentation au-delà du seuil est sans effet avant confirmation ; chaque nouvelle hausse requiert confirmation',()=>{
 const r=record('sufentanil'),c=context();
 for(let i=0;i<8;i++)assert.equal(changeDose(r,c,1),true);
 assert.equal(currentDose(r,c).value,1);
 const proposal=proposeDoseChange(r,c,1);assert.equal(proposal.value,1.1);assert.equal(proposal.requiresConfirmation,true);
 assert.equal(currentDose(r,c).value,1);assert.equal(commitDoseChange(r,c,proposal),false);
 assert.equal(currentDose(r,c).value,1);close(calc(withCurrentDose(r,c)).exactRateMlH,10);
 assert.equal(commitDoseChange(r,c,proposal,{confirmed:true}),true);
 assert.equal(currentDose(r,c).value,1.1);close(calc(withCurrentDose(r,c)).exactRateMlH,11);
 assert.equal(changeDose(r,c,1),false);assert.equal(currentDose(r,c).value,1.1);
 assert.equal(changeDose(r,c,1,{confirmed:true}),true);
 assert.equal(changeDose(r,c,-1),true);assert.equal(currentDose(r,c).value,1.1);
 assert.equal(changeDose(r,c,-1),true);assert.equal(currentDose(r,c).value,1);
 assert.equal(changeDose(r,c,1),false);
});

test('le seuil dépassable ne redevient pas un plafond caché dans le calcul ni dans la simulation',()=>{
 for(const id of ['isoprenaline','salbutamol-ivc','nicardipine']){
  const r=record(id),c=context(),d=doseDefinition(r,c);
  while(currentDose(r,c).value<=d.warning)changeDose(r,c,1,{confirmed:true});
  const adjusted=withCurrentDose(r,c),result=calc(adjusted),simulation=buildSimulationRow(r,c);
  close(result.coefficient,currentDose(r,c).value);
  close(simulation.result.exactRateMlH,result.exactRateMlH);
  close(result.concentration,calc(r).concentration);
 }
});

test('une confirmation devenue obsolète après changement de patient, de protocole ou de réglage est refusée',()=>{
 const r=record('adrenaline-ivc'),c=context(),proposal=proposeDoseChange(r,c,1);
 assert.throws(()=>commitDoseChange(r,context(12),proposal,{confirmed:true}),/patient ou les réglages/);
 assert.throws(()=>commitDoseChange({...r,model:{...r.model,doseStep:.1}},c,proposal),/patient ou les réglages/);
 changeDose(r,c,1);assert.throws(()=>commitDoseChange(r,c,proposal),/patient ou les réglages/);
 const newer=proposeDoseChange(r,c,1);clearDoseSettings();assert.throws(()=>commitDoseChange(r,c,newer),/patient ou les réglages/);
});

test('les réglages restent partagés entre vues puis reviennent au départ quand le patient change',()=>{
 const r=record('sufentanil'),input={weight:'10',age:'36',ageUnit:'months'};
 setPatientInput(input,'test');changeDose(r,context(),1);
 assert.equal(buildSimulationRow(r,context()).dose,'3 mcg/h');close(calc(withCurrentDose(r,context())).exactRateMlH,3);
 setPatientInput(input,'other-tab');assert.equal(currentDose(r,context()).value,.3);
 setPatientInput({...input,weight:'11'},'test');assert.equal(currentDose(r,context(11)).value,.2);
 changeDose(r,context(11),1);setPatientInput({...input,weight:'11',age:'37'},'test');assert.equal(currentDose(r,context(11,37)).value,.2);
});

test('salbutamol : la charge de 5 mcg/kg se calcule aux trois paliers, sur cinq minutes',()=>{
 for(const [kg,c]of [[20,100],[21,200],[41.999,200],[42,300]]){
  const r=record('salbutamol-charge'),result=calc(r,context(kg));
  close(result.dose,5*kg);close(result.concentration,c);close(result.volumeMl,5*kg/c);close(result.exactRateMlH,5*kg/c*12);
  assert.equal(buildSimulationRow(r,context(kg)).administration,'IVL sur 5 min');
 }
});

test('l’administration recalcule posologie, concentration, pas, seuil et voie dans les deux vues',()=>{
 const config=defaultConfiguration(),r=row(config,'sufentanil');
 r.model.coefficient=.3;r.model.doseStep=.2;r.model.warningCoefficient=2;r.ampoule.amount=100;r.model.mix={takeMl:2,addMl:8};r.protocol.route='PSE';
 const changed=validateConfiguration(config).find(r=>r.id==='sufentanil');
 close(calc(changed).concentration,2);close(calc(changed).hourlyAmount,3);close(calc(changed).exactRateMlH,1.5);
 assert.equal(doseDefinition(changed,context()).step,.2);assert.equal(buildSimulationRow(changed,context()).dose,'3 mcg/h');
 assert.match(buildMedicationSheet(changed).ceiling,/2 mcg\/kg\/h/);assert.equal(buildMedicationSheet(changed).administration,'PSE');
 changeDose(changed,context(),1);close(calc(withCurrentDose(changed,context())).exactRateMlH,2.5);
});

test('changer mg/mcg ou minute/heure conserve la dose physique et le débit, y compris pour le sufentanil',()=>{
 const config=defaultConfiguration(),r=row(config,'sufentanil');
 convertDoseUnit(r,'mg');convertStockUnit(r,'mg');convertDosePeriod(r,1);
 close(r.model.coefficient,.0002/60);close(r.model.doseStep,.0001/60);close(r.model.warningCoefficient,.001/60);
 let changed=validateConfiguration(config).find(r=>r.id==='sufentanil');
 close(calc(changed).exactRateMlH,2);assert.equal(buildSimulationRow(changed,context()).dose,'2 mcg/h');
 convertDosePeriod(r,60);convertDoseUnit(r,'mcg');convertStockUnit(r,'mcg');
 changed=validateConfiguration(config).find(r=>r.id==='sufentanil');close(calc(changed).exactRateMlH,2);close(r.ampoule.amount,50);
 assert.throws(()=>convertDoseUnit(r,'UI'),/Conversion non définie/);assert.throws(()=>convertDosePeriod(r,10),/Période/);
});

test('durées et dilutions modifiables : un prélèvement ne donne un débit qu’après définition du volume final',()=>{
 const config=defaultConfiguration(),r=row(config,'gentamicine');
 assert.equal(calc(record('gentamicine')).exactRateMlH,null);
 r.model.dilutionFactor=2;r.model.diluent='NaCl 0,9 %';r.protocol.durationMinutes=10;
 let changed=validateConfiguration(config).find(r=>r.id==='gentamicine');
 close(calc(changed).withdrawalMl,2.5);close(calc(changed).volumeMl,5);close(calc(changed).exactRateMlH,30);
 assert.match(buildMedicationSheet(changed).doseRows[0].volume,/0,5 mL\/kg\/dose après dilution/);
 assert.equal(buildSimulationRow(changed,context()).rate,'30,0 mL/h');
 delete r.model.dilutionFactor;r.model.mix={takeMl:5,addMl:5};
 changed=validateConfiguration(config).find(r=>r.id==='gentamicine');close(calc(changed).volumeMl,5);
 const calcium=row(config,'calcium-gluconate');calcium.model.dilutionFactor=2;calcium.protocol.durationMinutes=20;
 const cr=validateConfiguration(config).find(r=>r.id==='calcium-gluconate');close(calc(cr).withdrawalMl,5);close(calc(cr).volumeMl,10);close(calc(cr).exactRateMlH,30);
});

test('paramètres spécifiques : âge, prises et arrondi, dose fixe, glucose associé et durée clonazépam',()=>{
 const config=defaultConfiguration();
 Object.assign(row(config,'amoxicilline-clavulanique').model,{dailyCoefficient:90,divisionsPerDay:3,roundDoseUpTo:10});
 row(config,'suxamethonium').model.tiers[0].maxAgeMonthsExclusive=24;
 row(config,'tranexamique-ivc').model.youngerFinalConcentration=20;
 row(config,'insuline-glucose').model.glucoseConcentrationMgMl=50;
 row(config,'clonazepam-ivc').model.durationHours=3;
 row(config,'propofol').model.maximumDose=10;
 const rr=validateConfiguration(config),find=id=>rr.find(r=>r.id===id);
 close(calc(find('amoxicilline-clavulanique'),context(12.34)).dose,380);
 close(calc(find('suxamethonium'),context(10,23)).dose,20);
 close(calc(find('tranexamique-ivc')).exactRateMlH,1);
 close(calc(find('insuline-glucose')).mass,2500);assert.equal(buildSimulationRow(find('insuline-glucose'),context()).rateLabel,'Débit G5 %');
 close(calc(find('clonazepam-ivc')).exactRateMlH,2);assert.match(buildMedicationSheet(find('clonazepam-ivc')).administration,/3 h/);
 close(calc(find('propofol')).dose,10);assert.match(buildMedicationSheet(find('propofol')).ceiling,/Plafond retenu.*10 mg/);
});

const digest=async code=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),n=>n.toString(16).padStart(2,'0')).join('');
const memoryStorage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,v)=>map.set(key,v)};};

test('code fixe : mauvais code refusé, écriture verrouillée, sauvegarde atomique et persistance sans patient',async()=>{
 const access=new AdminAccess(await digest('87654321')),storage=memoryStorage(),store=createProtocolStore({storage,access});
 const config=store.getConfiguration();row(config,'sufentanil').model.doseStep=.2;
 assert.throws(()=>store.apply(config),/code d’administration/);assert.equal(await access.unlock('00000000'),false);
 assert.equal(await access.unlock('87654321'),true);store.apply(config);
 assert.equal(store.getRecords().find(r=>r.id==='sufentanil').model.doseStep,.2);
 const reloaded=createProtocolStore({storage,access:new AdminAccess()});assert.equal(reloaded.getRecords().find(r=>r.id==='sufentanil').model.doseStep,.2);
 assert.deepEqual(Object.keys(JSON.parse(storage.getItem(configurationStorageKey))).sort(),['records','schemaVersion']);
 const snapshot=store.getConfiguration();row(snapshot,'sufentanil').model.coefficient=999;assert.equal(store.getRecords().find(r=>r.id==='sufentanil').model.coefficient,.2);
 const invalid=store.getConfiguration();row(invalid,'sufentanil').model.doseStep=-1;assert.throws(()=>store.apply(invalid),/strictement positif/);
 assert.equal(store.getRecords().find(r=>r.id==='sufentanil').model.doseStep,.2);
 storage.setItem=()=>{throw new Error('stockage indisponible');};row(config,'sufentanil').model.doseStep=.3;assert.throws(()=>store.apply(config),/stockage indisponible/);
 assert.equal(store.getRecords().find(r=>r.id==='sufentanil').model.doseStep,.2);
 access.lock();assert.throws(()=>store.reset(),/code d’administration/);
});

test('un déverrouillage en cours ne peut pas rouvrir une administration verrouillée ensuite',async()=>{
 const access=new AdminAccess(await digest('87654321'));const pending=access.unlock('87654321');access.lock();
 assert.equal(await pending,false);assert.equal(access.unlocked,false);
 for(const invalid of ['',null,123456,'65432','6543217'])assert.equal(await access.unlock(invalid),false);
});

test('export et import JSON conservent toutes les variables et refusent les structures corrompues',()=>{
 const config=defaultConfiguration();assert.deepEqual(parseConfiguration(serializeConfiguration(config)),config);
 const invalids=[
  c=>{c.records.pop();},c=>{c.records[1].id=c.records[0].id;},c=>{row(c,'sufentanil').model.coefficient=Infinity;},
  c=>{row(c,'sufentanil').model.doseStep=0;},c=>{row(c,'sufentanil').model.warningCoefficient=.1;},
  c=>{row(c,'sufentanil').model.periodMinutes=30;},c=>{row(c,'sufentanil').model.maximumCoefficient=null;},
  c=>{row(c,'sufentanil').model.stock={amount:5,unit:'mcg',volumeMl:1};},
  c=>{row(c,'sufentanil').ampoule.unit='UI';},c=>{row(c,'sufentanil').ampoule.declaredConcentration=999;},
  c=>{row(c,'sufentanil').model.finalConcentration=5;},c=>{row(c,'sufentanil').model.mix.addMl=-1;},
  c=>{row(c,'salbutamol-ivc').model.weightMixes[1].minWeightKg=22;},
  c=>{row(c,'suxamethonium').model.tiers[1].maxAgeMonthsExclusive=30;},
  c=>{row(c,'clonazepam-ivc').model.finalVolumeMl=.01;},
 ];
 for(const mutate of invalids){const next=structuredClone(config);mutate(next);assert.throws(()=>validateConfiguration(next));}
 assert.throws(()=>parseConfiguration('{"__proto__":{}}'),/interdite/);
});

test('les anciennes ampoules sont reprises sans perdre la nouvelle charge ni changer la dilution finale',()=>{
 const storage=memoryStorage(),items=defaultAmpoules(smurRecords).filter(r=>r.id!=='salbutamol-charge');
 items.find(r=>r.id==='adrenaline-ivc').amount=2;storage.setItem(ampouleStorageKey,JSON.stringify({items}));
 const store=createProtocolStore({storage,access:new AdminAccess()});assert.match(store.message,/Anciennes ampoules/);
 assert.equal(store.getRecords().length,65);const r=store.getRecords().find(r=>r.id==='adrenaline-ivc');
 close(r.model.mix.takeMl,.5);close(calc(r).concentration,20);close(calc(r).exactRateMlH,3);
 storage.setItem(configurationStorageKey,'{invalid');const fallback=createProtocolStore({storage,access:new AdminAccess()});
 assert.match(fallback.message,/incompatible/);assert.equal(fallback.getRecords().length,65);
});
