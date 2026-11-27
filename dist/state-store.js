import {STORAGE_KEY,newState,validateState,clone,differences,draftFor} from './domain.js';

export const WRITE_LOCK='pedidose-atelier-reference-write';
export class StateConflictError extends Error{
 constructor(){super('Une modification a été enregistrée dans un autre onglet. Votre brouillon est conservé. Comparez les versions et récupérez votre brouillon avant de recharger.');this.code='state-conflict';}
}
export function createStateStore(storage,{locks}={}){
 let base;
 const raw=()=>storage.getItem(STORAGE_KEY)??null;
 return {
  get writable(){return typeof locks?.request==='function';},
  token:()=>base,
  changed:()=>base!==raw(),
  peek(){const value=raw();return value===null?newState():validateState(JSON.parse(value));},
  read(){base=raw();return base===null?newState():validateState(JSON.parse(base));},
  async save(value,{expectedBase=base,backups=[]}={}){
   if(typeof locks?.request!=='function')throw Error('Ce navigateur ne permet pas de coordonner les enregistrements entre onglets. La lecture reste disponible. Récupérez votre brouillon et utilisez un navigateur compatible pour enregistrer.');
   // Freeze the candidate before waiting. Never rebuild it from a changing UI draft.
   const candidate=validateState(clone(value)),serialized=JSON.stringify(candidate);
   if(expectedBase===undefined)throw Error('La base enregistrée doit être chargée avant toute écriture.');
   const copies=backups.map(item=>({...item}));
   if(copies.some(item=>!item.key?.startsWith(STORAGE_KEY+'.backup.')||typeof item.value!=='string'))throw Error('Copie de récupération invalide.');
   return locks.request(WRITE_LOCK,{mode:'exclusive'},()=>{
    if(raw()!==expectedBase)throw new StateConflictError();
    // Backup failures abort the replacement. Earlier copies are harmless and retained.
    for(const copy of copies){if(storage.getItem(copy.key)!=null)throw Error('Une copie de récupération existe déjà.');storage.setItem(copy.key,copy.value);}
    storage.setItem(STORAGE_KEY,serialized);
    base=serialized;
    return candidate;
   });
  }
 };
}

export function referenceDifferences(before,after){
 const rows=[];
 for(const id of new Set([...before.records.map(r=>r.id),...after.records.map(r=>r.id)])){
  const a=before.records.find(r=>r.id===id),b=after.records.find(r=>r.id===id);
  const left=a?draftFor(before,id):null,right=b?draftFor(after,id):null;
  rows.push(...differences(left,right).map(c=>({...c,label:(b?.name||a.name)+' · '+c.label})));
 }
 rows.push(...differences(before.clinicalReferences,after.clinicalReferences).map(c=>({...c,label:'Repères · '+c.path})));
 rows.push(...differences(before.stocks,after.stocks).map(c=>({...c,label:'Ampoules · '+c.path})));
 return rows;
}

export function draftRecovery({state,medication,invalidValues=[],ampoule=null,ampouleInvalid=[],references=null,referencesInvalid=[]}){
 // Explicit whitelist: do not capture the UI context, age, weight or temporary doses.
 return clone({format:'pedidose-atelier-brouillons',version:1,at:new Date().toISOString(),
  description:'Brouillons non enregistrés à comparer au référentiel actuel avant toute reprise.',
  base:state,medication,invalidValues,ampoule,ampouleInvalid,references,referencesInvalid});
}
