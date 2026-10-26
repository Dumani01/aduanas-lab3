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
