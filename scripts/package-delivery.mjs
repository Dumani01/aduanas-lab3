import 'dotenv/config';
import {readFile,writeFile,copyFile,mkdir,readdir,cp} from 'node:fs/promises';
const exported=JSON.parse(await readFile('.local/workflow-exportado.json','utf8'));
const workflow=Array.isArray(exported)?exported[0]:exported;
// Conservar nodos/conexiones reales exportados; omitir metadatos de instancia/propietario.
const safe={name:workflow.name,nodes:workflow.nodes,connections:workflow.connections,settings:workflow.settings,active:false,pinData:{},tags:[]};
for(const n of safe.nodes)delete n.credentials;
await writeFile('entrega/PENDIENTE_Nombre_Agente_Lab3.json',JSON.stringify(safe,null,2));
const target='entrega/PENDIENTE_Nombre_Evidencia_Lab3';await mkdir(target,{recursive:true});
await cp('evidencias/capturas',target+'/capturas',{recursive:true});
for(const file of await readdir('evidencias'))if(file.endsWith('.json')&&!file.includes('e2e-resultados'))await copyFile('evidencias/'+file,target+'/'+file);
await copyFile('docs/evidencias-lectura.md',target+'/LEER.md');
const excluded=new Set(['node_modules','.local','.git','test-results','tmp','dist']);
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(excluded.has(e.name)||e.name==='.env'||e.name.startsWith('.env.')&&e.name!=='.env.example')continue;const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else files.push(p);}}
await walk('.');
const secrets=Object.entries(process.env).filter(([k,v])=>/^(DATABASE.*URL|TEST_DATABASE.*URL|SESSION_SECRET|N8N_CHAT_TOKEN)$/.test(k)&&v&&v.length>12).map(([,v])=>v);
for(const value of [...secrets]){try{const pwd=decodeURIComponent(new URL(value).password);if(pwd.length>12)secrets.push(pwd);}catch{}}
try{const binding=JSON.parse(await readFile('.local/n8n-bindings.json','utf8'));if(binding.token?.length>12)secrets.push(binding.token);}catch{}
// Las claves públicas de las cuentas demo son intencionales; las credenciales reales de DB/sesión siguen protegidas.
const demoPasswords=new Set(JSON.parse(await readFile('database/seeds/demo-accounts.json','utf8')).map(a=>a.password));
try{for(const line of (await readFile('.local/cuentas-demo.txt','utf8')).split('\n')){const pwd=line.split(': ')[1];if(pwd?.length>12&&!demoPasswords.has(pwd))secrets.push(pwd);}}catch{}
const findings=[];
for(const file of files.filter(f=>/\.(json|md|sql|ts|tsx|js|mjs|html|css|txt|ps1)$/.test(f))){const text=await readFile(file,'utf8');if(secrets.some(s=>text.includes(s)))findings.push(file);}
await writeFile('evidencias/escaneo-secretos.json',JSON.stringify({scope:'Archivos de código, documentación y entrega; excluye .local/.env/dependencias/trazas. Comparación con secretos reales locales, sin mostrar sus valores.',files:files.length,findings,passed:findings.length===0},null,2));
if(findings.length)throw new Error('Se detectaron secretos locales en archivos distribuibles');
console.log(`Entrega preparada. Escaneo: ${files.length} archivos, cero coincidencias con secretos locales.`);
