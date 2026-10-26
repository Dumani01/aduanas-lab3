# Inventario aduanero · Laboratorio 3

Aplicación local en español con React + TypeScript + **react-router-dom**, API Express y PostgreSQL real. Incluye catálogos, declaraciones con líneas/contenedores, lotes por origen, recepción, inspección, liberación, traslado, salida y dashboard conciliado.

Estado: inventario y navegación comprobados; agente n8n importado pero pendiente de credencial de modelo y ocho respuestas reales. No es una liquidación aduanera legal. Datos comerciales ficticios. Falta el documento original del laboratorio y datos de integrantes.

## Abrir en este equipo

Los servicios de desarrollo se iniciaron en esta sesión:

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:4310/api/health
- PostgreSQL: 127.0.0.1:55432
- Cuentas fijas de demostración local: `.local/cuentas-demo.txt`.

| Usuario | Contraseña fija | Rol |
|---|---|---|
| `admin` | `Aduana2026!` | Administrador |
| `operador` | `Operador2026!` | Operador |
| `consulta` | `Consulta2026!` | Solo lectura |

Estas cuentas son exclusivas de la demostración local. El usuario de acceso es `admin`, no un correo electrónico. Las contraseñas se almacenan con hash scrypt en PostgreSQL y permanecen iguales al reiniciar. `npm.cmd run demo:credentials` restablece estas tres cuentas sin borrar inventario; cierra sus sesiones anteriores. No requiere repetir migraciones ni seed.

Si se reinicia el equipo, desde esta carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local-postgres.ps1 start
npm.cmd run dev
```

Para detener PostgreSQL: `powershell -ExecutionPolicy Bypass -File scripts/local-postgres.ps1 stop`. Para detener web/API: Ctrl+C en su terminal. No ejecutar init, provision ni seed otra vez sobre bases pobladas.

## Preparación desde un entorno nuevo (Windows)

Requiere Node compatible con Vite (probado Node 24.19.0), npm y PostgreSQL. No requiere nube. Docker no estaba disponible; se utilizó la distribución ZIP de PostgreSQL enlazada por su sitio oficial.

1. `npm.cmd ci` instala versiones del lockfile. No es necesario instalar extensiones del editor.
2. Descargar binarios Windows x64 desde [PostgreSQL](https://www.postgresql.org/download/windows/) → [EDB Binaries](https://www.enterprisedb.com/download-postgresql-binaries). En esta sesión se usó el vínculo oficial `https://sbp.enterprisedb.com/getfile.jsp?fileid=1260609`. Extraer la carpeta pgsql bajo `.local/pgsql` (bin, lib y share). No sobrescribir un clúster anterior.
3. `powershell -ExecutionPolicy Bypass -File scripts/local-postgres.ps1 init` crea `.env` con contraseñas aleatorias y el clúster nuevo; falla si ya existen. Inicia exclusivamente en loopback y puerto 55432.
4. `npm.cmd run db:provision` crea roles sin superusuario y las bases aduana/aduana_test. Se conecta a postgres como administrador; CREATE DATABASE no va dentro de BEGIN.
5. `npm.cmd run db:migrate` instala las dos migraciones y los grants en aduana vacía.
6. `npm.cmd run db:seed` crea los datos de demostración y las tres cuentas fijas indicadas arriba; también las anota en `.local/cuentas-demo.txt`.
7. `npm.cmd run dev` inicia web y API. Abrir http://127.0.0.1:5173 e iniciar sesión con una cuenta generada.

Si ya existe un PostgreSQL administrado por usted, crear bases nuevas y roles separados, completar `.env` a partir de `.env.example`, y ejecutar migraciones/roles como propietario. No usar una cuenta administrativa como DATABASE_URL de la aplicación. Nunca compartir el `.env`, `.local`, archivos de contraseñas ni logs de sesiones.

La preparación e instalación del SQL académico se ejecutaron en dos bases nuevas; ver `evidencias/instalaciones-limpias.json`. No se afirma haber instalado todo el proyecto en otro equipo independiente.

## Estructura de React Router DOM

```text
apps/web/src/
  app/          router.tsx, App.tsx, sesión, errores de ruta
  layouts/      AdminLayout con navegación y Outlet
  features/     auth, dashboard, catalogs, declarations, inventory,
                operations, chat, help (pages por módulo)
  components/   tabla, estados y errores compartidos
  lib/          cliente HTTP, formatos y tipos
  styles/       estilos adaptables
apps/api/src/   sesión, validación, permisos y endpoints
database/       migraciones, seed, roles y consultas
n8n/            workflow, prompt y configuración documentada
docs/           matriz, reglas, diccionario, investigación y auditorías
tests/          integración SQL/API y E2E Chromium
evidencias/     resultados ejecutados y capturas
entrega/        cinco entregables con pendientes identificados
```

