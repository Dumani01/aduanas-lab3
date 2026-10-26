import 'dotenv/config';
import pg from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus,totalmem,platform,release} from 'node:os';
import {randomBytes} from 'node:crypto';
import supertest from 'supertest';
import {hashPassword} from '../apps/api/src/password.js';
// Umbrales declarados antes de medir; alcance local, no SLA de producción.
const targets={sqlP95Ms:150,apiDashboardP95Ms:300};
const url=new URL(process.env.DATABASE_ADMIN_URL!);url.pathname='/postgres';
const admin=new pg.Client({connectionString:url.toString()});await admin.connect();
if((await admin.query("SELECT 1 FROM pg_database WHERE datname='aduana_perf'")).rowCount){await admin.end();throw new Error('aduana_perf ya existe. No se borra.');}
await admin.query('CREATE DATABASE aduana_perf');await admin.query('REVOKE ALL ON DATABASE aduana_perf FROM PUBLIC');await admin.query('GRANT CONNECT ON DATABASE aduana_perf TO aduana_app,aduana_reader');await admin.end();
url.pathname='/aduana_perf';const db=new pg.Client({connectionString:url.toString()});await db.connect();
const evidence:Record<string,unknown>={targets,equipo:{cpu:cpus()[0].model,memoriaGB:Math.round(totalmem()/1024**3),os:platform(),release:release(),node:process.version},database:'aduana_perf',scope:'Volumen sintético aislado; sin LLM ni carga multiusuario.'};
try{
 await db.query(await readFile('entrega/PENDIENTE_Nombre_Aduana_Lab3.sql','utf8'));
 await db.query(await readFile('database/roles/grants.sql','utf8'));
 const password=randomBytes(24).toString('hex');await db.query('UPDATE aduana.usuarios SET activo=true,password_hash=$1 WHERE id=1',[hashPassword(password)]);
 await db.query(`INSERT INTO aduana.declaraciones(numero,operador_id,agente_id,fecha,regimen) SELECT 'PERF-'||i,((i-1)%15)+1,((i-1)%15)+1,'2026-10-20','IMPORTACION' FROM generate_series(1,5000)i;
 INSERT INTO aduana.detalles(declaracion_id,linea,producto_id,pais_id,cantidad,valor_unitario,tarifa_aplicada,producto_nombre,unidad) SELECT id,1,((id-1)%15)+1,((id-1)%15)+1,100,25,0,'snapshot automático','unidad' FROM aduana.declaraciones WHERE numero LIKE 'PERF-%';
 INSERT INTO aduana.lotes(codigo,detalle_id) SELECT 'PERF-LOT-'||d.id,d.id FROM aduana.detalles d JOIN aduana.declaraciones dc ON dc.id=d.declaracion_id WHERE dc.numero LIKE 'PERF-%';
 DO $$ DECLARE v RECORD; BEGIN FOR v IN SELECT id FROM aduana.lotes WHERE codigo LIKE 'PERF-LOT-%' LOOP PERFORM aduana.mover(gen_random_uuid(),1,'RECEPCION',v.id,NULL,((v.id-1)%15)+1,100,'Volumen sintético de rendimiento'); END LOOP; END $$;
 ANALYZE;`);
 evidence.counts=(await db.query('SELECT (SELECT count(*) FROM aduana.lotes) AS lotes,(SELECT count(*) FROM aduana.movimientos) AS movimientos,(SELECT count(*) FROM aduana.declaraciones) AS declaraciones')).rows[0];
 const queries=JSON.parse(await readFile('database/queries/reports.json','utf8')) as Record<string,string>;
 const percentile=(times:number[])=>Number(times.sort((a,b)=>a-b)[Math.ceil(times.length*.95)-1].toFixed(3));
 const results:Record<string,unknown>={};
 for(const name of ['retenidos','china-bodega2','importador-valor']){
  const times=[];const sql=`SELECT * FROM (${queries[name]}) r LIMIT 100`;
  for(let i=0;i<31;i++){const start=performance.now();await db.query(sql);if(i)times.push(performance.now()-start);}
  const p95=percentile(times);results[name]={samples:30,p95ms:p95,passed:p95<targets.sqlP95Ms};
 }
 evidence.sql=results;
 for(const key of ['DATABASE_URL','DATABASE_READER_URL']){const u=new URL(process.env[key]!);u.pathname='/aduana_perf';process.env[key]=u.toString();}
 const {createApp}=await import('../apps/api/src/app.js');const {pool,reader}=await import('../apps/api/src/db.js');
 try{
  const request=supertest.agent(createApp());await request.post('/api/auth/login').set('Origin','http://127.0.0.1:5173').send({nombre:'sistema-seed',password}).expect(200);
  const times=[];for(let i=0;i<31;i++){const start=performance.now();await request.get('/api/dashboard').expect(200);if(i)times.push(performance.now()-start);}
  const p95=percentile(times);evidence.apiDashboard={samples:30,p95ms:p95,passed:p95<targets.apiDashboardP95Ms};
 }finally{await pool.end();await reader.end()}
 evidence.timestamp=new Date().toISOString();await writeFile('evidencias/rendimiento.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({counts:evidence.counts,sql:evidence.sql,apiDashboard:evidence.apiDashboard}));
}finally{await db.end()}
