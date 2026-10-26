-- Integrantes: PENDIENTE. Gestor PostgreSQL 18. Fecha 2026-10-23.
-- Ejecutar como propietario en una base NUEVA, previamente creada fuera de transacción.
-- No crea ni borra bases. No reejecutar sobre un esquema existente.
-- Datos ficticios. Cuenta técnica sin contraseña utilizable. Roles: ejecutar database/roles/grants.sql por separado.
-- Inventario aduanero académico. Integrantes: PENDIENTE.
-- Gestor: PostgreSQL. Fecha de referencia: 2026-10-23.
BEGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA aduana;
CREATE SCHEMA reporting;
CREATE TABLE aduana.paises (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo char(2) NOT NULL UNIQUE,
 nombre varchar(100) NOT NULL UNIQUE
);
CREATE TABLE aduana.operadores (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, identificacion varchar(40) NOT NULL UNIQUE,
 nombre varchar(160) NOT NULL, activo boolean NOT NULL DEFAULT true
);
CREATE TABLE aduana.agentes (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, licencia varchar(40) NOT NULL UNIQUE,
 nombre varchar(160) NOT NULL, activo boolean NOT NULL DEFAULT true
);
CREATE TABLE aduana.partidas (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo varchar(20) NOT NULL UNIQUE,
 nombre varchar(160) NOT NULL, tarifa numeric(6,3) NOT NULL DEFAULT 0 CHECK(tarifa BETWEEN 0 AND 100)
);
CREATE TABLE aduana.productos (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sku varchar(40) NOT NULL UNIQUE,
 nombre varchar(160) NOT NULL, partida_id bigint NOT NULL REFERENCES aduana.partidas,
 unidad varchar(10) NOT NULL CHECK(unidad IN ('unidad','kg','litro')),
 activo boolean NOT NULL DEFAULT true
);
CREATE TABLE aduana.bodegas (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo varchar(30) NOT NULL UNIQUE,
 nombre varchar(160) NOT NULL, capacidad_kg numeric(16,3) NOT NULL CHECK(capacidad_kg>0),
 activo boolean NOT NULL DEFAULT true
);
CREATE TABLE aduana.funcionarios (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo varchar(30) NOT NULL UNIQUE,
 nombre varchar(160) NOT NULL, activo boolean NOT NULL DEFAULT true
);
CREATE TABLE aduana.declaraciones (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, numero varchar(40) NOT NULL UNIQUE,
 operador_id bigint NOT NULL REFERENCES aduana.operadores,
 agente_id bigint NOT NULL REFERENCES aduana.agentes,
 fecha date NOT NULL, regimen varchar(20) NOT NULL CHECK(regimen IN ('IMPORTACION','EXPORTACION','TRANSITO')),
 estado varchar(20) NOT NULL DEFAULT 'REGISTRADA' CHECK(estado IN ('REGISTRADA','ANULADA')),
 moneda char(3) NOT NULL DEFAULT 'USD' CHECK(moneda='USD')
);
CREATE TABLE aduana.detalles (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 declaracion_id bigint NOT NULL REFERENCES aduana.declaraciones,
 linea integer NOT NULL CHECK(linea>0), producto_id bigint NOT NULL REFERENCES aduana.productos,
 pais_id bigint NOT NULL REFERENCES aduana.paises,
 cantidad numeric(16,3) NOT NULL CHECK(cantidad>0),
 valor_unitario numeric(16,4) NOT NULL CHECK(valor_unitario>=0),
 tarifa_aplicada numeric(6,3) NOT NULL CHECK(tarifa_aplicada BETWEEN 0 AND 100),
 producto_nombre varchar(160) NOT NULL, unidad varchar(10) NOT NULL CHECK(unidad IN ('unidad','kg','litro')),
 UNIQUE(declaracion_id,linea), CHECK(unidad<>'unidad' OR cantidad=trunc(cantidad))
);
CREATE TABLE aduana.contenedores (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo varchar(30) NOT NULL UNIQUE,
 declaracion_id bigint NOT NULL REFERENCES aduana.declaraciones,
 pais_id bigint NOT NULL REFERENCES aduana.paises, fecha_recepcion date NOT NULL
);
CREATE TABLE aduana.lotes (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, codigo varchar(40) NOT NULL UNIQUE,
 detalle_id bigint NOT NULL REFERENCES aduana.detalles,
 estado varchar(15) NOT NULL DEFAULT 'RETENIDO' CHECK(estado IN ('RETENIDO','LIBERADO')),
 creado_en timestamptz NOT NULL DEFAULT now(), liberado_en timestamptz,
 CHECK((estado='RETENIDO' AND liberado_en IS NULL) OR (estado='LIBERADO' AND liberado_en IS NOT NULL))
);
CREATE TABLE aduana.existencias (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 lote_id bigint NOT NULL REFERENCES aduana.lotes, bodega_id bigint NOT NULL REFERENCES aduana.bodegas,
 cantidad numeric(16,3) NOT NULL DEFAULT 0 CHECK(cantidad>=0), UNIQUE(lote_id,bodega_id)
);
CREATE TABLE aduana.usuarios (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, nombre varchar(100) NOT NULL UNIQUE,
 password_hash text NOT NULL, rol varchar(15) NOT NULL CHECK(rol IN ('administrador','operador','consulta')),
 activo boolean NOT NULL DEFAULT true
);
CREATE TABLE aduana.operaciones (
 clave uuid PRIMARY KEY, usuario_id bigint NOT NULL REFERENCES aduana.usuarios,
 payload jsonb NOT NULL, creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE aduana.movimientos (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 lote_id bigint NOT NULL REFERENCES aduana.lotes, bodega_id bigint NOT NULL REFERENCES aduana.bodegas,
 tipo varchar(20) NOT NULL CHECK(tipo IN ('RECEPCION','TRASLADO_ENTRADA','TRASLADO_SALIDA','SALIDA')),
 cantidad numeric(16,3) NOT NULL CHECK(cantidad<>0),
 fecha timestamptz NOT NULL DEFAULT now(), motivo varchar(500) NOT NULL CHECK(length(trim(motivo))>=3),
 usuario_id bigint NOT NULL REFERENCES aduana.usuarios, operacion_id uuid NOT NULL REFERENCES aduana.operaciones,
 CHECK((tipo IN ('RECEPCION','TRASLADO_ENTRADA') AND cantidad>0) OR (tipo IN ('SALIDA','TRASLADO_SALIDA') AND cantidad<0))
);
CREATE TABLE aduana.inspecciones (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, lote_id bigint NOT NULL REFERENCES aduana.lotes,
 funcionario_id bigint NOT NULL REFERENCES aduana.funcionarios,
 resultado varchar(15) NOT NULL CHECK(resultado IN ('RETENER','APROBADO')),
 observaciones varchar(1000) NOT NULL, fecha timestamptz NOT NULL DEFAULT now(),
 usuario_id bigint NOT NULL REFERENCES aduana.usuarios
);
CREATE TABLE aduana.eventos (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, lote_id bigint NOT NULL REFERENCES aduana.lotes,
 usuario_id bigint NOT NULL REFERENCES aduana.usuarios, accion varchar(30) NOT NULL,
 motivo varchar(500) NOT NULL, fecha timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE aduana.sesiones (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL);
CREATE INDEX sesiones_expire_idx ON aduana.sesiones(expire);
CREATE INDEX detalles_producto_idx ON aduana.detalles(producto_id);
CREATE INDEX detalles_pais_idx ON aduana.detalles(pais_id);
CREATE INDEX movimientos_lote_fecha_idx ON aduana.movimientos(lote_id,fecha,id);
CREATE INDEX inspecciones_lote_idx ON aduana.inspecciones(lote_id,id DESC);
CREATE INDEX existencias_bodega_idx ON aduana.existencias(bodega_id);

CREATE VIEW reporting.inventario AS
SELECT e.id,e.lote_id,l.codigo AS lote,l.estado,e.bodega_id,b.nombre AS bodega,
 d.producto_id,d.producto_nombre AS producto,d.unidad,e.cantidad,d.pais_id,p.nombre AS origen,
 dc.id AS declaracion_id,dc.numero AS declaracion,dc.operador_id,o.nombre AS importador
FROM aduana.existencias e JOIN aduana.lotes l ON l.id=e.lote_id
JOIN aduana.detalles d ON d.id=l.detalle_id JOIN aduana.declaraciones dc ON dc.id=d.declaracion_id
JOIN aduana.paises p ON p.id=d.pais_id JOIN aduana.operadores o ON o.id=dc.operador_id
JOIN aduana.bodegas b ON b.id=e.bodega_id;
CREATE VIEW reporting.valor_declaraciones AS
SELECT dc.id,dc.numero,dc.fecha,dc.regimen,dc.estado,dc.moneda,dc.operador_id,o.nombre AS importador,
coalesce(sum(d.cantidad*d.valor_unitario),0)::numeric(20,4) AS valor
FROM aduana.declaraciones dc JOIN aduana.operadores o ON o.id=dc.operador_id
LEFT JOIN aduana.detalles d ON d.declaracion_id=dc.id GROUP BY dc.id,o.nombre;
CREATE VIEW reporting.contenedores AS SELECT c.id,c.codigo,c.declaracion_id,c.fecha_recepcion,p.nombre AS origen
FROM aduana.contenedores c JOIN aduana.paises p ON p.id=c.pais_id;
CREATE VIEW reporting.inspecciones AS SELECT i.id,i.lote_id,l.codigo AS lote,i.resultado,i.observaciones,i.fecha,f.nombre AS funcionario
FROM aduana.inspecciones i JOIN aduana.lotes l ON l.id=i.lote_id JOIN aduana.funcionarios f ON f.id=i.funcionario_id;
CREATE VIEW reporting.movimientos AS SELECT m.id,m.lote_id,l.codigo AS lote,m.bodega_id,b.nombre AS bodega,m.tipo,m.cantidad,m.fecha,m.motivo,d.unidad
FROM aduana.movimientos m JOIN aduana.lotes l ON l.id=m.lote_id JOIN aduana.detalles d ON d.id=l.detalle_id JOIN aduana.bodegas b ON b.id=m.bodega_id;

CREATE FUNCTION aduana.mover(p_clave uuid,p_usuario bigint,p_tipo text,p_lote bigint,p_origen bigint,p_destino bigint,p_cantidad numeric,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,aduana AS $$
DECLARE v_estado text; v_unidad text; v_detalle bigint; v_max numeric; v_saldo numeric; v_payload jsonb; v_previo jsonb; v_anulada text; v_bodega bigint;
BEGIN
 IF p_tipo IS NULL OR p_cantidad IS NULL OR p_motivo IS NULL OR p_tipo NOT IN ('RECEPCION','TRASLADO','SALIDA') OR p_cantidad<=0 OR p_cantidad<>round(p_cantidad,3) OR length(trim(p_motivo))<3 THEN RAISE EXCEPTION 'Datos de operación inválidos' USING ERRCODE='P0001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aduana.usuarios WHERE id=p_usuario AND activo AND rol IN ('administrador','operador')) THEN RAISE EXCEPTION 'Operación no autorizada'; END IF;
 SELECT estado,detalle_id INTO v_estado,v_detalle FROM aduana.lotes WHERE id=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote inexistente'; END IF;
 SELECT d.unidad,d.cantidad,dc.estado INTO v_unidad,v_max,v_anulada FROM aduana.detalles d JOIN aduana.declaraciones dc ON dc.id=d.declaracion_id WHERE d.id=v_detalle FOR UPDATE OF d;
 v_payload=jsonb_build_object('tipo',p_tipo,'lote',p_lote,'origen',p_origen,'destino',p_destino,'cantidad',p_cantidad,'motivo',p_motivo,'usuario',p_usuario);
 INSERT INTO aduana.operaciones(clave,usuario_id,payload) VALUES(p_clave,p_usuario,v_payload) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN
   SELECT payload INTO v_previo FROM aduana.operaciones WHERE clave=p_clave;
   IF v_previo<>v_payload THEN RAISE EXCEPTION 'Clave de idempotencia reutilizada con otros datos'; END IF;
   RETURN jsonb_build_object('clave',p_clave,'repetida',true);
 END IF;
 IF v_anulada='ANULADA' THEN RAISE EXCEPTION 'Declaración anulada'; END IF;
 IF v_unidad='unidad' AND p_cantidad<>trunc(p_cantidad) THEN RAISE EXCEPTION 'La unidad requiere cantidad entera'; END IF;
 IF p_tipo='TRASLADO' AND (p_origen IS NULL OR p_destino IS NULL OR p_origen=p_destino) THEN RAISE EXCEPTION 'Seleccione bodegas distintas'; END IF;
 IF p_tipo='SALIDA' AND v_estado<>'LIBERADO' THEN RAISE EXCEPTION 'Mercancía retenida'; END IF;
 -- Bloqueo ordenado de bodegas: capacidad consistente incluso entre lotes distintos.
 FOR v_bodega IN SELECT id FROM aduana.bodegas WHERE id IN (p_origen,p_destino) ORDER BY id FOR UPDATE LOOP NULL; END LOOP;
 IF p_tipo IN ('RECEPCION','TRASLADO') THEN
   IF NOT EXISTS(SELECT 1 FROM aduana.bodegas WHERE id=p_destino AND activo) THEN RAISE EXCEPTION 'Bodega destino no disponible'; END IF;
   IF v_unidad='kg' AND (SELECT coalesce(sum(e.cantidad),0) FROM aduana.existencias e JOIN aduana.lotes l ON l.id=e.lote_id JOIN aduana.detalles d ON d.id=l.detalle_id WHERE e.bodega_id=p_destino AND d.unidad='kg')+p_cantidad>(SELECT capacidad_kg FROM aduana.bodegas WHERE id=p_destino) THEN RAISE EXCEPTION 'Capacidad de bodega excedida'; END IF;
 END IF;
 IF p_tipo='RECEPCION' THEN
   IF (SELECT coalesce(sum(m.cantidad),0) FROM aduana.movimientos m JOIN aduana.lotes l ON l.id=m.lote_id WHERE l.detalle_id=v_detalle AND m.tipo='RECEPCION')+p_cantidad>v_max THEN RAISE EXCEPTION 'Recepción supera cantidad declarada'; END IF;
 ELSE
   IF NOT EXISTS(SELECT 1 FROM aduana.bodegas WHERE id=p_origen AND activo) THEN RAISE EXCEPTION 'Bodega origen no disponible'; END IF;
   SELECT cantidad INTO v_saldo FROM aduana.existencias WHERE lote_id=p_lote AND bodega_id=p_origen FOR UPDATE;
   IF coalesce(v_saldo,0)<p_cantidad THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
   UPDATE aduana.existencias SET cantidad=cantidad-p_cantidad WHERE lote_id=p_lote AND bodega_id=p_origen;
   INSERT INTO aduana.movimientos(lote_id,bodega_id,tipo,cantidad,motivo,usuario_id,operacion_id) VALUES(p_lote,p_origen,CASE WHEN p_tipo='SALIDA' THEN 'SALIDA' ELSE 'TRASLADO_SALIDA' END,-p_cantidad,p_motivo,p_usuario,p_clave);
 END IF;
 IF p_tipo IN ('RECEPCION','TRASLADO') THEN
   INSERT INTO aduana.existencias(lote_id,bodega_id,cantidad) VALUES(p_lote,p_destino,p_cantidad) ON CONFLICT(lote_id,bodega_id) DO UPDATE SET cantidad=aduana.existencias.cantidad+excluded.cantidad;
   INSERT INTO aduana.movimientos(lote_id,bodega_id,tipo,cantidad,motivo,usuario_id,operacion_id) VALUES(p_lote,p_destino,CASE WHEN p_tipo='RECEPCION' THEN 'RECEPCION' ELSE 'TRASLADO_ENTRADA' END,p_cantidad,p_motivo,p_usuario,p_clave);
 END IF;
 RETURN jsonb_build_object('clave',p_clave,'repetida',false);
END $$;

CREATE FUNCTION aduana.inspeccionar(p_usuario bigint,p_lote bigint,p_funcionario bigint,p_resultado text,p_observaciones text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,aduana AS $$
DECLARE v_id bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM aduana.usuarios WHERE id=p_usuario AND activo AND rol IN ('administrador','operador')) THEN RAISE EXCEPTION 'Operación no autorizada'; END IF;
 PERFORM 1 FROM aduana.lotes WHERE id=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote inexistente'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aduana.funcionarios WHERE id=p_funcionario AND activo) THEN RAISE EXCEPTION 'Funcionario no disponible'; END IF;
 INSERT INTO aduana.inspecciones(lote_id,funcionario_id,resultado,observaciones,usuario_id) VALUES(p_lote,p_funcionario,p_resultado,p_observaciones,p_usuario) RETURNING id INTO v_id;
 IF p_resultado='RETENER' THEN UPDATE aduana.lotes SET estado='RETENIDO',liberado_en=NULL WHERE id=p_lote; END IF;
 RETURN v_id;
END $$;
CREATE FUNCTION aduana.liberar(p_usuario bigint,p_lote bigint,p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,aduana AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM aduana.usuarios WHERE id=p_usuario AND activo AND rol IN ('administrador','operador')) THEN RAISE EXCEPTION 'Operación no autorizada'; END IF;
 PERFORM 1 FROM aduana.lotes WHERE id=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote inexistente'; END IF;
 IF length(trim(p_motivo))<3 THEN RAISE EXCEPTION 'Indique motivo'; END IF;
 IF (SELECT resultado FROM aduana.inspecciones WHERE lote_id=p_lote ORDER BY id DESC LIMIT 1) IS DISTINCT FROM 'APROBADO' THEN RAISE EXCEPTION 'Requiere última inspección aprobada'; END IF;
 IF EXISTS(SELECT 1 FROM aduana.lotes WHERE id=p_lote AND estado='LIBERADO') THEN RETURN; END IF;
 UPDATE aduana.lotes SET estado='LIBERADO',liberado_en=now() WHERE id=p_lote;
 INSERT INTO aduana.eventos(lote_id,usuario_id,accion,motivo) VALUES(p_lote,p_usuario,'LIBERACION',p_motivo);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA aduana FROM PUBLIC;
REVOKE ALL ON SCHEMA aduana,reporting FROM PUBLIC;
COMMIT;

BEGIN;
-- Protege invariantes también ante INSERT directo con el rol de aplicación.
CREATE FUNCTION aduana.validar_detalle() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,aduana AS $$
DECLARE v_nombre text;v_unidad text;v_tarifa numeric;
BEGIN
 SELECT p.nombre,p.unidad,t.tarifa INTO v_nombre,v_unidad,v_tarifa FROM aduana.productos p JOIN aduana.partidas t ON t.id=p.partida_id WHERE p.id=NEW.producto_id AND p.activo FOR SHARE OF p,t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
 NEW.producto_nombre=v_nombre;NEW.unidad=v_unidad;NEW.tarifa_aplicada=v_tarifa;
 RETURN NEW;
END $$;
CREATE TRIGGER detalle_snapshot BEFORE INSERT ON aduana.detalles FOR EACH ROW EXECUTE FUNCTION aduana.validar_detalle();
CREATE FUNCTION aduana.validar_bodega() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,aduana AS $$
BEGIN
 IF NEW.capacidad_kg < (SELECT coalesce(sum(e.cantidad),0) FROM aduana.existencias e JOIN aduana.lotes l ON l.id=e.lote_id JOIN aduana.detalles d ON d.id=l.detalle_id WHERE e.bodega_id=NEW.id AND d.unidad='kg') THEN RAISE EXCEPTION 'La capacidad no puede ser menor que el saldo en kg'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER bodega_capacidad BEFORE UPDATE OF capacidad_kg ON aduana.bodegas FOR EACH ROW EXECUTE FUNCTION aduana.validar_bodega();
REVOKE ALL ON FUNCTION aduana.validar_detalle(),aduana.validar_bodega() FROM PUBLIC;
COMMIT;

-- Guardas NULL. Definicion generada desde 001_schema.sql para actualizar sin borrar datos.
BEGIN;
CREATE OR REPLACE FUNCTION aduana.mover(p_clave uuid,p_usuario bigint,p_tipo text,p_lote bigint,p_origen bigint,p_destino bigint,p_cantidad numeric,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,aduana AS $$
DECLARE v_estado text; v_unidad text; v_detalle bigint; v_max numeric; v_saldo numeric; v_payload jsonb; v_previo jsonb; v_anulada text; v_bodega bigint;
BEGIN
 IF p_tipo IS NULL OR p_cantidad IS NULL OR p_motivo IS NULL OR p_tipo NOT IN ('RECEPCION','TRASLADO','SALIDA') OR p_cantidad<=0 OR p_cantidad<>round(p_cantidad,3) OR length(trim(p_motivo))<3 THEN RAISE EXCEPTION 'Datos de operación inválidos' USING ERRCODE='P0001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aduana.usuarios WHERE id=p_usuario AND activo AND rol IN ('administrador','operador')) THEN RAISE EXCEPTION 'Operación no autorizada'; END IF;
 SELECT estado,detalle_id INTO v_estado,v_detalle FROM aduana.lotes WHERE id=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote inexistente'; END IF;
 SELECT d.unidad,d.cantidad,dc.estado INTO v_unidad,v_max,v_anulada FROM aduana.detalles d JOIN aduana.declaraciones dc ON dc.id=d.declaracion_id WHERE d.id=v_detalle FOR UPDATE OF d;
 v_payload=jsonb_build_object('tipo',p_tipo,'lote',p_lote,'origen',p_origen,'destino',p_destino,'cantidad',p_cantidad,'motivo',p_motivo,'usuario',p_usuario);
 INSERT INTO aduana.operaciones(clave,usuario_id,payload) VALUES(p_clave,p_usuario,v_payload) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN
   SELECT payload INTO v_previo FROM aduana.operaciones WHERE clave=p_clave;
   IF v_previo<>v_payload THEN RAISE EXCEPTION 'Clave de idempotencia reutilizada con otros datos'; END IF;
   RETURN jsonb_build_object('clave',p_clave,'repetida',true);
 END IF;
 IF v_anulada='ANULADA' THEN RAISE EXCEPTION 'Declaración anulada'; END IF;
 IF v_unidad='unidad' AND p_cantidad<>trunc(p_cantidad) THEN RAISE EXCEPTION 'La unidad requiere cantidad entera'; END IF;
 IF p_tipo='TRASLADO' AND (p_origen IS NULL OR p_destino IS NULL OR p_origen=p_destino) THEN RAISE EXCEPTION 'Seleccione bodegas distintas'; END IF;
 IF p_tipo='SALIDA' AND v_estado<>'LIBERADO' THEN RAISE EXCEPTION 'Mercancía retenida'; END IF;
 -- Bloqueo ordenado de bodegas: capacidad consistente incluso entre lotes distintos.
 FOR v_bodega IN SELECT id FROM aduana.bodegas WHERE id IN (p_origen,p_destino) ORDER BY id FOR UPDATE LOOP NULL; END LOOP;
 IF p_tipo IN ('RECEPCION','TRASLADO') THEN
   IF NOT EXISTS(SELECT 1 FROM aduana.bodegas WHERE id=p_destino AND activo) THEN RAISE EXCEPTION 'Bodega destino no disponible'; END IF;
   IF v_unidad='kg' AND (SELECT coalesce(sum(e.cantidad),0) FROM aduana.existencias e JOIN aduana.lotes l ON l.id=e.lote_id JOIN aduana.detalles d ON d.id=l.detalle_id WHERE e.bodega_id=p_destino AND d.unidad='kg')+p_cantidad>(SELECT capacidad_kg FROM aduana.bodegas WHERE id=p_destino) THEN RAISE EXCEPTION 'Capacidad de bodega excedida'; END IF;
 END IF;
 IF p_tipo='RECEPCION' THEN
   IF (SELECT coalesce(sum(m.cantidad),0) FROM aduana.movimientos m JOIN aduana.lotes l ON l.id=m.lote_id WHERE l.detalle_id=v_detalle AND m.tipo='RECEPCION')+p_cantidad>v_max THEN RAISE EXCEPTION 'Recepción supera cantidad declarada'; END IF;
 ELSE
   IF NOT EXISTS(SELECT 1 FROM aduana.bodegas WHERE id=p_origen AND activo) THEN RAISE EXCEPTION 'Bodega origen no disponible'; END IF;
   SELECT cantidad INTO v_saldo FROM aduana.existencias WHERE lote_id=p_lote AND bodega_id=p_origen FOR UPDATE;
   IF coalesce(v_saldo,0)<p_cantidad THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
   UPDATE aduana.existencias SET cantidad=cantidad-p_cantidad WHERE lote_id=p_lote AND bodega_id=p_origen;
   INSERT INTO aduana.movimientos(lote_id,bodega_id,tipo,cantidad,motivo,usuario_id,operacion_id) VALUES(p_lote,p_origen,CASE WHEN p_tipo='SALIDA' THEN 'SALIDA' ELSE 'TRASLADO_SALIDA' END,-p_cantidad,p_motivo,p_usuario,p_clave);
 END IF;
 IF p_tipo IN ('RECEPCION','TRASLADO') THEN
   INSERT INTO aduana.existencias(lote_id,bodega_id,cantidad) VALUES(p_lote,p_destino,p_cantidad) ON CONFLICT(lote_id,bodega_id) DO UPDATE SET cantidad=aduana.existencias.cantidad+excluded.cantidad;
   INSERT INTO aduana.movimientos(lote_id,bodega_id,tipo,cantidad,motivo,usuario_id,operacion_id) VALUES(p_lote,p_destino,CASE WHEN p_tipo='RECEPCION' THEN 'RECEPCION' ELSE 'TRASLADO_ENTRADA' END,p_cantidad,p_motivo,p_usuario,p_clave);
 END IF;
 RETURN jsonb_build_object('clave',p_clave,'repetida',false);
END $$;
REVOKE ALL ON FUNCTION aduana.mover(uuid,bigint,text,bigint,bigint,bigint,numeric,text) FROM PUBLIC;
COMMIT;

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

-- Nombres ficticios de demostración; no corresponden a integrantes del trabajo.
UPDATE aduana.operadores o SET nombre=v.nombre FROM unnest(ARRAY['Aurora Solar Demo','Circuito Norte Demo','Rueda Verde Demo','Café del Horizonte Demo','Oleaginosas del Valle Demo','Motores del Puerto Demo','Textiles Brisa Demo','Luz del Istmo Demo','Hidráulica del Bosque Demo','Polímeros Sendero Demo','Color y Espacio Demo','Herramientas Roble Demo','Metales del Alba Demo','Repuestos del Camino Demo','Precisión del Pacífico Demo']) WITH ORDINALITY v(nombre,id) WHERE o.id=v.id;
UPDATE aduana.agentes a SET nombre=v.nombre FROM unnest(ARRAY['Elena Solís (ficticia)','Marco Vega (ficticio)','Lucía Prado (ficticia)','Daniel Rojas (ficticio)','Sara Méndez (ficticia)','Pablo Cordero (ficticio)','Inés Salas (ficticia)','Diego Valverde (ficticio)','Clara Molina (ficticia)','Andrés Mora (ficticio)','Nadia Castro (ficticia)','Óscar León (ficticio)','Julia Arias (ficticia)','Tomás Campos (ficticio)','Eva Navarro (ficticia)']) WITH ORDINALITY v(nombre,id) WHERE a.id=v.id;
UPDATE aduana.funcionarios f SET nombre=v.nombre FROM unnest(ARRAY['Adriana Montes (ficticia)','Bruno Vargas (ficticio)','Camila Soto (ficticia)','Darío Fuentes (ficticio)','Estela Marín (ficticia)','Fabio Serrano (ficticio)','Gabriela Luna (ficticia)','Hugo Acosta (ficticio)','Irene Pacheco (ficticia)','Julián Miranda (ficticio)','Karla Villalobos (ficticia)','Luis Ocampo (ficticio)','Mariela Chaves (ficticia)','Nicolás Blanco (ficticio)','Olivia Peralta (ficticia)']) WITH ORDINALITY v(nombre,id) WHERE f.id=v.id;
UPDATE aduana.partidas p SET nombre=v.nombre FROM unnest(ARRAY['Paneles fotovoltaicos (ilustrativa)','Equipos portátiles (ilustrativa)','Bicicletas (ilustrativa)','Café (ilustrativa)','Aceites (ilustrativa)','Motores eléctricos (ilustrativa)','Tejidos (ilustrativa)','Iluminación LED (ilustrativa)','Bombas hidráulicas (ilustrativa)','Resinas (ilustrativa)','Pinturas (ilustrativa)','Herramientas (ilustrativa)','Alambre (ilustrativa)','Repuestos (ilustrativa)','Instrumentos de medida (ilustrativa)']) WITH ORDINALITY v(nombre,id) WHERE p.id=v.id;

BEGIN;
INSERT INTO aduana.usuarios(nombre,password_hash,rol) VALUES('sistema-seed','HASH_NO_UTILIZABLE','administrador');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',1,NULL,2,110,'Recepción de demostración');
SELECT aduana.inspeccionar(1,1,1,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',2,NULL,2,120,'Recepción de demostración');
SELECT aduana.inspeccionar(1,2,2,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,2,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',3,NULL,3,130,'Recepción de demostración');
SELECT aduana.inspeccionar(1,3,3,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,3,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',4,NULL,4,140,'Recepción de demostración');
SELECT aduana.inspeccionar(1,4,4,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',5,NULL,5,150,'Recepción de demostración');
SELECT aduana.inspeccionar(1,5,5,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,5,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',6,NULL,6,160,'Recepción de demostración');
SELECT aduana.inspeccionar(1,6,6,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,6,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',7,NULL,7,170,'Recepción de demostración');
SELECT aduana.inspeccionar(1,7,7,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',8,NULL,8,180,'Recepción de demostración');
SELECT aduana.inspeccionar(1,8,8,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,8,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',9,NULL,9,190,'Recepción de demostración');
SELECT aduana.inspeccionar(1,9,9,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,9,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',10,NULL,10,200,'Recepción de demostración');
SELECT aduana.inspeccionar(1,10,10,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',11,NULL,11,210,'Recepción de demostración');
SELECT aduana.inspeccionar(1,11,11,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,11,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',12,NULL,12,220,'Recepción de demostración');
SELECT aduana.inspeccionar(1,12,12,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,12,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',13,NULL,13,230,'Recepción de demostración');
SELECT aduana.inspeccionar(1,13,13,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',14,NULL,14,240,'Recepción de demostración');
SELECT aduana.inspeccionar(1,14,14,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,14,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',15,NULL,15,250,'Recepción de demostración');
SELECT aduana.inspeccionar(1,15,15,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,15,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',16,NULL,2,55,'Recepción de demostración');
SELECT aduana.inspeccionar(1,16,1,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',17,NULL,2,60,'Recepción de demostración');
SELECT aduana.inspeccionar(1,17,2,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,17,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',18,NULL,3,65,'Recepción de demostración');
SELECT aduana.inspeccionar(1,18,3,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,18,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',19,NULL,4,70,'Recepción de demostración');
SELECT aduana.inspeccionar(1,19,4,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',20,NULL,5,75,'Recepción de demostración');
SELECT aduana.inspeccionar(1,20,5,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,20,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',21,NULL,6,80,'Recepción de demostración');
SELECT aduana.inspeccionar(1,21,6,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,21,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',22,NULL,7,85,'Recepción de demostración');
SELECT aduana.inspeccionar(1,22,7,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',23,NULL,8,90,'Recepción de demostración');
SELECT aduana.inspeccionar(1,23,8,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,23,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',24,NULL,9,95,'Recepción de demostración');
SELECT aduana.inspeccionar(1,24,9,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,24,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',25,NULL,10,100,'Recepción de demostración');
SELECT aduana.inspeccionar(1,25,10,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',26,NULL,11,105,'Recepción de demostración');
SELECT aduana.inspeccionar(1,26,11,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,26,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',27,NULL,12,110,'Recepción de demostración');
SELECT aduana.inspeccionar(1,27,12,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,27,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',28,NULL,13,115,'Recepción de demostración');
SELECT aduana.inspeccionar(1,28,13,'RETENER','Inspección ficticia de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',29,NULL,14,120,'Recepción de demostración');
SELECT aduana.inspeccionar(1,29,14,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,29,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'RECEPCION',30,NULL,15,125,'Recepción de demostración');
SELECT aduana.inspeccionar(1,30,15,'APROBADO','Inspección ficticia de demostración');
SELECT aduana.liberar(1,30,'Inspección aprobada de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'TRASLADO',2,2,3,20,'Distribución entre bodegas');
SELECT aduana.mover(gen_random_uuid(),1,'SALIDA',3,3,NULL,30,'Salida parcial de demostración');
SELECT aduana.mover(gen_random_uuid(),1,'SALIDA',6,6,NULL,160,'Salida total de demostración');
UPDATE aduana.movimientos SET fecha='2026-10-16 09:00:00-06'::timestamptz + id * interval '1 minute';
UPDATE aduana.movimientos SET fecha='2026-10-16 14:00:00-06' WHERE tipo<>'RECEPCION';
UPDATE aduana.inspecciones SET fecha='2026-10-16 12:00:00-06';
UPDATE aduana.lotes SET creado_en='2026-10-16 08:00:00-06',liberado_en=CASE WHEN estado='LIBERADO' THEN '2026-10-16 13:00:00-06'::timestamptz END;
UPDATE aduana.eventos SET fecha='2026-10-16 13:00:00-06';
UPDATE aduana.usuarios SET activo=false;
COMMIT;

-- Ocho consultas de referencia. Fechas de octubre 2026, USD, unidades separadas.

-- importaciones
SELECT numero,fecha,importador,valor,moneda FROM reporting.valor_declaraciones WHERE regimen='IMPORTACION' AND fecha >= '2026-10-01'::date AND fecha < '2026-11-01'::date ORDER BY fecha,id;

-- retenidos
SELECT lote,producto,bodega,cantidad,unidad,origen FROM reporting.inventario WHERE estado='RETENIDO' AND cantidad>0 ORDER BY bodega_id,lote_id;

-- pais-contenedores
WITH c AS(SELECT origen,count(*) AS cantidad FROM reporting.contenedores GROUP BY origen) SELECT * FROM c WHERE cantidad=(SELECT max(cantidad) FROM c) ORDER BY origen;

-- importador-valor
WITH v AS(SELECT importador,sum(valor) AS valor FROM reporting.valor_declaraciones WHERE estado<>'ANULADA' GROUP BY operador_id,importador) SELECT *, 'USD' AS moneda FROM v WHERE valor=(SELECT max(valor) FROM v) ORDER BY importador;

-- inspecciones
SELECT * FROM reporting.inspecciones WHERE trim(observaciones)<>'' ORDER BY fecha,id;

-- stock-producto
SELECT producto,bodega,unidad,sum(cantidad) AS cantidad,sum(sum(cantidad)) OVER(PARTITION BY producto,unidad) AS total_producto FROM reporting.inventario WHERE producto_id=1 GROUP BY producto,bodega_id,bodega,unidad ORDER BY bodega_id;

-- china-bodega2
SELECT lote,producto,bodega,cantidad,unidad,origen FROM reporting.inventario WHERE origen='China' AND estado='RETENIDO' AND bodega_id=2 AND cantidad>0 ORDER BY lote_id;

-- movimientos
SELECT * FROM reporting.movimientos WHERE lote_id=1 AND fecha>='2026-10-01T00:00:00-06:00' AND fecha<'2026-11-01T00:00:00-06:00' ORDER BY fecha,id;
