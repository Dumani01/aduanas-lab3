-- Roles LOGIN y contraseñas se aprovisionan fuera de este archivo.
REVOKE ALL ON SCHEMA aduana,reporting FROM PUBLIC;
GRANT USAGE ON SCHEMA aduana,reporting TO aduana_app;
GRANT SELECT ON ALL TABLES IN SCHEMA aduana,reporting TO aduana_app;
GRANT INSERT,UPDATE,DELETE ON aduana.paises,aduana.operadores,aduana.agentes,aduana.partidas,aduana.productos,aduana.bodegas,aduana.funcionarios TO aduana_app;
GRANT INSERT(numero,operador_id,agente_id,fecha,regimen) ON aduana.declaraciones TO aduana_app;
GRANT INSERT ON aduana.detalles,aduana.contenedores TO aduana_app;
GRANT INSERT(codigo,detalle_id) ON aduana.lotes TO aduana_app;
GRANT INSERT,UPDATE,DELETE ON aduana.sesiones TO aduana_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA aduana TO aduana_app;
GRANT EXECUTE ON FUNCTION aduana.mover(uuid,bigint,text,bigint,bigint,bigint,numeric,text),aduana.inspeccionar(bigint,bigint,bigint,text,text),aduana.liberar(bigint,bigint,text) TO aduana_app;
GRANT USAGE ON SCHEMA reporting TO aduana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO aduana_reader;
ALTER ROLE aduana_reader SET default_transaction_read_only=on;
ALTER ROLE aduana_reader SET statement_timeout='3s';
ALTER ROLE aduana_reader SET search_path=reporting;
ALTER ROLE aduana_app SET statement_timeout='10s';
