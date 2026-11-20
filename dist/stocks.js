import {clone,equal,emptyStock,linkedRecords,validateAtelier,synchronizeTexts,checkCases,differences,stockConcentration} from './domain.js';
import {validateStockDefinition} from './stock-validation.js';
export {validateStockDefinition} from './stock-validation.js';

export const stockEligible=r=>r.model.type!=='instruction'&&r.model.unit!=='J';
export function stockDraftFor(s,id){
 return {id,stock:clone(s.stocks[id]||emptyStock()),assignedIds:linkedRecords(s,id).map(r=>r.id)};
}
export function createStockDraft(){
 return {id:'stock-'+crypto.randomUUID(),stock:{...emptyStock(),presentation:''},assignedIds:[]};
}
export function stockDraftChanged(s,d){
 return !s.stocks[d.id]||!equal(d,stockDraftFor(s,d.id));
}
export function prepareStockSave(s,d){
 validateStockDefinition(d.stock);
 if(!Array.isArray(d.assignedIds)||new Set(d.assignedIds).size!==d.assignedIds.length||d.assignedIds.some(id=>!s.records.some(r=>r.id===id&&stockEligible(r))))throw Error('Affectation de médicament invalide.');
 const before=stockDraftFor(s,d.id),next=clone(s);
 next.stocks[d.id]=clone(d.stock);
 const removed=before.assignedIds.filter(id=>!d.assignedIds.includes(id));
 const added=d.assignedIds.filter(id=>!before.assignedIds.includes(id));
 for(const id of removed)next.links[id]=null;
 for(const id of d.assignedIds)next.links[id]=d.id;
 const stockChanged=!equal(s.stocks[d.id],d.stock);
 const affected=[...new Set([...(stockChanged?d.assignedIds:[]),...added,...removed])];
 const changes=differences(before,d);
 if(!changes.length&&!stockChanged)throw Error('Aucune modification à enregistrer.');
 for(const id of affected){
  next.reviews[id].status='todo';next.reviews[id].reviewedAt=null;next.reviews[id].checks={posology:false,preparation:false,administration:false};
  next.revisions[id]++;
 }
 synchronizeTexts(next,affected);validateAtelier(next);
 const checks=affected.flatMap(id=>checkCases(next,id));
 if(checks.some(c=>!c.ok))throw Error(checks.find(c=>!c.ok).message);
 const reassigned=added.filter(id=>s.links[id]).map(id=>({id,previousStockId:s.links[id]}));
 return {next,affected,changes,checks,removed,added,reassigned,stockChanged,before};
}
export function commitStockSave(s,d,p=prepareStockSave(s,d)){
 const next=p.next;
 const snapshot={records:s.records.filter(r=>p.affected.includes(r.id)).map(clone),links:Object.fromEntries(p.affected.map(id=>[id,s.links[id]])),stocks:clone(s.stocks),reviews:Object.fromEntries(p.affected.map(id=>[id,clone(s.reviews[id])]))};
 next.history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),kind:'stock',recordId:null,name:'Ampoule · '+d.stock.presentation,stockIds:[d.id],affected:p.affected,changes:p.changes,snapshot,checks:p.checks.length});
 next.history=next.history.slice(0,60);return next;
}
