import 'dotenv/config';
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
await mkdir('.local',{recursive:true});
let config;
if(existsSync('.local/n8n-db.json')) config=JSON.parse(await readFile('.local/n8n-db.json','utf8'));
else {
 const url=new URL(process.env.DATABASE_ADMIN_URL);url.pathname='/postgres';
 const client=new pg.Client({connectionString:url.toString()});await client.connect();
 try {
  config={password:randomBytes(24).toString('hex')};
  if((await client.query("SELECT 1 FROM pg_roles WHERE rolname='n8n_lab3'")).rowCount) throw new Error('Rol n8n_lab3 ya existe; no se modifica');
  await client.query(`CREATE ROLE n8n_lab3 LOGIN PASSWORD '${config.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
  await client.query('CREATE DATABASE n8n_lab3 OWNER n8n_lab3');
  await client.query('REVOKE ALL ON DATABASE n8n_lab3 FROM PUBLIC');
  await writeFile('.local/n8n-db.json',JSON.stringify(config));
 }finally{await client.end()}
}
const args=process.argv.slice(2);
if(!['import:workflow','export:workflow','start','import:credentials','execute'].includes(args[0])) throw new Error('Comando n8n no permitido por este helper');
const cli=process.env.N8N_CLI_PATH||path.join(process.env.APPDATA||'', 'npm/node_modules/n8n/bin/n8n');
const env={...process.env,N8N_USER_FOLDER:path.resolve('.local/n8n'),N8N_DIAGNOSTICS_ENABLED:'false',N8N_VERSION_NOTIFICATIONS_ENABLED:'false',N8N_TEMPLATES_ENABLED:'false',DB_TYPE:'postgresdb',DB_POSTGRESDB_HOST:'127.0.0.1',DB_POSTGRESDB_PORT:'55432',DB_POSTGRESDB_DATABASE:'n8n_lab3',DB_POSTGRESDB_USER:'n8n_lab3',DB_POSTGRESDB_PASSWORD:config.password,N8N_HOST:'127.0.0.1',N8N_LISTEN_ADDRESS:'127.0.0.1',N8N_PORT:'5678',N8N_SECURE_COOKIE:'false'};
const child=spawn(process.execPath,[cli,...args],{env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>process.exit(code??1));
