-- DEMOSTRACIÓN: empresas/personas/productos ficticios. Partidas ilustrativas.
-- Solo ejecutar sobre esquema vacío. No borra datos.
BEGIN;
INSERT INTO aduana.paises(codigo,nombre) VALUES ('CN','China'),('CR','Costa Rica'),('US','Estados Unidos'),('MX','México'),('PA','Panamá'),('CO','Colombia'),('BR','Brasil'),('AR','Argentina'),('CL','Chile'),('PE','Perú'),('ES','España'),('DE','Alemania'),('JP','Japón'),('KR','Corea del Sur'),('CA','Canadá');
INSERT INTO aduana.operadores(identificacion,nombre) SELECT 'DEMO-IMP-'||i,'Comercial Demostración '||lpad(i::text,2,'0') FROM generate_series(1,15)i;
INSERT INTO aduana.agentes(licencia,nombre) SELECT 'DEMO-LIC-'||i,'Agente Ficticio '||lpad(i::text,2,'0') FROM generate_series(1,15)i;
INSERT INTO aduana.partidas(codigo,nombre,tarifa) SELECT 'ILUST-'||lpad(i::text,4,'0'),'Clasificación académica '||i,(i%5)*2.5 FROM generate_series(1,15)i;
INSERT INTO aduana.productos(sku,nombre,partida_id,unidad)
SELECT 'PRD-'||lpad(i::text,3,'0'),n,i,CASE WHEN i IN(4,7,10,13) THEN 'kg' WHEN i IN(5,11) THEN 'litro' ELSE 'unidad' END
FROM unnest(ARRAY['Panel solar','Computadora portátil','Bicicleta urbana','Café en grano','Aceite vegetal','Motor eléctrico','Tejido de algodón','Lámpara LED','Bomba de agua','Resina industrial','Pintura acrílica','Herramienta manual','Alambre de cobre','Repuesto automotriz','Instrumento de medición']) WITH ORDINALITY t(n,i);
INSERT INTO aduana.bodegas(codigo,nombre,capacidad_kg) SELECT 'BOD-'||lpad(i::text,2,'0'),CASE WHEN i=2 THEN 'Bodega 2 — inspección' ELSE 'Depósito '||lpad(i::text,2,'0') END,100000+i*5000 FROM generate_series(1,15)i;
INSERT INTO aduana.funcionarios(codigo,nombre) SELECT 'FUN-'||lpad(i::text,3,'0'),'Funcionario Ficticio '||lpad(i::text,2,'0') FROM generate_series(1,15)i;
INSERT INTO aduana.declaraciones(numero,operador_id,agente_id,fecha,regimen)
SELECT 'DUA-2026-'||lpad(i::text,5,'0'),i,i,date '2026-10-01'+i-1,CASE WHEN i=15 THEN 'TRANSITO' ELSE 'IMPORTACION' END FROM generate_series(1,15)i;
INSERT INTO aduana.detalles(declaracion_id,linea,producto_id,pais_id,cantidad,valor_unitario,tarifa_aplicada,producto_nombre,unidad)
SELECT i,1,i,i,100+i*10,20+i*12,p.tarifa,pr.nombre,pr.unidad FROM generate_series(1,15)i JOIN aduana.productos pr ON pr.id=i JOIN aduana.partidas p ON p.id=pr.partida_id;
INSERT INTO aduana.detalles(declaracion_id,linea,producto_id,pais_id,cantidad,valor_unitario,tarifa_aplicada,producto_nombre,unidad)
SELECT i,2,1,CASE WHEN i%2=0 THEN 1 ELSE 3 END,50+i*5,125,0,'Panel solar','unidad' FROM generate_series(1,15)i;
INSERT INTO aduana.contenedores(codigo,declaracion_id,pais_id,fecha_recepcion)
SELECT 'DEMO-CONT-'||lpad(i::text,4,'0'),((i-1)%15)+1,((i-1)%15)+1,date '2026-10-01'+((i-1)%15) FROM generate_series(1,30)i;
INSERT INTO aduana.lotes(codigo,detalle_id,creado_en) SELECT 'LOT-2026-'||lpad(i::text,4,'0'),i,timestamptz '2026-10-16 08:00:00-06' FROM generate_series(1,30)i;
-- Usuarios son tablas técnicas; sus hashes se insertan desde scripts/database.ts.
COMMIT;
