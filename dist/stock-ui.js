import {fmt,normal,categoryName,stockConcentration,linkedRecords,clone} from './domain.js';
import {stockDraftFor,createStockDraft,stockDraftChanged,stockEligible,prepareStockSave,commitStockSave} from './stocks.js';
import {stockUnits,convertStockUnit} from './engine/protocol-config.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(label,key,value,{number=false,wide=false,options,help=''}={})=>'<label class="field'+(wide?' wide':'')+'">'+esc(label)+(options?'<select data-amp-field="'+key+'">'+options.map(o=>'<option value="'+esc(o)+'"'+(o===value?' selected':'')+'>'+esc(o||'Choisir')+'</option>').join('')+'</select>':'<input data-amp-field="'+key+'"'+(number?' data-number inputmode="decimal"':'')+' value="'+esc(value)+'" autocomplete="off">')+(help?'<small>'+esc(help)+'</small>':'')+'</label>';
const summary=a=>a.amount!==null?fmt(a.amount)+' '+a.unit+(a.volumeMl!==null?' / '+fmt(a.volumeMl)+' mL':' par contenant'):a.declaredConcentration!==null?fmt(a.declaredConcentration)+' '+a.unit+'/mL':a.volumeMl!==null?fmt(a.volumeMl)+' mL':'À renseigner';

