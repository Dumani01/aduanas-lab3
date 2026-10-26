import {readFile,writeFile,mkdir} from 'node:fs/promises';
const schema=(await readFile('database/migrations/001_schema.sql','utf8'))+'\n'+(await readFile('database/migrations/002_catalog_guards.sql','utf8'))+'\n'+(await readFile('database/migrations/003_movement_null_guard.sql','utf8'));
const seed=(await readFile('database/seeds/demo.sql','utf8'))+'\n'+(await readFile('database/seeds/nombres.sql','utf8'));
const queries=JSON.parse(await readFile('database/queries/reports.json','utf8'));
let sql=`-- Integrantes: PENDIENTE. Gestor PostgreSQL 18. Fecha 2026-10-23.\n-- Ejecutar como propietario en una base NUEVA, previamente creada fuera de transacción.\n-- No crea ni borra bases. No reejecutar sobre un esquema existente.\n-- Datos ficticios. Cuenta técnica sin contraseña utilizable. Roles: ejecutar database/roles/grants.sql por separado.\n${schema}\n${seed}\nBEGIN;\nINSERT INTO aduana.usuarios(nombre,password_hash,rol) VALUES('sistema-seed','HASH_NO_UTILIZABLE','administrador');\n`;
for(let i=1;i<=30;i++){
 const b=i===1||i===16?2:((i-1)%15)+1;const qty=i<=15?100+i*10:50+(i-15)*5;
 sql+=`SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',${i},NULL,${b},${qty},'Recepción de demostración');\n`;
 sql+=`SELECT aduana.inspeccionar(1,${i},${((i-1)%15)+1},'${i%3===1?'RETENER':'APROBADO'}','Inspección ficticia de demostración');\n`;
 if(i%3!==1)sql+=`SELECT aduana.liberar(1,${i},'Inspección aprobada de demostración');\n`;
}
sql+=`SELECT aduana.mover(gen_random_uuid(),1,'TRASLADO',2,2,3,20,'Distribución entre bodegas');
SELECT aduana.mover(gen_random_uuid(),1,'SALIDA',3,3,NULL,30,'Salida parcial de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'SALIDA',6,6,NULL,160,'Salida total de demostración');
UPDATE aduana.movimientos SET fecha='2026-10-16 09:00:00-06'::timestamptz + id * interval '1 minute';
UPDATE aduana.movimientos SET fecha='2026-10-16 14:00:00-06' WHERE tipo<>'RECEPCION';
UPDATE aduana.inspecciones SET fecha='2026-10-16 12:00:00-06';
UPDATE aduana.lotes SET creado_en='2026-10-16 08:00:00-06',liberado_en=CASE WHEN estado='LIBERADO' THEN '2026-10-16 13:00:00-06'::timestamptz END;
UPDATE aduana.eventos SET fecha='2026-10-16 13:00:00-06';
UPDATE aduana.usuarios SET activo=false;
COMMIT;
`;
const parameters={'importaciones':["'2026-10-01'","'2026-11-01'"],'stock-producto':['1'],'movimientos':['1',"'2026-10-01T00:00:00-06:00'","'2026-11-01T00:00:00-06:00'"]};
let queryFile='-- Ocho consultas de referencia. Fechas de octubre 2026, USD, unidades separadas.\n';
for(const [name,q]of Object.entries(queries)) {
 const expanded=q.replace(/\$(\d+)/g,(_s,n)=>parameters[name]?.[Number(n)-1]);
 queryFile+=`\n-- ${name}\n${expanded};\n`;
}
await mkdir('entrega',{recursive:true});
await writeFile('database/queries/consultas.sql',queryFile);
await writeFile('entrega/PENDIENTE_Nombre_Aduana_Lab3.sql',sql+'\n'+queryFile);
console.log('Script académico reproducible generado sin secretos.');
