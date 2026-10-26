# Agente de consulta local

Versión inspeccionada: n8n 2.44.6. Metadatos reales instalados: Chat Trigger 1.5; Agent 3.1; modelo OpenAI 1.3; Simple Memory 1.4; Postgres Tool 2.7; Webhook 2.1; Code 2. Se contrastaron docs oficiales de Agent y Postgres.

## Estado

Workflow importado con éxito en una instancia aislada de n8n, con base n8n_lab3. La instalación global falló usando SQLite (driver faltante); scripts/n8n-local.mjs usa PostgreSQL en vez de modificar esa instalación.

No se ha ejecutado el modelo ni las ocho preguntas: falta credencial externa. El JSON distribuido no contiene secretos, referencias a credenciales personales ni respuestas precargadas.

### Avance comprobado de la Fase 9

Se ejecutaron ocho consultas reales desde un workflow diagnóstico de n8n contra PostgreSQL con aduana_reader; los resultados coinciden con SQL directo. Evidencia: evidencias/n8n-sql-real.json. Esto valida transporte/credencial/SQL del diagnóstico, **no** respuestas del agente ni selección de herramientas por un modelo.

La instancia local ya tiene la credencial lectora y Header Auth vinculadas al workflow. No se necesita volver a escribir esas contraseñas. El secreto de autenticación permanece en .local y en el almacén cifrado de n8n.

Comandos para repetir la preparación:

```powershell
npm.cmd run n8n:prepare
npm.cmd run n8n:verify-sql
npm.cmd run n8n:start
```

No ejecutar prepare de nuevo después de modificar el workflow en el editor sin guardar/exportar esos cambios: importa la plantilla y reemplaza el borrador local de ese ID. El diagnóstico SQL solo consulta datos y no activa el agente.

### Lo que falta para conectar el chat

1. Abrir http://127.0.0.1:5678. Si n8n solicita la cuenta de propietario, completar los datos reales en esa pantalla local.
2. Abrir el workflow de inventario; vincular la credencial del proveedor al modelo conectado. Las herramientas Postgres y Header Auth ya están preparadas.
3. Guardar/publicar el workflow después de revisar la configuración del modelo.
4. `npm.cmd run n8n:connect-chat -- --check` comprueba los vínculos y la publicación sin mostrar secretos ni activar la web.
5. `npm.cmd run n8n:connect-chat` escribe el URL y token en .env únicamente cuando los requisitos anteriores están presentes. No ejecuta el modelo ni prueba que la clave sea válida.
6. Reiniciar API y probar las ocho preguntas, memoria por sesión, errores y ataques desde datos; completar docs/evaluacion-agente.md con respuestas reales.

La sección siguiente conserva la preparación manual equivalente para un entorno nuevo.

## Preparar y completar

1. PostgreSQL y dependencias listos según README raíz. n8n global instalado; para otra ubicación definir N8N_CLI_PATH apuntando a su bin/n8n.
2. `node scripts/n8n-workflow.mjs` genera JSON desde las mismas ocho consultas de la API.
3. `node scripts/n8n-local.mjs import:workflow --input=n8n/workflow.json` importa sin activar. Este helper crea una base/rol propios solo si no existen; no altera configuraciones n8n ajenas.
4. `node scripts/n8n-local.mjs start` inicia solo en 127.0.0.1:5678. Completar cuenta local de propietario en el navegador si n8n la solicita.
5. Crear credencial Postgres del rol aduana_reader, base aduana, host 127.0.0.1, puerto 55432; tomar contraseña del .env local sin copiarla al JSON. Asignarla a las ocho herramientas. El rol n8n_lab3 es únicamente almacenamiento de n8n y no tiene acceso al inventario.
6. Vincular credencial de modelo al nodo Modelo de chat. El modelo viene de los metadatos instalados (gpt-5-mini); confirmar disponibilidad y costo con la cuenta antes de ejecutar.
7. Crear credencial Header Auth: nombre Authorization y valor Bearer seguido de un secreto aleatorio. Asignarla a Entrada web protegida. Guardar ese mismo secreto en N8N_CHAT_TOKEN local. No exportarlo.
8. Activar workflow y configurar N8N_CHAT_URL=http://127.0.0.1:5678/webhook/aduana-chat. Reiniciar API. Chat Trigger es la entrada académica interna; Webhook normaliza entradas web y comparte el mismo agente.
9. Probar ocho preguntas, compararlas con SQL y guardar capturas web reales. Completar docs/evaluacion-agente.md, incluyendo ambigüedad, vacío, fallos y dos sesiones aisladas.

El agente no genera SQL: parámetros via queryReplacement y consultas constantes. Cada herramienta devuelve filas, limitado y limite, con tope 100 y timeout del rol 3s. Simple Memory usa sessionId aleatorio de servidor y ventana 5; su aislamiento real requiere ejecución de pruebas y solo se contempla un proceso n8n local. No se asume funcionamiento en queue mode.

No activar ni configurar como disponible en la web antes de vincular credenciales. Importar JSON no prueba conexión a PostgreSQL ni al proveedor de IA.
