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
