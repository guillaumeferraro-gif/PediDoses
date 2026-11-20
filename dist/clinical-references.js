// Local reference settings. Infant values are deliberately unset until entered.
export const REFERENCE_FIELDS = [
  {key:'tam', label:'TAm · référence', unit:'mmHg'},
  {key:'tamLower', label:'TAm · limite inférieure', unit:'mmHg'},
  {key:'tas', label:'TAs · référence', unit:'mmHg'},
  {key:'tasLower', label:'TAs · limite inférieure', unit:'mmHg'},
  {key:'cuffed', label:'Sonde avec ballonnet', unit:'mm', tube:true},
  {key:'uncuffed', label:'Sonde sans ballonnet', unit:'mm', tube:true}
];
export const TUBE_SIZES = Array.from({length:11}, (_,i)=>3+i/2);
export const referenceDefaults = () => ({
  cuffedOffset:3,
  months:Array.from({length:12}, (_,month)=>({month,...Object.fromEntries(REFERENCE_FIELDS.map(f=>[f.key,null]))}))
});
export const referenceNumber = (n, digits=2) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(n);
export const monthLabel = month => `${month} à moins de ${month+1} mois`;

export function validateReferences(config){
  if(!config || ![3,3.5].includes(config.cuffedOffset) || !Array.isArray(config.months) || config.months.length!==12)
    throw Error('Repères incomplets : les 12 tranches mensuelles et la formule des sondes sont nécessaires.');
  for(const [month,row] of config.months.entries()){
    if(!row || row.month!==month)throw Error('Les repères doivent couvrir chaque mois de 0 à 11, dans cet ordre.');
    for(const field of REFERENCE_FIELDS){
      const value=row[field.key];
      if(value===null)continue;
      if(typeof value!=='number' || !Number.isFinite(value) || value<=0)
        throw Error(`${monthLabel(month)} · ${field.label} : renseignez une valeur positive ou laissez vide.`);
      if(field.tube && !TUBE_SIZES.includes(value))
        throw Error(`${monthLabel(month)} · ${field.label} : choisissez de 3,0 à 8,0 mm, par pas de 0,5.`);
    }
    for(const key of ['tam','tas']){
      if(row[key]!==null && row[key+'Lower']!==null && row[key+'Lower']>row[key])
        throw Error(`${monthLabel(month)} · ${key==='tam'?'TAm':'TAs'} : la limite inférieure dépasse la valeur de référence.`);
    }
  }
  return config;
}

export function calculateReferences(config,ageMonths){
  if(!config)return {status:'unavailable'};
  validateReferences(config);
  if(ageMonths===null || ageMonths===undefined)return {status:'missing-age'};
  if(typeof ageMonths!=='number' || !Number.isFinite(ageMonths) || ageMonths<0 || ageMonths>216)
    return {status:'invalid-age'};
  if(ageMonths<12){
    const month=Math.floor(ageMonths), row=config.months[month];
    return {status:'ready',source:'monthly',ageMonths,month,
      tam:row.tam,tamLower:row.tamLower,tas:row.tas,tasLower:row.tasLower,cuffed:row.cuffed,uncuffed:row.uncuffed};
  }
  // Fractional years are retained: 18 months means 1.5 years, not 1 completed year.
  const years=ageMonths/12;
  return {status:'ready',source:'formula',ageMonths,
    tam:55+1.5*years,tamLower:45+1.5*years,
    tas:90+2*years,tasLower:70+2*years,
    cuffed:years/4+config.cuffedOffset,uncuffed:years/4+4};
}

// Shared wording and numbers for the reading screen and the printed reference band.
export function referenceCards(result){
  const unavailable=result.status==='unavailable'?'Indisponible':result.status==='invalid-patient'?'Saisie à corriger':result.status==='invalid-age'?'Âge à corriger':'Âge requis';
  const formatted=(value,digits)=>{
    if(result.status!=='ready')return unavailable;
    if(value===null)return 'À renseigner';
    const rounded=Number(value.toFixed(digits));
    return (Math.abs(rounded-value)>1e-9?'≈ ':'')+referenceNumber(value,digits);
  };
  const pressure=(key,label)=>({key,label,printLabel:label+' (mmHg)',
    value:formatted(result[key],1),unit:result.status==='ready'&&result[key]!==null?'mmHg':'',
    detail:result.status==='ready'?'Limite inf. : '+formatted(result[key+'Lower'],1)+(result[key+'Lower']!==null?' mmHg':''):unavailable,
    printDetail:result.status==='ready'?'Limite inf. : '+formatted(result[key+'Lower'],1):''});
  const tube=(key,label,printLabel)=>({key,label,printLabel,
    value:formatted(result[key],2),unit:result.status==='ready'&&result[key]!==null?'mm':'',
    detail:result.status==='ready'?(result.source==='formula'?'Diamètre interne théorique':'Diamètre interne · valeur mensuelle'):unavailable,
    printDetail:result.status==='ready'?(result.source==='formula'?'DI théorique · sans arrondi au calibre':'DI · valeur mensuelle'):''});
  return [pressure('tam','TAm'),pressure('tas','TAs'),tube('cuffed','Sonde avec ballonnet','Avec ballonnet (mm)'),tube('uncuffed','Sonde sans ballonnet','Sans ballonnet (mm)')];
}

export function referenceChanges(before,after){
  const changes=[];
  if(before.cuffedOffset!==after.cuffedOffset)changes.push({path:'cuffedOffset',label:'Sonde avec ballonnet · constante de la formule',before:before.cuffedOffset,after:after.cuffedOffset});
  for(const [month,row] of after.months.entries())for(const field of REFERENCE_FIELDS){
    if(before.months[month][field.key]!==row[field.key])changes.push({path:`months.${month}.${field.key}`,label:`${monthLabel(month)} · ${field.label} (${field.unit})`,before:before.months[month][field.key],after:row[field.key]});
  }
  return changes;
}

export function commitReferences(state,config,{restored=false}={}){
  validateReferences(config);
  const changes=referenceChanges(state.clinicalReferences,config);
  if(!changes.length)throw Error('Aucune modification des repères à enregistrer.');
  const next=structuredClone(state);
  next.clinicalReferences=structuredClone(config);
  next.history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),kind:'references',restored,
    recordId:null,name:'Repères vitaux et intubation',affected:[],stockIds:[],changes,checks:0,
    snapshot:{records:[],links:{},stocks:{},reviews:{},clinicalReferences:structuredClone(state.clinicalReferences)}});
  next.history=next.history.slice(0,60);
  return next;
}
