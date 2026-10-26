# Estado del proyecto

Fecha de referencia: 23 de octubre de 2026. Zona: America/Costa_Rica.

## Fase 0: inspección

El espacio inicial contenía únicamente docs/prompt-maestro.md. No es un repositorio Git. No se encontró Laboratorio_3_Inventario_Aduana.docx en el directorio del laboratorio ni instrucciones AGENTS.md. Los requisitos se toman provisionalmente del prompt; no se afirma haber contrastado el documento original.

Entorno observado: Windows, Node 24.19.0, npm 11.17.0, n8n 2.44.6 instalado globalmente, Git disponible. PostgreSQL y Docker no disponibles en PATH. Se prepara PostgreSQL local aislado, sin instalar servicios de Windows ni modificar bases existentes.

## Plan y puertas

1. Modelo, reglas, DER y SQL: confirmar integridad, trazabilidad y seed.
2. API transaccional: probar saldo, retención, rollback, idempotencia y concurrencia en aduana_test.
3. React Router DOM y pantallas: navegación, API real, recarga y build.
4. n8n: revisar nodos instalados, preparar workflow y ejecutar únicamente con credenciales disponibles.
5. Investigación y entrega: generar documentos y evidencias reales; distinguir bloqueos.

Pendientes externos: documento original; nombres de integrantes/docente/sección; credencial del modelo de IA. No se inventan. La falta de credenciales no bloquea el inventario local.

## Resultado de esta ejecución

Aplicación local implementada y disponible en http://127.0.0.1:5173. Las cuentas fijas de demostración están documentadas en README.md y visibles en el login por solicitud del usuario; las credenciales reales de base de datos y sesión siguen privadas. React Router DOM 7.18.4 organiza rutas/layout/módulos. API en 127.0.0.1:4310; PostgreSQL 18.6 en 55432. El clúster no es un servicio de Windows y debe iniciarse de nuevo después de reiniciar el equipo.

Verificaciones: build de producción y lint; 15 pruebas SQL/API; 3 E2E Chromium sobre build de producción; recarga, 360/768/1440, 404/403, filtro de China/bodega2 y operación completa. Ocho consultas con expectativas independientes, cero diferencias de stock. Script académico final instalado en dos bases nuevas y reejecución rechazada sin borrar datos. Prueba de volumen separada: 5030 lotes y 5034 movimientos; umbrales locales aprobados. Auditoría npm: cero vulnerabilidades conocidas en dependencias de este proyecto. No se auditó todo el árbol de la instalación global preexistente de n8n.

Entregables en entrega/: investigación PDF de cinco páginas revisada visualmente; DER PNG/fuentes/diccionario; SQL completo; JSON exportado de n8n; capturas y resultados reales. Los archivos conservan PENDIENTE en lugar de nombres personales inventados.

n8n: fallo inicial del controlador SQLite resuelto para instancia aislada usando PostgreSQL n8n_lab3. Workflow importado y exportado con código 0. No activado ni ejecutado con modelo; no hay gasto de proveedor ni publicación.

## Siguiente acción y bloqueos precisos

1. Recibir el DOCX original para contrastar requisitos; confirmar integrantes/docente/sección y reflexión de Uso de IA. No se atribuyen experiencias personales.
2. n8n iniciado en 127.0.0.1:5678 y credenciales lector/Header Auth ya vinculadas. Completar cuenta local de propietario si la interfaz la solicita y vincular la credencial del modelo siguiendo n8n/README.md. No entregar secretos por archivos versionados.
3. Publicar el workflow después de configurar modelo y ejecutar `npm.cmd run n8n:connect-chat`; el helper escribe N8N_CHAT_URL/N8N_CHAT_TOKEN solo en .env cuando comprueba los vínculos. Reiniciar API. Ejecutar las ocho preguntas web con comparación SQL, dos sesiones, ambigüedad, vacío, caída de base y pruebas adversariales.
4. Completar evaluación y capturas reales; contrastar y renombrar entregables. Solo después puede evaluarse la puerta final del laboratorio.

Estado: inventario local listo para revisión en el alcance probado. Validación completa del laboratorio y chat LLM bloqueada por faltantes externos. No hay aprobación final ni puntuación inventada. No reiniciar desde cero: conservar bases, seed, código y evidencias; no volver a ejecutar init/provision/seed sobre las bases pobladas.


## Actualización: acceso fijo y editor SQL

Por solicitud del usuario, las cuentas admin/operador/consulta usan las claves fijas de demostración documentadas en README.md. Se actualizaron los hashes sin borrar inventario, se cerraron las sesiones previas y el seed conserva estas mismas claves en instalaciones futuras. Restauración sin seed: npm.cmd run demo:credentials. Los secretos reales de base de datos y sesión continúan aleatorios y fuera de los archivos distribuibles.

El aviso de SQL Server se atiende con mssql.autoDisableNonTSqlLanguageService=true en la configuración del proyecto, verificado contra la extensión instalada. El script es PostgreSQL y no se convirtió a T-SQL.

## Continuación: Fase 9

La siguiente puerta pendiente es Fase 9 (agente n8n), seguida de Fase 10 (chat web completo). Se adelantaron fases independientes de pruebas, rendimiento y documentos; el detalle por fase está en docs/fases.md.

Avance nuevo: credenciales lector y Header Auth importadas/vinculadas en la instancia aislada; un workflow diagnóstico de n8n ejecutó ocho consultas reales como aduana_reader y coincidió con SQL directo. Evidencia evidencias/n8n-sql-real.json. No son respuestas de un modelo ni reemplazan LAB-13.

Se corrigió el defecto DEF-12: tipo NULL en mover podía producir éxito sin movimiento. Migración 003 aplicada sin reiniciar datos, regresión aprobada. Verificación actual: 16 pruebas de integración y 3 E2E, build y lint; SQL actualizado instalado en dos bases nuevas, stock conciliado sin diferencias.

Se puede consultar el estado actual con npm.cmd run status. El diagnóstico de requisitos del chat confirma que faltan credencial del modelo y publicación del workflow. Ni el modelo ni el chat completo se declaran validados.
