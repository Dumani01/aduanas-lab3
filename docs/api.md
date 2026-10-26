# API local

JSON UTF-8, prefijo /api. Sesión requerida salvo health/login. Cookies HttpOnly/SameSite=strict, 8 horas; regeneración al autenticar y destrucción al salir. Al iniciar sesión GET /auth/me devuelve csrf. POST/PUT/DELETE requieren Origin autorizado y X-CSRF-Token. No hay CORS abierto.

| Método y ruta | Entrada | Permiso / respuesta |
|---|---|---|
| GET /health | — | disponibilidad DB, sin secretos |
| POST /auth/login | nombre,password | cookie nueva |
| GET /auth/me | — | usuario,rol,csrf |
| POST /auth/logout | — | revoca sesión |
| GET /catalogos/:tabla | q,page | lista 50; tabla en allowlist |
| POST /catalogos/:tabla | campos del catálogo | administrador, alta |
| PUT /catalogos/:tabla/:id | campos completos | administrador; unidad producto inmutable |
| DELETE /catalogos/:tabla/:id | — | administrador; FK protege historia |
| GET /referencias | — | referencias hasta 1000 por catálogo |
| GET /declaraciones | q,page | número/importador, 50 |
| POST /declaraciones | numero,operador_id,agente_id,fecha,regimen,detalles[],contenedores[] | operador/admin; transacción, crea lotes |
| GET /declaraciones/:id | — | encabezado, detalle, contenedores |
| GET /lotes | q,estado,bodega,page | 50 lotes; saldo total de lote; bodega filtra existencia positiva |
| GET /lotes/:id | — | origen, existencias, últimos 100 movimientos/inspecciones/eventos |
| POST /movimientos | clave UUID,tipo,lote_id,origen_id,destino_id,cantidad string,motivo | operador/admin; función SQL, respuesta clave/repetida |
| GET /movimientos | page | historial 50 |
| POST /inspecciones | lote_id,funcionario_id,resultado,observaciones | operador/admin |
| GET /inspecciones | page | historial 50 |
| POST /lotes/:id/liberar | motivo | operador/admin, última inspección APROBADO |
| GET /dashboard | — | KPI actuales, stock por unidad, recientes |
| GET /reportes/:name | parámetros definidos en reports.json | SQL fijo, rol lector, máximo 100 |
| GET /chat/config | — | booleano de configuración, no secretos |
| POST /chat | mensaje (1-2000 caracteres) | backend→n8n; sessionId de servidor |

Errores: 401 sesión; 403 permisos/origen/CSRF; 404 recurso; 409 conflicto o regla de negocio; 422 validación con fields.path/message; 503 servicio/configuración; 502/504 fallos de n8n. No se devuelven consultas SQL ni cadenas de conexión. Formularios conservan datos y deshabilitan envío pendiente. Límite 24KB JSON, 180 solicitudes/minuto general y 10/minuto chat; timeout SQL app 10s y lector 3s.

Catálogos: paises,operadores,agentes,partidas,productos,bodegas,funcionarios. No hay CRUD genérico para saldos, estados ni movimientos.
