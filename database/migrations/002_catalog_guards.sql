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