Rutas centralizadas, módulos con carga diferida, Link/NavLink, parámetros para detalles, filtros en URL, error/404 y protección de navegación. El backend autoriza independientemente. La API de producción sirve dist con fallback para rutas de la SPA; `/api` y archivos inexistentes conservan errores reales.

## Comprobaciones

**Siguiente cierre pendiente: Fase 9 (agente n8n)** y después Fase 10 (chat web con modelo real). Ver [avance por fase](docs/fases.md). `npm.cmd run status` muestra los servicios y los requisitos que faltan, sin contraseñas.

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
node scripts/audit-database.mjs
node scripts/verify-queries.mjs
```

`npm test` confirma host y nombre **aduana_test** antes de reiniciar exclusivamente sus esquemas. No usa aduana. `test:e2e` vuelve a preparar esa base y levanta temporalmente la compilación de producción en puerto 3002. No ejecutar tests simultáneamente contra la misma base. Capturas E2E corresponden a datos de prueba; las cifras de referencia SQL proceden de aduana seed.

Validación ejecutada: 16 pruebas de integración y 3 recorridos E2E; build y lint; recepción idempotente, rollback, salidas concurrentes, parámetros NULL, dos orígenes, FK, instantáneas, mes, roles, CSRF, SQL injection, XSS de observaciones como texto, navegación/recarga/404/403 y 360/768/1440. No constituye auditoría exhaustiva de producción.

Avance n8n: `npm.cmd run n8n:prepare` vincula las credenciales locales y `npm.cmd run n8n:verify-sql` ejecuta un diagnóstico real de las ocho consultas como lector. Ya se comprobaron sus resultados contra SQL directo. `npm.cmd run n8n:start` inicia el editor en http://127.0.0.1:5678. Falta vincular modelo y publicar el workflow; después `npm.cmd run n8n:connect-chat` prepara .env sin exponer el token. Ver n8n/README.md. El diagnóstico SQL no valida las respuestas del agente.

Para servir el build localmente: `npm.cmd run build` y `npm.cmd start`, abrir http://127.0.0.1:4310. Para HTTPS de producción se requiere configurar origen y cookies seguras y revisar infraestructura; no se publicó el servicio.

## Documentos y entrega

- Investigación: `entrega/PENDIENTE_Nombre_Investigacion_Lab3.pdf` (5 páginas revisadas visualmente); fuente `docs/investigacion.json`/`.md`.
- DER: `entrega/PENDIENTE_Nombre_DER_Lab3.png`; fuentes DOT, Mermaid y SVG en docs/diagramas; diccionario completo en docs/diccionario.md.
- SQL: `entrega/PENDIENTE_Nombre_Aduana_Lab3.sql`, esquema, seed y ocho SELECT. Instalar como propietario en una **base nueva** previamente creada. Cuenta técnica sin contraseña utilizable, desactivada al finalizar. Los roles administrativos se preparan aparte.
- Workflow: `entrega/PENDIENTE_Nombre_Agente_Lab3.json`, exportado de n8n sin secretos. Completar credenciales y evidencias según n8n/README.md.
- Evidencias: `entrega/PENDIENTE_Nombre_Evidencia_Lab3/`. Las ocho respuestas del agente siguen pendientes; SQL y capturas web no las sustituyen.

Nombres de integrantes, docente, sección y reflexión personal deben confirmarse y reemplazar PENDIENTE. No subir a Classroom automáticamente.

Regeneración: `node scripts/academic-sql.mjs`; `node scripts/n8n-workflow.mjs`; `node scripts/audit-database.mjs`; `node scripts/render-diagram.mjs`. Para PDF: Python con `reportlab`, `pypdf` y `pymupdf<2`; ejecutar `python scripts/research-pdf.py` y revisar renders nuevamente. El script académico no debe reejecutarse sobre la misma base. `scripts/verify-academic.mjs` crea dos bases nuevas de comprobación y se niega a sobrescribirlas.

## Demostración oral breve

1. Explicar la ruta declaración→detalle→lote→existencia→movimiento y la N:M resuelta.
2. Filtrar lotes: China, RETENIDO, bodega 2. Identificar lote y cantidad sin mezclar orígenes.
3. Crear declaración; recibir lote; intentar salida retenida y explicar rechazo.
4. Inspeccionar, aprobar y liberar; mostrar que liberar no modifica saldo.
5. Trasladar, despachar parcialmente y revisar historia/recarga/dashboard.
6. Mostrar SQL, rol lector y resultados de pruebas. Explicar el bloqueo del agente con transparencia.

Pendientes y continuidad: docs/estado-proyecto.md; aceptación: docs/matriz-requisitos.md; reglas: docs/reglas-negocio.md; API: docs/api.md.
