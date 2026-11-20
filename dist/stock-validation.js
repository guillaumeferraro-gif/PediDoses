import {stockUnits} from './engine/protocol-config.js';
import {stockConcentration} from './engine/ampoules.js';

export function validateStockDefinition(a){
 if(!a||!a.presentation?.trim())throw Error('Renseignez le nom de l’ampoule ou de la présentation.');
 const keys=['presentation','amount','volumeMl','unit','declaredConcentration','expression','status','comment','source'];
 if(Object.keys(a).some(k=>!keys.includes(k)))throw Error('Un champ de l’ampoule n’est pas reconnu.');
 for(const k of ['presentation','unit','expression','status','comment','source'])if(typeof a[k]!=='string'||a[k].length>4000)throw Error('Champ d’ampoule invalide : '+k);
 for(const k of ['amount','volumeMl','declaredConcentration'])if(a[k]!==null&&(!Number.isFinite(a[k])||a[k]<=0))throw Error('Quantité, volume et concentration doivent être des nombres positifs.');
 if(!['confirmé','à confirmer','sans objet'].includes(a.status))throw Error('État de l’ampoule invalide.');
 if(a.unit&&!stockUnits.includes(a.unit))throw Error('Unité de l’ampoule invalide.');
 if((a.amount!==null||a.declaredConcentration!==null)&&!a.unit)throw Error('Choisissez l’unité de la quantité.');
 if(a.amount!==null&&a.volumeMl!==null&&a.declaredConcentration!==null&&Math.abs(stockConcentration(a)-a.declaredConcentration)>1e-9)throw Error('La concentration doit correspondre à quantité ÷ volume.');
}
