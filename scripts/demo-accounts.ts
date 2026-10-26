import { readFile, mkdir, writeFile } from 'node:fs/promises';
import type { Client } from 'pg';
import { hashPassword } from '../apps/api/src/password.js';

// Credenciales públicas exclusivamente de la demostración local, solicitadas por el usuario.
export async function configureDemoAccounts(client: Client) {
  const accounts = JSON.parse(await readFile('database/seeds/demo-accounts.json', 'utf8')) as { nombre: string; rol: string; password: string }[];
  await client.query('BEGIN');
  try {
    for (const account of accounts) {
      await client.query(`INSERT INTO aduana.usuarios(nombre,password_hash,rol) VALUES($1,$2,$3)
        ON CONFLICT(nombre) DO UPDATE SET password_hash=excluded.password_hash,rol=excluded.rol,activo=true`,
      [account.nombre, hashPassword(account.password), account.rol]);
    }
    await client.query(`DELETE FROM aduana.sesiones WHERE (sess->>'userId')::text IN
      (SELECT id::text FROM aduana.usuarios WHERE nombre=ANY($1::text[]))`, [accounts.map(a => a.nombre)]);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  await mkdir('.local', { recursive: true });
  await writeFile('.local/cuentas-demo.txt', 'CUENTAS FIJAS DE DEMOSTRACIÓN LOCAL.\n' + accounts.map(a => `${a.nombre}: ${a.password}`).join('\n') + '\n');
}
