// Fixed access code: a local editing barrier, without accounts or password management.
const codeDigest = 'c4da69ae24f0bd4c249199ad86cbd660a0c6c3c19cde9862c58785c261f7c695';
export class AdminAccess {
 #unlocked=false;
 #generation=0;
 constructor(expectedDigest=codeDigest){this.expectedDigest=expectedDigest;}
 get unlocked(){return this.#unlocked;}
 get session(){return this.#generation;}
 lock(){this.#unlocked=false;this.#generation++;}
 async unlock(code){
  const generation=++this.#generation;
  this.#unlocked=false;
  if(typeof code!=='string'||!/^[0-9]{8}$/.test(code))return false;
  const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
  const actual=Array.from(new Uint8Array(data),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(generation!==this.#generation)return false;
  this.#unlocked=actual===this.expectedDigest;return this.#unlocked;
 }
 requireUnlocked(){if(!this.#unlocked)throw new Error('Saisir le code d’administration avant toute modification.');}
}
export const adminAccess=new AdminAccess();
