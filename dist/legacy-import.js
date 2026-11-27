import {newState,clone,equal,draftFor,validateState,validateAtelier,synchronizeTexts,differences,checkCases,STORAGE_KEY} from './domain.js';
import {defaultConfiguration,validateConfiguration,upgradeConfiguration,configurationStorageKey} from './engine/protocol-config.js';
import {ampouleStorageKey,validateAmpoules} from './engine/ampoules.js';
import {smurRecords} from './engine/smur-data.js';
import {migrateUsage} from './usage-options.js';

export const LEGACY_KEYS=[configurationStorageKey,ampouleStorageKey];
export function legacyConfiguration(value){
 if(value?.schemaVersion===1||value?.schemaVersion===2){
  const next=upgradeConfiguration(clone(value));validateConfiguration(next);
  const upgradeChanges=value.schemaVersion===1?value.records.flatMap(row=>differences(row,next.records.find(r=>r.id===row.id)).map(c=>({...c,label:row.name+' · '+c.label}))):[];
  return {config:next,upgraded:value.schemaVersion===1,upgradeChanges};
 }
 if(value&&Array.isArray(value.items)){
  if(Object.keys(value).some(k=>!['version','items'].includes(k))||value.version!==undefined&&value.version!==1)throw Error('Format de l’ancien tableau d’ampoules non reconnu.');
  validateAmpoules(value.items,smurRecords);const config=defaultConfiguration();
  for(const r of config.records){
   r.ampoule=clone(value.items.find(x=>x.id===r.id));
  }
  return {config,upgraded:false,upgradeChanges:[],ampoulesOnly:true};
 }
 throw Error('Format inconnu : choisir un export JSON de l’Atelier ou de l’ancienne version GitHub. Aucune donnée n’a été remplacée.');
}

export function prepareLegacyImport(current,value){
 validateState(current);
 const converted=legacyConfiguration(value),next=clone(current),initial=newState(),groups=new Map(),addedStocks=[];
 for(const row of converted.config.records){
  const {ampoule,...record}=clone(row),{id,name,...stock}=ampoule;
  const family=initial.links[row.id],groupKey=family+'|'+JSON.stringify(stock);
  let stockId=groups.get(groupKey);
  if(!stockId){
   const linked=current.links[row.id];
   stockId=linked&&equal(current.stocks[linked],stock)?linked:'stock-import-'+crypto.randomUUID();
   if(!next.stocks[stockId]){next.stocks[stockId]=stock;addedStocks.push(stockId);}
   groups.set(groupKey,stockId);
  }
  const index=next.records.findIndex(r=>r.id===row.id);
  if(!converted.ampoulesOnly){next.records[index]=migrateUsage(record);next.reviews[row.id].questions=clone(row.protocol.questions);}
  next.links[row.id]=stockId;
 }
 synchronizeTexts(next);validateAtelier(next);
 const changes=[],affected=[];
 for(const row of converted.config.records){
  const diff=differences(draftFor(current,row.id),draftFor(next,row.id));
  if(!diff.length)continue;
  affected.push(row.id);changes.push(...diff.map(c=>({...c,path:row.id+'.'+c.path,label:row.name+' · '+c.label})));
  Object.assign(next.reviews[row.id],{status:'todo',reviewedAt:null,checks:{posology:false,preparation:false,administration:false}});
  next.revisions[row.id]++;
 }
 const checks=affected.flatMap(id=>checkCases(next,id));
 if(checks.some(c=>!c.ok))throw Error('Conversion impossible : '+checks.find(c=>!c.ok).message);
 if(affected.length){
  next.history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),kind:'edit',recordId:null,
   name:'Reprise des réglages GitHub',affected,stockIds:addedStocks,changes,checks:checks.length,
   snapshot:{records:current.records.filter(r=>affected.includes(r.id)).map(clone),stocks:clone(current.stocks),links:clone(current.links),reviews:clone(current.reviews)}});
  next.history=next.history.slice(0,60);
 }
 validateState(next);
 return {...converted,next,affected,changes,checks};
}

export function migrationBackups(sourceText,previousText){
 const key=STORAGE_KEY+'.backup.'+crypto.randomUUID();
 return [{key:key+'.github-source',value:sourceText},...(previousText!==null?[{key:key+'.atelier-before',value:previousText}]:[])];
}
