// Physical page geometry in points. The SVG uses the same bundled font metrics
// as the printable text, so page count does not depend on screen or viewport size.
import metrics from './print-font-metrics.js';

export const PRINT={width:196*72/25.4,height:282*72/25.4,top:13,referenceHeight:40,continuationTop:13,bottom:0,font:9,minFont:7.5,line:10.5,row:18,group:20,groupGap:4,padding:1.75};
const contentTop=(pageIndex,hasReferences=false)=>pageIndex===0?PRINT.top+(hasReferences?PRINT.referenceHeight:0):PRINT.continuationTop;
export const COLUMNS=[
 {label:'Médicament / usage',width:51*72/25.4},
 {label:'Dose calculée',width:24*72/25.4},
 {label:'Ampoule · préparation',width:60*72/25.4},
 {label:'À administrer',width:40*72/25.4},
 {label:'Voie / durée',width:21*72/25.4}
];
export function textWidth(text,size,bold=false){
 const font=metrics[bold?'bold':'regular'];
 return [...String(text)].reduce((sum,ch)=>sum+(font.widths[ch.codePointAt(0)]??font.defaultWidth),0)*size/1000;
}
const normal=text=>String(text??'').replace(/\s+/gu,' ').trim();
function wrap(text,width,size,bold){
 const lines=[];let line='';
 for(const word of normal(text).split(' ')){
  const candidate=line?line+' '+word:word;
  if(textWidth(candidate,size,bold)<=width){line=candidate;continue;}
  if(line){lines.push(line);line='';}
  for(const ch of word){
   if(textWidth(line+ch,size,bold)>width&&line){lines.push(line);line='';}
   line+=ch;
  }
 }
 if(line)lines.push(line);
 return lines.length?lines:[''];
}
function cell(text,width,bold){
 text=normal(text);width-=PRINT.padding*2;
 const size=Math.max(PRINT.minFont,Math.min(PRINT.font,PRINT.font*width/Math.max(1,textWidth(text,PRINT.font,bold))));
 return {text,width,size,bold,lines:textWidth(text,size,bold)<=width+.01?[text]:wrap(text,width,size,bold)};
}
export function measureRows(rows){
 return rows.map(r=>{
  const cells=r.cells.map((v,i)=>cell(v,r.spanMessage&&i===1?PRINT.width-COLUMNS[0].width:COLUMNS[i].width,i===0||(!r.spanMessage&&i===3)));
  return {...r,cells,height:Math.max(PRINT.row,Math.max(...cells.map(c=>c.lines.length))*PRINT.line+5)};
 });
}
function paginate(rows,bottomY,hasReferences){
 const pages=[];let page=[],height=0,lastCategory=null;
 for(const row of rows){
  let heading=lastCategory!==row.category;
  const limit=bottomY-contentTop(pages.length,hasReferences);
  const headingHeight=heading?PRINT.group+(page.length?PRINT.groupGap:0):0;
  if(page.length&&height+row.height+headingHeight>limit){pages.push(page);page=[];height=0;lastCategory=null;heading=true;}
  if(heading){const gapBefore=page.length?PRINT.groupGap:0;page.push({kind:'group',label:row.categoryLabel,height:PRINT.group+gapBefore,gapBefore});height+=PRINT.group+gapBefore;}
  page.push({...row,kind:'medication'});height+=row.height;lastCategory=row.category;
 }
 if(page.length)pages.push(page);
 return pages;
}
const colors={ink:'#17242c',muted:'#47565e',line:'#aeb7bd',group:'#334f5c',stripe:'#f4f6f7'};
export function layoutPrintDocument(rows,{error='',references=null}={}){
 const hasReferences=Array.isArray(references)&&references.length===4;
 const measured=measureRows(rows),bottomY=PRINT.height-PRINT.bottom,capacity=bottomY-contentTop(0,hasReferences);
 if(measured.some(row=>row.height+PRINT.group>capacity)){
  const error='Une fiche comporte trop de texte pour une page. Raccourcissez sa consigne avant d’imprimer.';
  return {...layoutPrintDocument([],{error:'Impression indisponible : '+error}),blocked:true,error};
 }
 let pages=paginate(measured,bottomY,hasReferences);
 // Balance the printed bottom edges, including the reference band on the recto only.
 if(pages.length===2){let lo=bottomY/2,hi=bottomY;for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(paginate(measured,mid,hasReferences).length>2)lo=mid;else hi=mid;}pages=paginate(measured,Math.min(bottomY,hi+.1),hasReferences);}
 if(!pages.length)pages=[[]];
 const documents=pages.map((entries,pageIndex)=>{
  const ops=[];
  const text=(value,x,y,size=8.5,bold=false,fill=colors.ink)=>ops.push({type:'text',text:value,x,y,size,bold,fill});
  const rect=(x,y,width,height,fill)=>ops.push({type:'rect',x,y,width,height,fill});
  const line=(x,y,x2,y2,stroke=colors.line)=>ops.push({type:'line',x,y,x2,y2,stroke});
  if(pageIndex===0&&hasReferences){
    const width=PRINT.width/4,bandY=PRINT.top-13;
    rect(0,bandY,PRINT.width,PRINT.referenceHeight-4,'#e9f0f2');
    references.forEach((card,i)=>{
     const x=i*width+5,available=width-10;
     const fit=(value,size,bold=false)=>Math.min(size,size*available/Math.max(1,textWidth(value,size,bold)));
     text(card.printLabel,x,bandY+10,fit(card.printLabel,8,true),true);
     text(card.value,x,bandY+23,fit(card.value,11,true),true);
     text(card.printDetail,x,bandY+32,fit(card.printDetail,7.5),false,colors.muted);
     if(i)line(i*width,bandY+4,i*width,bandY+PRINT.referenceHeight-8);
    });
  }
  const top=contentTop(pageIndex,hasReferences);
  rect(0,top-13,PRINT.width,13,colors.ink);
  let x=0;COLUMNS.forEach(c=>{text(c.label,x+PRINT.padding,top-3.5,8,true,'#ffffff');x+=c.width;});
  let y=top,index=0;
  for(const entry of entries){
   if(entry.kind==='group'){
    const groupY=y+entry.gapBefore;
    rect(0,groupY,PRINT.width,PRINT.group,colors.group);
    text(entry.label.toLocaleUpperCase('fr-FR'),5,groupY+13.5,10.5,true,'#ffffff');
   }
   else{
    if(index%2===1)rect(0,y,PRINT.width,entry.height,colors.stripe);
    let x=0;
    entry.cells.forEach((c,i)=>{
     const width=entry.spanMessage&&i===1?PRINT.width-COLUMNS[0].width:COLUMNS[i].width;
     const highlightLimit=entry.highlightBagLimit&&i===3;
     if(highlightLimit)rect(x,y,width,entry.height,colors.ink);
     const baseline=(entry.height-c.lines.length*PRINT.line)/2+8;
     c.lines.forEach((value,j)=>text(value,x+PRINT.padding,y+baseline+j*PRINT.line,c.size,c.bold,highlightLimit?'#ffffff':colors.ink));
     x+=width;if(x<PRINT.width-.1)line(x,y,x,y+entry.height);
    });
    index++;
   }
   y+=entry.height;line(0,y,PRINT.width,y);
  }
  if(!entries.length)text(error||'Aucun médicament dans la sélection.',PRINT.padding,top+18);
  return {width:PRINT.width,height:PRINT.height,entries,ops,contentBottom:y};
 });
 return {pages:documents,count:rows.length,requiresExtraPages:pages.length>2};
}
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
export function renderPrintDocument(document){
 return document.pages.map((p,i)=>`<section class="print-sheet" aria-label="Page ${i+1} sur ${document.pages.length}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.width} ${p.height}" role="img" aria-label="Tableau des médicaments, page ${i+1}"><title>PediDoses, page ${i+1} sur ${document.pages.length}</title>${p.ops.map(op=>op.type==='text'?`<text x="${op.x}" y="${op.y}" font-size="${op.size}" font-weight="${op.bold?700:400}" fill="${op.fill}" xml:space="preserve">${escape(op.text)}</text>`:op.type==='rect'?`<rect x="${op.x}" y="${op.y}" width="${op.width}" height="${op.height}" fill="${op.fill}"/>`:`<line x1="${op.x}" y1="${op.y}" x2="${op.x2}" y2="${op.y2}" stroke="${op.stroke}" stroke-width="0.3"/>`).join('')}</svg></section>`).join('');
}
