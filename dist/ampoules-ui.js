import {createProtocolStore} from './protocol-store.js';
import {adminAccess} from './admin-access.js';
import {clearDoseSettings} from './dose-adjustments.js';
let storage=null;try{storage=window.localStorage;}catch{/* The UI reports a failed save explicitly. */}
export const protocolStore=createProtocolStore({storage,access:adminAccess});
export const getConfiguredRecords=()=>protocolStore.getRecords();
const status=()=>{document.getElementById('quick-ampoules-status').textContent=protocolStore.message;};
protocolStore.subscribe(()=>{clearDoseSettings();status();window.dispatchEvent(new Event('ampoules-updated'));});
status();
