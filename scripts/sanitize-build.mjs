import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';import {fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else if(/\.(?:mjs|html|js)$/.test(e.name)){const s=await readFile(p,'utf8'),t=s.replaceAll(root,'/site/');if(s!==t)await writeFile(p,t);}}}
await walk(fileURLToPath(new URL('../dist/',import.meta.url)));
