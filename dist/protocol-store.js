import {defaultConfiguration,validateConfiguration,configurationStorageKey} from './protocol-config.js';
import {ampouleStorageKey,applyAmpoules} from './ampoules.js';
import {smurRecords} from './smur-data.js';

export function createProtocolStore({storage,access}){
 let configuration=defaultConfiguration();
 let message='Réglages fournis avec cette version.';
 const listeners=new Set();
 try{
  const stored=storage?.getItem(configurationStorageKey);
  if(stored){const value=JSON.parse(stored);validateConfiguration(value);configuration=value;message='Réglages personnalisés sur cet appareil.';}
  else {
   const legacy=storage?.getItem(ampouleStorageKey);
   if(legacy){
    const items=JSON.parse(legacy).items;if(!Array.isArray(items))throw new Error('Ancien tableau invalide');
    const old=new Map();for(const item of items){if(old.has(item.id))throw new Error('Doublon');old.set(item.id,item);}
    if(items.some(item=>!configuration.records.some(r=>r.id===item.id)))throw new Error('Ampoule inconnue');
    const merged=configuration.records.map(r=>old.get(r.id)??r.ampoule);
    const adapted=applyAmpoules(smurRecords,merged);
    for(const r of configuration.records){const row=adapted.find(item=>item.id===r.id);r.ampoule=merged.find(item=>item.id===r.id);for(const k of ['mix','weightMix','weightMixes'])if(row.model[k]!==undefined)r.model[k]=structuredClone(row.model[k]);}
    validateConfiguration(configuration);message='Anciennes ampoules reprises ; nouveaux réglages de posologie de cette version.';
   }
  }
 }catch{configuration=defaultConfiguration();message='Configuration enregistrée incompatible : les réglages de cette version sont utilisés. Vérifier dans Administration.';}
 let records=validateConfiguration(configuration);
 const notify=()=>{for(const listener of listeners)listener();};
 return {
  get message(){return message;},
  getConfiguration:()=>structuredClone(configuration),
  getRecords:()=>structuredClone(records),
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  apply(value){
   access.requireUnlocked();const candidate=structuredClone(value),next=validateConfiguration(candidate);
   // Persist first: a failed write must not replace the active calculations.
   if(!storage)throw new Error('Enregistrement sur cet appareil indisponible.');
   storage.setItem(configurationStorageKey,JSON.stringify(candidate));
   configuration=candidate;records=next;message='Réglages personnalisés enregistrés sur cet appareil.';notify();
  },
  reset(){this.apply(defaultConfiguration());message='Réglages de cette version rétablis sur cet appareil.';notify();},
 };
}
