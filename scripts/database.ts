import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { configureDemoAccounts } from './demo-accounts.js';

const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL });
await client.connect();
try {
  if (process.argv[2] === 'migrate') {
    await client.query(await readFile('database/migrations/001_schema.sql', 'utf8'));
    await client.query(await readFile('database/migrations/002_catalog_guards.sql', 'utf8'));
    await client.query(await readFile('database/migrations/003_movement_null_guard.sql', 'utf8'));
    await client.query(await readFile('database/roles/grants.sql', 'utf8'));
    console.log('Migración y permisos aplicados. No se borraron tablas.');
  } else if (process.argv[2] === 'seed') {
    await client.query(await readFile('database/seeds/demo.sql', 'utf8'));
    await client.query(await readFile('database/seeds/nombres.sql', 'utf8'));
    await configureDemoAccounts(client);
    for (let i = 1; i <= 30; i++) {
      const bodega = i === 1 || i === 16 ? 2 : ((i - 1) % 15) + 1;
      const qty = i <= 15 ? 100 + i * 10 : 50 + (i - 15) * 5;
      await client.query('SELECT aduana.mover($1,1,\'RECEPCION\',$2,NULL,$3,$4,$5)', [randomUUID(), i, bodega, qty, 'Recepción de demostración']);
      await client.query('SELECT aduana.inspeccionar(1,$1,$2,$3,$4)', [i, ((i - 1) % 15) + 1, i % 3 === 1 ? 'RETENER' : 'APROBADO', i % 3 === 1 ? 'Verificar documentación de origen (demostración)' : 'Revisión de demostración conforme']);
      if (i % 3 !== 1) await client.query("SELECT aduana.liberar(1,$1,'Inspección aprobada de demostración')", [i]);
    }
    await client.query("SELECT aduana.mover($1,1,'TRASLADO',2,2,3,20,'Distribución entre bodegas')", [randomUUID()]);
    await client.query("SELECT aduana.mover($1,1,'SALIDA',3,3,NULL,30,'Salida parcial de demostración')", [randomUUID()]);
    await client.query("SELECT aduana.mover($1,1,'SALIDA',6,6,NULL,160,'Salida total de demostración')", [randomUUID()]);
    await client.query("UPDATE aduana.movimientos SET fecha='2026-10-16 09:00:00-06'::timestamptz + id * interval '1 minute'");
    await client.query("UPDATE aduana.inspecciones SET fecha='2026-10-16 12:00:00-06'");
    await client.query("UPDATE aduana.lotes SET liberado_en='2026-10-16 13:00:00-06' WHERE estado='LIBERADO'");
    await client.query("UPDATE aduana.movimientos SET fecha='2026-10-16 14:00:00-06' WHERE tipo<>'RECEPCION'");
    await client.query("UPDATE aduana.eventos SET fecha='2026-10-16 13:00:00-06'");
    console.log('Seed creado: 15+ filas por tabla de negocio. Cuentas en .local/cuentas-demo.txt.');
  } else throw new Error('Uso: npm run db:migrate | npm run db:seed');
} finally { await client.end(); }