export class AmpouleEditor{
 constructor({getState,getToken,persist,onCommit,dialog,notify}){
  Object.assign(this,{getState,getToken,persist,onCommit,dialog,notify});
  this.root=document.getElementById('stocks-view');this.draft=null;this.query='';this.assignmentQuery='';this.invalid=new Set();this.invalidValues=new Map();
  this.root.addEventListener('input',e=>this.onInput(e));
  this.root.addEventListener('change',e=>this.onChange(e));
  this.root.addEventListener('click',e=>this.onClick(e));
 }
 dirty(){return this.draft&&(stockDraftChanged(this.getState(),this.draft)||this.invalid.size>0);}
 reset(){if(this.draft&&this.getState().stocks[this.draft.id])this.draft=stockDraftFor(this.getState(),this.draft.id);else this.draft=null;this.invalid.clear();this.invalidValues.clear();}
 show(id){
  if(id)this.draft=stockDraftFor(this.getState(),id);
  if(!this.draft)this.draft=stockDraftFor(this.getState(),this.getState().links['ketamine-analgesie']||Object.keys(this.getState().stocks)[0]);
  this.render();
 }
 guard(action){
  if(!this.dirty()){action();return;}
  this.dialog('L’ampoule a été modifiée','Enregistrez-la ou abandonnez ses modifications pour continuer.','<p>Les affectations et les données enregistrées restent conservées tant que vous n’enregistrez pas.</p>','<button class="button secondary" data-close>Revenir à l’ampoule</button><button class="button danger" id="amp-abandon">Abandonner et continuer</button>');
  document.getElementById('amp-abandon').onclick=()=>{this.reset();document.getElementById('dialog').close();action();};
 }
 render(){
  const s=this.getState(),a=this.draft.stock;
  this.root.innerHTML='<div class="collection-heading"><div><div class="eyebrow">ESPACE AMPOULES</div><h2>Les ampoules se gèrent ici.</h2><p>Renseignez le contenant, puis cochez les médicaments / usages qui l’utilisent.</p></div><button class="button primary" data-amp-action="new">+ Nouvelle ampoule</button></div><div class="amp-layout"><aside class="amp-library"><label class="field">Rechercher une ampoule<input id="amp-search" placeholder="Nom, quantité…" value="'+esc(this.query)+'"></label><div id="amp-list"></div></aside><section class="amp-editor"><div class="amp-title"><div><span class="eyebrow">FICHE AMPOULE</span><h3 id="amp-name">'+esc(a.presentation||'Nouvelle ampoule')+'</h3></div><span class="badge neutral">Indépendante des usages</span></div><form id="amp-form" novalidate><div class="amp-section"><h3>1. Le contenant</h3><div class="fields">'+field('Nom de l’ampoule / présentation','presentation',a.presentation,{wide:true})+field('Quantité dans le contenant','amount',a.amount,{number:true})+field('Unité','unit',a.unit,{options:['',...stockUnits]})+field('Volume du contenant (mL)','volumeMl',a.volumeMl,{number:true,wide:true,help:'Laissez vide si la présentation est une poudre non reconstituée.'})+'</div><div class="calculated"><span>Concentration calculée</span><strong id="amp-concentration">'+fmt(stockConcentration(a))+' '+esc(a.unit)+'/mL</strong></div><details class="subsection"'+(a.declaredConcentration!==null?' open':'')+'><summary>Concentration connue sans détail du contenant</summary><div class="fields">'+field('Concentration connue ('+(a.unit||'unité')+'/mL)','declaredConcentration',a.declaredConcentration,{number:true,wide:true,help:'Uniquement si la quantité ou le volume du contenant manque.'})+'</div></details><details class="subsection"><summary>Source et précisions facultatives</summary><div class="fields">'+field('Source / référence','source',a.source,{wide:true})+field('Précision sur la quantité','expression',a.expression,{wide:true})+field('Commentaire','comment',a.comment,{wide:true})+field('Statut dans le référentiel','status',a.status,{options:['à confirmer','confirmé'],wide:true})+'</div></details></div><div class="amp-section"><h3>2. Les médicaments qui utilisent cette ampoule <span id="amp-assignment-count"></span></h3><p>Une ampoule peut servir à plusieurs usages. Chaque usage garde sa posologie.</p><label class="search-field"><input id="amp-assignment-search" aria-label="Filtrer les médicaments à affecter" placeholder="Rechercher un médicament / usage" value="'+esc(this.assignmentQuery)+'"></label><div id="amp-assignments" class="amp-assignments"></div><p class="hint">Cocher un usage remplace son ampoule actuelle. Le décocher le laisse sans ampoule : ses volumes restent indisponibles jusqu’à une nouvelle affectation.</p></div></form><div id="amp-errors" class="error-box" role="alert" hidden></div><div class="savebar"><div id="amp-draft-status"></div><button class="button secondary" data-amp-action="cancel">Annuler</button><button class="button primary" data-amp-action="save" id="amp-save">Enregistrer l’ampoule</button></div></section></div>';
  this.root.querySelector('form').addEventListener('submit',e=>e.preventDefault());
  this.renderList();this.renderAssignments();this.refresh();
  for(const [key,value] of this.invalidValues){const input=this.root.querySelector('[data-amp-field="'+key+'"]');input.value=value;input.setAttribute('aria-invalid','true');input.classList.add('invalid');}
 }
 renderList(){
  const s=this.getState();
  const entries=Object.entries(s.stocks).filter(([id,a])=>a.status!=='sans objet'&&normal(a.presentation+' '+summary(a)).includes(normal(this.query))).sort((a,b)=>a[1].presentation.localeCompare(b[1].presentation,'fr'));
  this.root.querySelector('#amp-list').innerHTML=entries.length?entries.map(([id,a])=>'<button class="amp-list-item'+(this.draft.id===id?' active':'')+'" data-amp-id="'+esc(id)+'" aria-pressed="'+(this.draft.id===id)+'"><strong>'+esc(a.presentation)+'</strong><span>'+esc(summary(a))+'</span><small>'+linkedRecords(s,id).length+' usage'+(linkedRecords(s,id).length>1?'s':'')+'</small></button>').join(''):'<p class="empty-list">Aucune ampoule trouvée.</p>';
 }
 renderAssignments(){
  const s=this.getState(),ids=this.draft.assignedIds;
  const rows=s.records.filter(stockEligible).filter(r=>normal(r.name+' '+categoryName(r.category)).includes(normal(this.assignmentQuery))).sort((a,b)=>Number(ids.includes(b.id))-Number(ids.includes(a.id))||a.name.localeCompare(b.name,'fr'));
  this.root.querySelector('#amp-assignments').innerHTML=rows.length?rows.map(r=>{
   const current=s.stocks[s.links[r.id]],assigned=ids.includes(r.id);
   return '<label class="assignment-row'+(assigned?' selected':'')+'"><input type="checkbox" data-amp-assign="'+r.id+'"'+(assigned?' checked':'')+'><span><strong>'+esc(r.name)+'</strong><small>'+esc(categoryName(r.category))+' · '+esc(r.protocol.route||'Voie à préciser')+'</small><small>'+(assigned?'Cette ampoule':current?'Actuellement : '+esc(current.presentation)+' · '+esc(summary(current)):'Aucune ampoule affectée')+'</small></span></label>';
  }).join(''):'<p class="empty-list">Aucun usage ne correspond à cette recherche.</p>';
  this.root.querySelector('#amp-assignment-count').textContent=ids.length;
 }
 refresh(){
  const a=this.draft.stock,dirty=this.dirty();
  this.root.querySelector('#amp-save').disabled=!dirty||!!this.invalid.size;
  this.root.querySelector('#amp-draft-status').textContent=this.invalid.size?'Corrigez la saisie numérique.':dirty?'Modifications non enregistrées':'Ampoule enregistrée';
  this.root.querySelector('#amp-name').textContent=a.presentation||'Nouvelle ampoule';
  this.root.querySelector('#amp-concentration').textContent=fmt(stockConcentration(a))+' '+a.unit+'/mL';
  const declared=this.root.querySelector('[data-amp-field="declaredConcentration"]');
  declared.disabled=a.amount!==null&&a.volumeMl!==null;
 }
 onInput(e){
  const el=e.target;
  if(el.id==='amp-search'){this.query=el.value;this.renderList();return;}
  if(el.id==='amp-assignment-search'){this.assignmentQuery=el.value;this.renderAssignments();return;}
  if(el.tagName==='SELECT'||!el.dataset.ampField)return;
  const key=el.dataset.ampField;
  let value=el.value;
  if(el.hasAttribute('data-number')){
   const str=value.trim();value=str===''?null:Number(str.replace(',','.'));
   if(str&&!/^[+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(str)||value!==null&&(!Number.isFinite(value)||value<=0)){
    this.invalid.add(key);this.invalidValues.set(key,el.value);el.setAttribute('aria-invalid','true');el.classList.add('invalid');this.refresh();return;
   }
  }
  this.invalid.delete(key);this.invalidValues.delete(key);el.removeAttribute('aria-invalid');el.classList.remove('invalid');this.draft.stock[key]=value;
  if(['amount','volumeMl'].includes(key)&&this.draft.stock.amount!==null&&this.draft.stock.volumeMl!==null){this.draft.stock.declaredConcentration=null;this.root.querySelector('[data-amp-field="declaredConcentration"]').value='';}
  this.refresh();
 }
 onChange(e){
  const el=e.target;
  if(el.dataset.ampAssign){
   if(el.checked)this.draft.assignedIds.push(el.dataset.ampAssign);else this.draft.assignedIds=this.draft.assignedIds.filter(id=>id!==el.dataset.ampAssign);
   el.closest('label').classList.toggle('selected',el.checked);this.root.querySelector('#amp-assignment-count').textContent=this.draft.assignedIds.length;this.refresh();return;
  }
  if(el.tagName==='SELECT'&&el.dataset.ampField){
   try{if(el.dataset.ampField==='unit'){convertStockUnit({ampoule:this.draft.stock},el.value);this.render();}else{this.draft.stock[el.dataset.ampField]=el.value;this.refresh();}}
   catch(error){el.value=this.draft.stock[el.dataset.ampField];this.showError(error.message);}
  }
 }
 onClick(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.ampId){this.guard(()=>{this.draft=stockDraftFor(this.getState(),b.dataset.ampId);this.assignmentQuery='';this.invalid.clear();this.invalidValues.clear();this.render();});return;}
  if(b.dataset.ampAction==='new'){this.guard(()=>{this.draft=createStockDraft();this.assignmentQuery='';this.render();});return;}
  if(b.dataset.ampAction==='cancel'){this.guard(()=>{this.reset();this.show();});return;}
  if(b.dataset.ampAction==='save')this.save();
 }
 showError(message){const n=this.root.querySelector('#amp-errors');n.textContent=message;n.hidden=false;n.scrollIntoView({block:'nearest'});}
 save(){
  try{
   const s=this.getState(),p=prepareStockSave(s,this.draft),d=clone(this.draft);
   const changed=p.changes.filter(c=>c.path.startsWith('stock.')).map(c=>'<li>'+esc(c.label)+' : '+esc(c.before??'Non renseigné')+' → '+esc(c.after??'Non renseigné')+'</li>').join('');
   const names=ids=>ids.map(id=>esc(s.records.find(r=>r.id===id).name)).join(' · ');
   this.dialog('Enregistrer l’ampoule',d.stock.presentation,
    '<p><strong>'+esc(summary(d.stock))+'</strong></p>'+(changed?'<ul class="amp-change-list">'+changed+'</ul>':'')+
    '<div class="shared-note"><strong>'+p.affected.length+' usage'+(p.affected.length>1?'s':'')+' concerné'+(p.affected.length>1?'s':'')+'</strong><p>'+names(p.affected)+'</p></div>'+
    (p.reassigned.length?'<p>Nouvelle ampoule pour : '+names(p.reassigned.map(r=>r.id))+'.</p>':'')+
    (p.removed.length?'<p>Sans ampoule après cette modification : '+names(p.removed)+'. Les calculs de ces fiches seront suspendus.</p>':'')+
    '<p>Les fiches concernées repasseront « À relire ». Leurs posologies restent conservées.</p>',
    '<button class="button secondary" data-close>Continuer à modifier</button><button class="button primary" id="amp-confirm-save">Enregistrer l’ampoule</button>');
   const saveBase=this.getToken?.();
      document.getElementById('amp-confirm-save').onclick=async()=>{
    try{document.getElementById('amp-confirm-save').disabled=true;await this.persist(commitStockSave(s,d,p),{expectedBase:saveBase});this.draft=stockDraftFor(this.getState(),d.id);document.getElementById('dialog').close();this.onCommit();this.render();this.notify('Ampoule enregistrée · '+p.affected.length+' usage(s) actualisé(s).');}
    catch(error){document.getElementById('dialog').close();this.showError(error.message);}
   };
  }catch(error){this.showError(error.message);}
 }
}
