// Minimal event/element fixture for module interaction tests; no layout or browser navigation.
export function createDocument(html){
 const ids=new Map();
 class Target{
  listeners=new Map();
  addEventListener(type,fn){const list=this.listeners.get(type)??[];list.push(fn);this.listeners.set(type,list);}
  dispatchEvent(event){for(const fn of this.listeners.get(event.type)??[])fn(event);return !event.defaultPrevented;}
  async emit(type,values={}){const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...values};for(const fn of this.listeners.get(type)??[])await fn(event);return event;}
 }
 class Element extends Target{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.dataset={};this.value='';this._text='';this.classList={toggle(){},add(){},remove(){}};}
  set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
  set textContent(text){this._text=String(text);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent??'').join('');}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
  replaceWith(node){if(this.parentNode){const i=this.parentNode.children.indexOf(this);this.parentNode.children[i]=node;node.parentNode=this.parentNode;}}
  setAttribute(k,v){this.attributes.set(k,String(v));}getAttribute(k){return this.attributes.get(k)??null;}removeAttribute(k){this.attributes.delete(k);}
  reset(){const prefix=this.id?.split('-')[0];for(const [id,element] of ids)if(id.startsWith(prefix+'-')&&['INPUT','SELECT'].includes(element.tagName))element.value=element.tagName==='SELECT'?(id.includes('category')?'all':'years'):'';}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent({type:'close'});}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}
 }
 const document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),getElementById:id=>ids.get(id)??null,body:new Element('body')};
 for(const match of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
  const element=new Element(match[1]);element.id=match[3];element.hidden=/\bhidden\b/.test(match[2]);
  for(const attr of match[2].matchAll(/([\w-]+)="([^"]*)"/g))element.setAttribute(attr[1],attr[2]);
  if(element.tagName==='SELECT')element.value=element.id.includes('category')?'all':'years';
  document.body.append(element);
 }
 const window=new Target();const saved=new Map();window.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 window.confirm=()=>false;window.alert=message=>{throw new Error(message);};window.print=()=>{};
 return {document,window};
}
export function descendants(element){return element.children.flatMap(child=>[child,...(child.children?descendants(child):[])]);}
