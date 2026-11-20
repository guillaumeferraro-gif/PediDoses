// Both screens stay mounted: patient, filters and open cards remain in memory.
const screens=['visualisation','administration'];
const fromHash=()=>location.hash==='#administration'?'administration':'visualisation';
let current=fromHash(),position=0,ignorePop=false;
const scroll={visualisation:0,administration:0};
function show(next){
 scroll[current]=window.scrollY;current=next;
 for(const name of screens)document.getElementById(name+'-screen').hidden=name!==next;
 document.getElementById('administration-style').disabled=next!=='administration';
 for(const id of ['visual-base-style','visual-smur-style'])document.getElementById(id).disabled=next!=='visualisation';
 document.title=next==='administration'?'PediDoses — Administration':'PediDoses — Médicaments d’urgence';
 document.getElementById(next+'-screen').focus({preventScroll:true});
 requestAnimationFrame(()=>window.scrollTo({top:scroll[next],behavior:'instant'}));
}
function request(next,proceed,cancel=()=>{}){
 if(next===current){proceed();return;}
 if(current==='administration'){
  const event=new CustomEvent('atelier-admin-leave',{cancelable:true,detail:{proceed,cancel}});
  if(!window.dispatchEvent(event))return;
 }
 proceed();
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-screen]');if(!button)return;
 const next=button.dataset.screen;if(!screens.includes(next))return;event.preventDefault();
 if(next===current)return;
 request(next,()=>{history.pushState({screen:next,position:++position},'','#'+next);show(next);});
});
window.addEventListener('popstate',event=>{
 if(ignorePop){ignorePop=false;return;}
 const next=fromHash(),target=event.state?.position;
 request(next,()=>{position=Number.isInteger(target)?target:position;show(next);},()=>{
  if(Number.isInteger(target)&&target!==position){ignorePop=true;history.go(position-target);}
  else history.replaceState({screen:current,position},'','#'+current);
 });
});
history.replaceState({screen:current,position},'','#'+current);
show(current);
