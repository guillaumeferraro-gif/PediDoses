import {REFERENCE_FIELDS,TUBE_SIZES,monthLabel,referenceNumber,validateReferences,referenceChanges,commitReferences} from './clinical-references.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shown=value=>value===null?'Non renseigné':referenceNumber(value);

export class ReferenceEditor{
  constructor({getState,getToken,persist,onCommit,dialog,notify}){
    Object.assign(this,{getState,getToken,persist,onCommit,dialog,notify});
    this.root=document.getElementById('references-view');
    this.draft=null;this.month=0;this.invalid=new Map();
    this.root.addEventListener('input',e=>this.onInput(e));
    this.root.addEventListener('change',e=>this.onChange(e));
    this.root.addEventListener('click',e=>this.onClick(e));
  }
  reset(){this.draft=structuredClone(this.getState().clinicalReferences);this.invalid.clear();}
  dirty(){return !!this.draft&&(this.invalid.size>0||referenceChanges(this.getState().clinicalReferences,this.draft).length>0);}
  show(){if(!this.draft)this.reset();this.render();}
  guard(action){
    if(!this.dirty()){action();return;}
    this.dialog('Les repères ont été modifiés','Des valeurs ne sont pas encore enregistrées.',
      '<p>Revenez aux repères pour les enregistrer, ou abandonnez le brouillon pour continuer.</p>',
      '<button class="button secondary" data-close>Revenir aux repères</button><button class="button danger" id="reference-abandon">Abandonner et continuer</button>');
    document.getElementById('reference-abandon').onclick=()=>{this.reset();document.getElementById('dialog').close();action();};
  }
  field(key){
    const field=REFERENCE_FIELDS.find(f=>f.key===key),value=this.draft.months[this.month][key];
    const id=`reference-${this.month}-${key}`,invalid=this.invalid.has(id),raw=invalid?this.invalid.get(id):value;
    const attrs=`id="${id}" data-reference-field="${key}" aria-describedby="reference-input-help reference-errors"${invalid?' aria-invalid="true"':''}`;
    const input=field.tube?`<select ${attrs}><option value="">À renseigner</option>${TUBE_SIZES.map(n=>`<option value="${n}"${value===n?' selected':''}>${n.toFixed(1).replace('.',',')} mm</option>`).join('')}</select>`:
      `<span class="field-unit"><input ${attrs} type="text" inputmode="decimal" autocomplete="off" maxlength="7" placeholder="À renseigner" value="${esc(raw)}"><b>mmHg</b></span>`;
    return `<label class="field" for="${id}">${esc(field.label)}${input}</label>`;
  }
  render(){
    this.root.innerHTML=`<div class="collection-heading"><div><div class="eyebrow">REPÈRES DU PATIENT</div><h2>Repères vitaux et intubation</h2><p>Les valeurs enregistrées apparaissent dans la visualisation et sur le recto de l’impression.</p></div></div>
      <form id="reference-form" novalidate>
        <section class="reference-monthly" aria-labelledby="reference-monthly-title">
          <div class="reference-section-heading"><div><h3 id="reference-monthly-title">Avant 1 an</h3><p>Choisissez un mois pour renseigner ses valeurs.</p></div><span class="badge neutral" id="reference-completion"></span></div>
          <div class="reference-months" aria-label="Tranches d’âge en mois">${this.draft.months.map(row=>`<button type="button" data-reference-month="${row.month}" aria-pressed="${row.month===this.month}" class="reference-month${row.month===this.month?' selected':''}"><strong>${row.month} mois</strong><small id="reference-month-status-${row.month}"></small></button>`).join('')}</div>
          <div class="reference-age-heading"><h3>${monthLabel(this.month)}</h3><span>Mois révolus</span></div>
          <p class="hint" id="reference-input-help">Une case vide reste « À renseigner ». Aucune valeur n’est déduite des mois voisins.</p>
          <div class="reference-form-grid">
            <section class="reference-panel"><h4>Pression artérielle</h4><div class="fields">${['tam','tamLower','tas','tasLower'].map(k=>this.field(k)).join('')}</div></section>
            <section class="reference-panel"><h4>Sondes d’intubation</h4><p>Diamètre interne · de 3,0 à 8,0 mm, par pas de 0,5.</p><div class="fields">${['cuffed','uncuffed'].map(k=>this.field(k)).join('')}</div></section>
          </div>
        </section>
        <details class="reference-formulas"><summary>À partir de 1 an · formules</summary>
          <p>Application dès 12 mois. L’âge en années est égal à l’âge en mois ÷ 12, sans arrondi à l’année entière.</p>
          <dl><div><dt>TAm · référence</dt><dd>55 + 1,5 × âge <small>mmHg</small></dd></div><div><dt>TAm · limite inférieure</dt><dd>45 + 1,5 × âge <small>mmHg</small></dd></div><div><dt>TAs · référence</dt><dd>90 + 2 × âge <small>mmHg</small></dd></div><div><dt>TAs · limite inférieure</dt><dd>70 + 2 × âge <small>mmHg</small></dd></div><div><dt>Sonde sans ballonnet</dt><dd>âge ÷ 4 + 4 <small>mm</small></dd></div></dl>
          <label class="field reference-formula-choice" for="reference-cuffed-offset">Sonde avec ballonnet · formule locale<select id="reference-cuffed-offset"><option value="3"${this.draft.cuffedOffset===3?' selected':''}>âge ÷ 4 + 3 — formule demandée</option><option value="3.5"${this.draft.cuffedOffset===3.5?' selected':''}>âge ÷ 4 + 3,5</option></select></label>
          <p>Le diamètre calculé est théorique : aucun calibre n’est choisi automatiquement. L’affichage utilise jusqu’à deux décimales et « ≈ » si nécessaire.</p>
          <p class="reference-source">La formule locale avec ballonnet (+ 3) diffère de l’<a href="https://www.erc.edu/media/03xnpjmj/gl2025-09-pls-e.pdf" target="_blank" rel="noopener">ERC 2025</a>, qui indique âge ÷ 4 + 3,5 jusqu’à 8 ans. Les pressions ci-dessus sont les formules locales demandées.</p>
        </details>
      </form>
      <div id="reference-errors" class="error-box" role="alert" hidden></div>
      <div class="savebar"><div id="reference-draft-status" role="status"></div><button type="button" class="button secondary" data-reference-action="cancel">Annuler</button><button type="button" class="button primary" data-reference-action="save" id="reference-save">Enregistrer les repères</button></div>`;
    this.root.querySelector('form').addEventListener('submit',e=>e.preventDefault());
    this.refresh();
  }
  refresh(){
    let error=this.invalid.size?'Corrigez la saisie des pressions : valeur positive, virgule ou point, ou case vide.':'';
    if(!error)try{validateReferences(this.draft);}catch(e){error=e.message;}
    const errorNode=this.root.querySelector('#reference-errors');errorNode.textContent=error;errorNode.hidden=!error;
    const dirty=this.dirty();
    this.root.querySelector('#reference-save').disabled=!dirty||!!error;
    this.root.querySelector('#reference-draft-status').textContent=error?'Saisie à corriger':dirty?'Modifications non enregistrées':'Repères enregistrés';
    let complete=0;
    for(const row of this.draft.months){
      const count=REFERENCE_FIELDS.filter(f=>row[f.key]!==null).length;
      const invalid=REFERENCE_FIELDS.some(f=>this.invalid.has(`reference-${row.month}-${f.key}`));
      if(count===6&&!invalid)complete++;
      this.root.querySelector(`#reference-month-status-${row.month}`).textContent=invalid?'À corriger':count===0?'À renseigner':count===6?'Complet':`${count}/6 valeurs`;
    }
    this.root.querySelector('#reference-completion').textContent=`${complete}/12 mois complets`;
  }
  onInput(e){
    const el=e.target,key=el.dataset.referenceField;
    if(!key||el.tagName==='SELECT'||!REFERENCE_FIELDS.some(f=>f.key===key&&!f.tube))return;
    const raw=el.value.trim(),value=raw===''?null:Number(raw.replace(',','.'));
    if(raw&&!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)||value!==null&&(!Number.isFinite(value)||value<=0)){
      this.invalid.set(el.id,el.value);el.setAttribute('aria-invalid','true');this.refresh();return;
    }
    this.invalid.delete(el.id);el.removeAttribute('aria-invalid');this.draft.months[this.month][key]=value;this.refresh();
  }
  onChange(e){
    const el=e.target;
    if(el.id==='reference-cuffed-offset'){this.draft.cuffedOffset=Number(el.value);this.refresh();return;}
    if(el.tagName==='SELECT'&&REFERENCE_FIELDS.some(f=>f.key===el.dataset.referenceField&&f.tube)){
      this.draft.months[this.month][el.dataset.referenceField]=el.value===''?null:Number(el.value);this.refresh();
    }
  }
  onClick(e){
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.referenceMonth!==undefined){
      const month=Number(button.dataset.referenceMonth);if(!Number.isInteger(month)||month<0||month>11)return;
      this.month=month;this.render();this.root.querySelector(`[data-reference-month="${month}"]`).focus();return;
    }
    if(button.dataset.referenceAction==='cancel')this.guard(()=>{this.reset();this.render();});
    if(button.dataset.referenceAction==='save')this.save();
  }
  save(){
    try{
      if(this.invalid.size)throw Error('Corrigez les saisies avant d’enregistrer.');
      validateReferences(this.draft);
      const config=structuredClone(this.draft),changes=referenceChanges(this.getState().clinicalReferences,config);
      if(!changes.length)return;
      this.dialog('Enregistrer les repères',`${changes.length} valeur${changes.length>1?'s':''} modifiée${changes.length>1?'s':''}`,
        '<p>Ces valeurs seront utilisées à l’écran et à l’impression.</p><div class="change-row change-header"><span>Paramètre</span><span>Avant</span><span>Après</span></div>'+changes.map(c=>`<div class="change-row"><span>${esc(c.label)}</span><del>${esc(shown(c.before))}</del><ins>${esc(shown(c.after))}</ins></div>`).join(''),
        '<button class="button secondary" data-close>Continuer à modifier</button><button class="button primary" id="reference-confirm-save">Enregistrer les repères</button>');
      const saveBase=this.getToken?.(),saved=commitReferences(this.getState(),config);
      document.getElementById('reference-confirm-save').onclick=async()=>{
        try{document.getElementById('reference-confirm-save').disabled=true;await this.persist(saved,{expectedBase:saveBase});this.reset();document.getElementById('dialog').close();this.onCommit();this.render();this.notify('Repères enregistrés et disponibles à l’impression.');}
        catch(error){document.getElementById('dialog').close();this.showError(error.message);}
      };
    }catch(error){this.showError(error.message);}
  }
  showError(message){const node=this.root.querySelector('#reference-errors');node.textContent=message;node.hidden=false;node.scrollIntoView({block:'nearest'});}
}
