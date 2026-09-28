import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(file=>file.endsWith('.js')))execFileSync(process.execPath,['--check',new URL('../dist/'+file,import.meta.url).pathname],{stdio:'inherit'});
console.log('Syntaxe de tous les modules vérifiée.');
