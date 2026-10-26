import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const url=new URL(process.env.DATABASE_ADMIN_URL); url.pathname='/postgres';
const admin=new pg.Client({connectionString:url.toString()});await admin.connect();
const runs=[];
const suffix=process.argv[2]||'';
if(!/^[a-z0-9_]{0,20}$/.test(suffix))throw new Error('Sufijo de base inválido');
try {
 for(const name of [`aduana_repro_a${suffix}`,`aduana_repro_b${suffix}`]){
  if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount) throw new Error(`${name} ya existe; no se borra. Use otra base nueva y registre la prueba.`);
  await admin.query(`CREATE DATABASE ${name}`);await admin.query(`REVOKE ALL ON DATABASE ${name} FROM PUBLIC`);
  const target=new URL(process.env.DATABASE_ADMIN_URL);target.pathname='/'+name;
  const db=new pg.Client({connectionString:target.toString()});await db.connect();
  try{await db.query(await readFile('entrega/PENDIENTE_Nombre_Aduana_Lab3.sql','utf8'));
   const count=Number((await db.query('SELECT count(*) FROM aduana.movimientos')).rows[0].count);assert.equal(count,34);
   const diff=(await db.query('SELECT e.id FROM aduana.existencias e LEFT JOIN (SELECT lote_id,bodega_id,sum(cantidad) saldo FROM aduana.movimientos GROUP BY lote_id,bodega_id)m USING(lote_id,bodega_id) WHERE e.cantidad<>coalesce(m.saldo,0)')).rows.length;assert.equal(diff,0);
   await assert.rejects(db.query(await readFile('database/migrations/001_schema.sql','utf8')), {code:'42P06'});await db.query('ROLLBACK');
   runs.push({database:name,instalacion:'aprobada',movimientos:count,reconciliacionDiferencias:diff,reejecucion:'rechazada sin borrados implícitos'});
  }finally{await db.end()}
 }
 await writeFile('evidencias/instalaciones-limpias.json',JSON.stringify({runs},null,2));console.log(JSON.stringify(runs));
}finally{await admin.end()}
