import 'dotenv/config';
import pg from 'pg';
import { configureDemoAccounts } from './demo-accounts.js';

const url = new URL(process.env.DATABASE_ADMIN_URL || '');
if (url.pathname !== '/aduana' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Solo se permite configurar cuentas en la base local aduana');
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  const { rows } = await client.query('SELECT current_database() AS name');
  if (rows[0].name !== 'aduana') throw new Error('Base de destino incorrecta');
  await configureDemoAccounts(client);
  console.log('Tres cuentas fijas configuradas. Inventario e historia conservados; sesiones anteriores de estas cuentas cerradas.');
} finally { await client.end(); }
