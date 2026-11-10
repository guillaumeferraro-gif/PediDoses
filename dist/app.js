const byId = id => document.getElementById(id);
const tabs = [byId('quick-tab'), byId('ampoules-tab')];
function activateTab(tab) {
  if (byId('ampoules-tab').getAttribute('aria-selected') === 'true' && tab.id !== 'ampoules-tab') {
    const event = new Event('admin-leave', {cancelable:true});
    if (!window.dispatchEvent(event)) return false;
  }
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    item.classList.toggle('active', active);
    byId(item.getAttribute('aria-controls')).hidden = !active;
  }
  return true;
}
for (const tab of tabs) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(tabs.indexOf(tab) + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(tabs.indexOf(tab) - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) {
      event.preventDefault();
      if (activateTab(next)) next.focus();
    }
  });
}
