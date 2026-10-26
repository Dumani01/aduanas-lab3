import 'dotenv/config';
import pg from 'pg';
import {readFileSync} from 'node:fs';
const url=new URL(process.env.DATABASE_ADMIN_URL); url.pathname='/postgres';
const client=new pg.Client({connectionString:url.toString()});
await client.connect();
try {
  const passwords=JSON.parse(readFileSync('.local/role-passwords.json','utf8'));
  for(const [name,password] of [['aduana_app',passwords.app],['aduana_reader',passwords.reader]]) {
    if((await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[name])).rowCount) throw new Error(`Rol ${name} ya existe; no se modifica`);
    if(!/^[a-f0-9]{48}$/.test(password)) throw new Error('Formato de secreto no válido');
    await client.query(`CREATE ROLE ${name} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
  }
  for(const db of ['aduana','aduana_test']) {
    if((await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[db])).rowCount) throw new Error(`Base ${db} ya existe; no se modifica`);
    await client.query(`CREATE DATABASE ${db}`);
    await client.query(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`);
    await client.query(`GRANT CONNECT ON DATABASE ${db} TO aduana_app,aduana_reader`);
  }
  console.log('Roles sin privilegios administrativos y dos bases aisladas creadas.');
} finally {await client.end()}
