import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newState,draftFor,commitSave,assignStock,createMedicationDraft} from '../dist/domain.js';
import {recordsFromState,withCurrentDose,calculateAllRecords} from '../dist/visual/data.js';
import {buildPrintRows,printPatientLabel,printAdministration} from '../dist/visual/print-data.js';
import {layoutPrintDocument,renderPrintDocument,PRINT,textWidth} from '../dist/visual/print-layout.js';
import {volumeText,numberText} from '../dist/engine/smur-sheets.js';
import {addDose} from '../dist/usage-options.js';
import {changeDose,clearDoseSettings} from '../dist/engine/dose-adjustments.js';
import {setPatientRule} from '../dist/patient-rules.js';

const ctx={weightKg:10,ageMonths:24,weightSource:'measured'};
const printMl=v=>volumeText(v).replace(/,00$/,'').replace(/(,\d)0$/,'$1');
function prepare(state=newState(),context=ctx,options){
 const records=recordsFromState(state),results=calculateAllRecords(records.map(r=>withCurrentDose(r,context)),context);
 const rows=buildPrintRows(records,results,context,options);
 return {records,results,rows,document:layoutPrintDocument(rows,{patient:printPatientLabel(context)})};
}

test('65 médicaments sur deux A4 portrait, chacun sur une seule ligne, sans texte hors cellule',()=>{
 assert.ok(PRINT.height>PRINT.width);
 for(const context of [null,...[.5,3,10,20,50,200].map(weightKg=>({...ctx,weightKg})),{...ctx,ageMonths:0},{...ctx,ageMonths:216},{...ctx,ageMonths:null}]){
  const {rows,document}=prepare(newState(),context),printed=document.pages.flatMap(p=>p.entries.filter(e=>e.kind==='medication'));
  assert.equal(rows.length,65);assert.equal(document.pages.length,2);assert.equal(printed.length,65);assert.equal(new Set(printed.map(r=>r.id)).size,65);
  for(const [index,page]of document.pages.entries()){
   assert.ok(page.contentBottom<=PRINT.height-PRINT.bottom);
   assert.notEqual(page.entries.at(-1).kind,'group');
   const texts=page.ops.filter(o=>o.type==='text').map(o=>o.text).join('\n');
   assert.doesNotMatch(texts,/ATELIER TEST|Précautions dans les fiches|plafond appliqué|[†*]/);
   assert.doesNotMatch(texts,/PediDoses|RECTO|VERSO|médicaments affichés|poids saisi|poids estimé/);
   assert.equal(page.ops[0].y,0);
   for(const op of page.ops.filter(o=>o.type==='text'))assert.ok(op.x+textWidth(op.text,op.size,op.bold)<=PRINT.width+.05,op.text);
  }
  for(const row of printed)for(const cell of row.cells){
   assert.equal(cell.lines.length,1,`${context?.weightKg} kg : ${row.id} : ${cell.text}`);
   assert.ok(cell.size>=7.5);assert.ok(textWidth(cell.lines[0],cell.size,cell.bold)<=cell.width+.05,row.id);
  }
 }
});
test('les doses et volumes imprimés viennent exactement des résultats de la visualisation',()=>{
 for(const weightKg of [3,10,20,50]){
  const {rows,results}=prepare(newState(),{...ctx,weightKg});
  for(const row of rows){
   const r=results.get(row.id);if(r.status!=='calculated')continue;
   for(const value of r.sequence||[r,...(r.secondDose?[r.secondDose]:[])]){
    if(value.dose!==null)assert.ok(row.cells[1].includes(`${value.unit==='mL'?printMl(value.dose):numberText(value.dose)} ${value.unit}`),row.id);
    if(value.hourlyAmount!==null)assert.ok(row.cells[1].includes(`${numberText(value.hourlyAmount)} ${value.unit}/h`),row.id);
    if(row.id==='cgr')assert.equal(row.cells[3],'Une poche maximum');
    else if(value.volumeMl!==null)assert.ok(row.cells[3].includes(`${printMl(value.volumeMl)} mL`),row.id);
    if(value.rateMlH!==null)assert.ok(row.cells[3].includes(`${numberText(value.rateMlH,1)} mL/h`),row.id);
   }
  }
 }
});
test('la sélection imprimée correspond aux fiches affichées et une sélection vide ne réutilise rien',()=>{
 const {rows,document}=prepare(newState(),ctx,{visibleIds:['propofol','propofol-lisa']});
 assert.deepEqual(rows.map(r=>r.id),['propofol','propofol-lisa']);assert.equal(document.pages.length,1);
 const empty=prepare(newState(),ctx,{visibleIds:[]});assert.equal(empty.document.count,0);assert.match(renderPrintDocument(empty.document),/Aucun médicament/);
});
test('pas de dose imprimée si ampoule absente ou âge indispensable manquant',()=>{
 const state=newState(),d=draftFor(state,'propofol');assignStock(state,d,null);
 const row=prepare(commitSave(state,d)).rows.find(r=>r.id==='propofol');assert.equal(row.spanMessage,true);assert.match(row.cells[1],/NON CALCULÉ.*ampoule/);assert.doesNotMatch(row.cells[1],/20 mg/);
 const noAge=draftFor(state,'propofol');setPatientRule(noAge.record,'dose',true);noAge.record.patientRules.axis='age';noAge.record.patientRules.bands[0].until=12;noAge.record.patientRules.bands[1].doses[0].coefficient=2;
 const missing=prepare(commitSave(state,noAge),{...ctx,ageMonths:null}).rows.find(r=>r.id==='propofol');assert.equal(missing.spanMessage,true);assert.match(missing.cells[1],/Âge/);
 const blank=prepare(state,null).rows.find(r=>r.id==='propofol');assert.match(blank.cells[1],/NON CALCULÉ/);
});
test('chaque dose successive demeure explicite même avec des doses identiques',()=>{
 let state=newState();const d=draftFor(state,'triphosadenine');addDose(d.record);d.record.doses.forEach(v=>{v.coefficient=1;v.maximumDose=10;});state=commitSave(state,d);
 const row=prepare(state).rows.find(r=>r.id===d.record.id);
 assert.equal(row.cells[1],'10 mg → 10 mg → 10 mg');assert.equal(row.cells[3],'1 mL → 1 mL → 1 mL');
});
test('les préparations suivent le seuil applicable et la présentation affectée',()=>{
 const state=newState(),d=draftFor(state,'propofol');setPatientRule(d.record,'preparation',true);d.record.patientRules.axis='weight';d.record.patientRules.bands[0].until=10;
 d.record.patientRules.bands[1].preparation={mix:{takeMl:1,addMl:9},diluent:'Diluant test'};const saved=commitSave(state,d);
 const below=prepare(saved,{...ctx,weightKg:9.9}).rows.find(r=>r.id==='propofol'),at=prepare(saved).rows.find(r=>r.id==='propofol');
 assert.match(below.cells[2],/Sans dilution/);assert.match(at.cells[2],/1 mL \+ 9 mL Diluant test/);assert.doesNotMatch(at.cells[2],/=/);assert.match(at.cells[3],/20 mL/);
 const assigned=draftFor(state,'propofol');assignStock(state,assigned,state.links['ketamine-analgesie']);const changed=prepare(commitSave(state,assigned)).rows.find(r=>r.id==='propofol');assert.match(changed.cells[2],/250 mg\/5 mL/);assert.equal(changed.cells[3],'0,4 mL');
});
test('un réglage temporaire de dose se retrouve dans l’impression sans changer la sauvegarde',()=>{
 clearDoseSettings({notify:false});const state=newState(),baseline=prepare(state),r=baseline.records.find(r=>r.id==='adrenaline-ivc');
 changeDose(r,ctx,1);const changed=prepare(state);assert.notEqual(changed.rows.find(x=>x.id===r.id).cells[3],baseline.rows.find(x=>x.id===r.id).cells[3]);assert.equal(state.records.find(x=>x.id===r.id).model.coefficient,r.model.coefficient);
 clearDoseSettings({notify:false});
});
test('insuline, prélèvement seul, poche et énergie gardent leurs significations distinctes',()=>{
 const {rows}=prepare(newState(),{...ctx,weightKg:200}),find=id=>rows.find(r=>r.id===id).cells;
 assert.match(find('insuline-glucose')[2],/Insuline : prélèvement à préciser/);assert.equal(find('insuline-glucose')[3],'G10% : 250 mL ; 500 mL/h');
 assert.match(find('gentamicine')[2],/Prélever/);assert.equal(find('gentamicine')[3],'À préciser');
 assert.match(find('cgr')[2],/volume sur l’étiquette/);assert.equal(find('cardioversion')[3],'—');assert.equal(find('cardioversion')[4],'—');
});
test('papier : le rappel d’une poche est renforcé uniquement pour un CGR de plus de 200 mL',()=>{
 const state=newState();
 for(const [weightKg,volume,enhanced] of [[19.9,'199 mL',false],[20,'200 mL',false],[20.1,'201 mL',true],[41,'410 mL',true]]){
  const {rows,document}=prepare(state,{...ctx,weightKg},{visibleIds:['cgr','pfc','cpa']});
  const cgr=rows.find(row=>row.id==='cgr');
  assert.equal(cgr.cells[1],volume);
  assert.equal(cgr.cells[2],'Vérifier le volume sur l’étiquette');
  assert.equal(cgr.cells[3],'Une poche maximum');
  const label=document.pages[0].ops.find(op=>op.type==='text'&&op.text==='Une poche maximum');
  assert.ok(label);
  assert.equal(label.fill==='#ffffff',enhanced);
  for(const row of rows.filter(row=>row.id!=='cgr')){
   assert.equal(row.highlightBagLimit,false);
   assert.match(row.cells[2],/max\. 1 poche/);
   assert.equal(row.cells[3],row.cells[1]);
  }
 }
});
test('les nouvelles fiches longues restent complètes : pages supplémentaires plutôt que texte coupé',()=>{
 let state=newState();const d=createMedicationDraft();d.record.name='Fiche supplémentaire';d.record.model.unit='mg';d.record.model.coefficient=1;d.record.protocol.administrationNote='Consigne complète à conserver. '.repeat(8);assignStock(state,d,state.links.propofol);state=commitSave(state,d);
 const {rows}=prepare(state),many=Array.from({length:4},(_,i)=>rows.map(r=>({...r,id:`${i}-${r.id}`}))).flat(),doc=layoutPrintDocument(many),printed=doc.pages.flatMap(p=>p.entries.filter(e=>e.id));
 assert.equal(doc.requiresExtraPages,true);assert.equal(printed.length,many.length);assert.ok(doc.pages.every(p=>p.contentBottom<=PRINT.height-PRINT.bottom));
 assert.ok(printed.filter(r=>r.name===d.record.name).every(r=>r.cells[4].text.includes('Consigne complète à conserver. '.repeat(7).trim())));
 assert.equal(renderPrintDocument(doc).includes('text-overflow'),false);
});
test('le document échappe les textes saisis et distingue poids saisi et estimé',()=>{
 const rows=[{id:'test',name:'<script>test</script>',category:'test',categoryLabel:'Test',cells:['<script>test</script>','1 mg','A & B','1 mL','"Texte"']}];
 const svg=renderPrintDocument(layoutPrintDocument(rows));assert.doesNotMatch(svg,/<script>/);assert.match(svg,/&lt;script&gt;/);assert.match(svg,/A &amp; B/);
 assert.match(printPatientLabel({...ctx,weightSource:'estimated'}),/poids estimé/);assert.match(printPatientLabel(ctx),/poids saisi/);assert.match(printPatientLabel(null),/aucun calcul/);
});
test('une consigne plus haute qu’une page empêche une impression tronquée',()=>{
 const rows=[{id:'long',name:'Fiche longue',category:'test',categoryLabel:'Test',cells:['Fiche longue','1 mg','Sans dilution','1 mL','Consigne à conserver. '.repeat(180)]}];
 const doc=layoutPrintDocument(rows);assert.equal(doc.blocked,true);assert.match(doc.error,/trop de texte/);assert.match(renderPrintDocument(doc),/Impression indisponible/);assert.doesNotMatch(renderPrintDocument(doc),/1 mg/);
});
test('le style d’impression cache les cartes sans les modifier et fixe A4 portrait',async()=>{
 const css=await readFile(new URL('../dist/visual/print.css',import.meta.url),'utf8'),ui=await readFile(new URL('../dist/visual/smur-ui.js',import.meta.url),'utf8');
 assert.match(css,/@page\{size:A4 portrait;margin:7mm\}/);assert.match(css,/#visualisation-screen>:not\(#quick-print-document\)/);assert.match(css,/\.print-sheet:last-child\{break-after:auto/);assert.doesNotMatch(ui,/printSnapshot|details\.open = true/);
});

test('les rappels généraux sont omis uniquement sur papier et les consignes personnalisées restent présentes',()=>{
 const {records,results,rows}=prepare(),before=JSON.stringify(records),find=id=>rows.find(r=>r.id===id).cells[4];
 for(const id of ['adrenaline-iv','amiodarone','isofundine'])assert.equal(find(id),'IVD');
 for(const id of ['cardioversion','defibrillation'])assert.equal(find(id),'—');
 assert.match(records.find(r=>r.id==='adrenaline-iv').protocol.administrationNote,/rincer/);
 assert.match(records.find(r=>r.id==='cardioversion').protocol.administrationNote,/Synchrone/);
 const custom=structuredClone(records.find(r=>r.id==='propofol'));custom.protocol.administrationNote='Consigne particulière à conserver';
 assert.match(printAdministration(custom,results.get(custom.id)),/Consigne particulière à conserver/);
 assert.equal(JSON.stringify(records),before);
});
test('les durées structurées et libres, voies et mentions à préciser restent lisibles',()=>{
 const {rows}=prepare(),find=id=>rows.find(r=>r.id===id).cells[4];
 assert.equal(find('ketamine-analgesie'),'IVL 2–3 min');assert.equal(find('ketamine-intubation'),'IVL 2–3 min');
 assert.equal(find('gentamicine'),'IVL 30 min');assert.equal(find('clonazepam-ivc'),'IVSE 6 h');assert.equal(find('insuline-glucose'),'IV 30 min');
 assert.equal(find('midazolam-ij'),'IJ');assert.equal(find('diazepam-ir'),'IR');assert.equal(find('salbutamol-nebulise'),'Nébul.');
 assert.match(find('nicardipine-charge'),/à préciser/);assert.match(find('calcium-gluconate'),/à préciser/);
});
test('le total de la somme disparaît, le prélèvement, le diluant et le volume à administrer sont conservés',()=>{
 for(const weightKg of [.5,10,50]){
  const {rows,results}=prepare(newState(),{...ctx,weightKg});
  for(const row of rows.filter(r=>r.status==='calculated')){
   const result=results.get(row.id),take=result.withdrawalMl??result.preparation?.takeMl,add=result.addMl??result.preparation?.addMl;
   if(Number.isFinite(take)&&Number.isFinite(add)){
    assert.ok(row.cells[2].includes(`${printMl(take)} mL + ${printMl(add)} mL`),row.id);
    assert.doesNotMatch(row.cells[2],/=/,row.id);
   }
   if(row.id==='cgr')assert.equal(row.cells[3],'Une poche maximum');
   else if(Number.isFinite(result.volumeMl))assert.ok(row.cells[3].includes(`${printMl(result.volumeMl)} mL`),row.id);
  }
 }
 const {rows}=prepare();assert.equal(rows.find(r=>r.id==='adrenaline-iv').cells[2],'1 mg/1 mL · 1 mL + 9 mL NaCl 0,9 %');
 assert.equal(rows.find(r=>r.id==='adrenaline-iv').cells[3],'1 mL');
});
