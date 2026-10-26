# Investigación aplicada: inventario aduanero


## A. Datos y gestores

### Alcance académico

Este documento explica las decisiones del sistema local de demostración. Integrantes, docente y sección: PENDIENTES de confirmación. Fecha de referencia: 23 de octubre de 2026. La clasificación A/B/C/D es provisional porque no se recibió el DOCX original del laboratorio. El sistema conserva mercancías, procedencia y movimientos; no calcula obligaciones tributarias legales ni representa una aduana real.

### Base de datos y SGBD

Una base de datos es un conjunto organizado de información persistente. Un sistema gestor (SGBD) administra almacenamiento, consultas, integridad, transacciones y acceso concurrente. En este proyecto PostgreSQL guarda el inventario; React presenta datos y la API aplica permisos. Una tabla reúne hechos de un tipo; cada fila es un registro y cada columna representa un atributo con un tipo. Por ejemplo, paises contiene código y nombre; detalles usa numeric para cantidad y valor_unitario, y las declaraciones tienen fecha de tipo date. El tipo evita representaciones ambiguas, pero requiere restricciones adicionales para expresar reglas de negocio.

### Modelo relacional y NoSQL

El modelo relacional organiza datos en tablas vinculadas por claves. Aquí permite consultar lote, país e importador mediante relaciones explícitas. NoSQL agrupa modelos como documentos, clave-valor, columnas anchas y grafos [1]. Un documento puede representar información anidada, pero cambiar de formato no elimina la necesidad de validar cantidades ni proteger operaciones concurrentes. Elegimos relaciones por la trazabilidad entre entidades, los importes exactos y las restricciones del laboratorio; no se afirma que un modelo sea universalmente superior.

### Comparación de gestores

SQLite integra el motor en la aplicación y resulta conveniente para almacenamiento local con poca administración [2]. MySQL con InnoDB ofrece transacciones y gestión concurrente para aplicaciones cliente-servidor [3]. PostgreSQL añade un entorno adecuado para demostrar roles, tipos exactos, bloqueos y funciones transaccionales [4,5]. Los tres pueden modelar inventario, pero la conexión SQL del agente y un rol lector efectivo favorecieron PostgreSQL en este entorno. Su costo es administrar un proceso adicional: aquí se ejecuta en 127.0.0.1:55432, sin nube ni servicio permanente de Windows.

### Separar responsabilidades

La interfaz no mantiene el saldo principal en localStorage ni en un arreglo de JavaScript. La API valida solicitudes y utiliza una función SQL para movimientos. El motor decide si la operación es válida y confirma todos sus cambios conjuntamente. Esta distribución permite recargar la página sin perder la recepción y comprobar el mismo saldo mediante una consulta independiente.


## B. Modelo, relaciones e integridad

### Claves y cardinalidad

Una clave primaria (PK) identifica una fila y no acepta duplicados ni valores nulos. Una clave foránea (FK) exige una referencia válida. La clave compuesta utiliza varios atributos: existencias tiene unicidad de lote_id y bodega_id, además de su PK técnica. Una declaración tiene varias líneas (1:N). Declaración y producto forman una relación N:M resuelta por detalles. UNIQUE(declaracion_id,linea) permite repetir un producto en líneas distintas con procedencias diferentes. Un vínculo 1:1 asignaría como máximo un registro a cada lado; no se agregó uno artificial para aumentar entidades.

### DER y notaciones

El diagrama entidad-relación permite revisar entidades, atributos y relaciones antes de discutir pantallas. En Chen, entidades, relaciones y atributos se representan con formas diferenciadas. La pata de gallo expresa multiplicidad con símbolos de uno, muchos y opcionalidad. El proyecto entrega una imagen física generada a partir de PostgreSQL, junto con fuente DOT y Mermaid editable. Cada FK obligatoria exige un padre; un padre puede no tener hijos todavía. Tipos, PK, FK, nulabilidad y restricciones completas también figuran en el diccionario. El diagrama no sustituye la ejecución del SQL.

### Normalización hasta 3FN

La primera forma normal evita grupos repetidos: no guardamos producto1, producto2 y producto3 en declaraciones. En segunda forma normal, los atributos dependen de la clave completa; la cantidad corresponde a una línea concreta, no únicamente a su producto. En tercera forma normal se separan dependencias entre atributos no clave: el nombre del país está en paises, no repetido como catálogo editable en cada lote. Estas reglas reducen anomalías de inserción, modificación y borrado [6]. producto_nombre, unidad, tarifa_aplicada y valor_unitario del detalle son instantáneas históricas deliberadas: describen lo declarado entonces y no deben cambiar al renombrar un catálogo.

### Restricciones del esquema

NOT NULL exige presencia; UNIQUE evita códigos repetidos; CHECK limita valores y combinaciones; DEFAULT proporciona un valor inicial cuando se omite. PK y FK implementan identificación e integridad referencial [4]. El esquema exige cantidad positiva en detalle, saldo no negativo en existencia y movimiento distinto de cero. Las unidades contadas deben ser enteras; kg y litro admiten tres decimales. Dinero usa numeric, no punto flotante. Las FK sin cascada impiden borrar referencias históricas accidentalmente. La capacidad en kg solo se verifica para mercancía medida en kg; no se suman dimensiones incompatibles.

### Ejemplo de trazabilidad

Un panel solar de China y otro de Estados Unidos pueden compartir producto_id, pero pertenecen a detalles y lotes diferentes. Para responder China retenida en bodega 2 se filtran origen, estado del lote, bodega y saldo positivo en reporting.inventario. Filtrar solamente el producto mezclaría procedencias y daría una conclusión incorrecta.


## C. SQL y consistencia operativa

### DDL y DML

DDL define estructuras: CREATE TABLE crea una tabla y sus restricciones. DML trabaja sobre filas: INSERT agrega, UPDATE modifica y DELETE elimina. SELECT consulta, mientras JOIN reúne filas mediante condiciones de relación. La aplicación no permite utilizar todos estos comandos de manera indiscriminada: una actualización directa de existencia rompería la correspondencia entre saldo e historia. El rol de aplicación puede gestionar catálogos, pero no editar movimientos ni saldos arbitrariamente. El script académico separa esquema, datos y ocho consultas; crear una base se realiza previamente, fuera de una transacción.

### Una consulta con significado

La consulta de mercancía retenida une existencia, lote, detalle, declaración, país, operador y bodega mediante una vista. WHERE selecciona RETENIDO y cantidad mayor que cero; ORDER BY mantiene orden estable por bodega y lote. Stock por producto utiliza GROUP BY por bodega y unidad. Importaciones de octubre usa fecha mayor o igual a 2026-10-01 y menor a 2026-11-01; de este modo no depende de la hora del último día. La consulta de máximos conserva empates. Los valores declarados se agregan por documento antes de cualquier relación con contenedores, evitando multiplicar importes por el número de contenedores.

### Recepción, traslado y salida

Recibir suma saldo y deja un movimiento; trasladar resta en origen y suma en destino; despachar resta y exige lote liberado. Una liberación cambia autorización operativa, no cantidad. La última inspección debe aprobar antes de liberar. Un resultado posterior RETENER devuelve el lote a retención. Estas reglas son académicas y explícitas. Una transacción garantiza que el traslado se confirme completo o se revierta completo. Los bloqueos serializan operaciones sobre un lote: consultar saldo y restar después, sin protección concurrente, permitiría sobregiros [5].

### Idempotencia y auditoría

Cada movimiento recibe un UUID ligado al usuario y contenido. Repetir la misma operación devuelve el resultado sin duplicar movimientos; reutilizar la clave con otros datos falla. La base registra motivo, usuario y fecha. Las existencias materializadas se concilian con la suma de movimientos por lote y bodega. El seed incluye salida parcial, lote agotado, traslado y un producto de dos orígenes. Las pruebas verifican cantidades e historial, no solamente códigos HTTP. Los errores controlados revierten cambios; las correcciones futuras deben implementarse como reversos explícitos, no como borrado de historia.

### Interfaz como evidencia

React Router DOM organiza navegación con rutas centralizadas y un layout con Outlet [7]. Las páginas separan catálogos, documentos, lotes y operaciones. Las pruebas de Chromium recorren declaración, recepción, inspección, liberación, traslado, salida y recarga. Un contador visual solo es confiable cuando coincide con SQL; una captura por sí sola no prueba persistencia ni permisos.


## D. Agente y contexto aduanero

### n8n y sus componentes

Un workflow de n8n conecta nodos para automatizar un proceso [8]. El trigger inicia la ejecución; cada nodo transforma datos, consulta un servicio o determina el siguiente paso. Una credencial conserva los datos de autenticación fuera del workflow exportado. Nuestro Chat Trigger y la entrada web protegida alimentan el mismo AI Agent. El agente conecta un modelo de lenguaje, memoria y ocho herramientas Postgres de consultas fijas. La documentación exige una herramienta conectada al agente [9]. El JSON fue importado en n8n 2.44.6; eso no demuestra una ejecución con el proveedor del modelo.

### Agente, chatbot y LLM

Un chatbot es una interfaz conversacional y puede funcionar con reglas o un modelo. Un LLM genera lenguaje; no es, por sí mismo, una base actualizada del inventario. El agente utiliza herramientas para recuperar hechos y elaborar una respuesta. En este proyecto el SQL no se deja al texto generado: cada herramienta tiene una consulta constante y parámetros separados, como documenta el nodo Postgres [10]. El prompt pide aclarar parámetros faltantes, distinguir vacío de error e informar límites. La memoria usa una clave de sesión del servidor; Simple Memory requiere un proceso local y no debe suponerse apta para queue mode [11].

### Lectura segura

Una instrucción de solo lectura en el prompt no protege la base. El rol aduana_reader solo consulta vistas reporting, tiene timeout y carece de permisos sobre tablas operativas y funciones que modifican inventario. Las herramientas no reciben sentencias SQL arbitrarias. La web envía mensajes al backend; el token de n8n y la credencial del modelo no están en el bundle. Observaciones de productos o inspecciones son datos, no instrucciones. El aislamiento efectivo de conversaciones y la resistencia a prompt injection deben probarse con el modelo conectado; siguen pendientes.

### Conceptos aduaneros

La aduana controla el ingreso, salida y régimen de mercancías conforme al ordenamiento aplicable. La declaración documenta una operación; el régimen identifica su tratamiento, como importación, exportación o tránsito. El agente aduanal representa al operador según los requisitos de cada jurisdicción. El Sistema Armonizado de la OMA ofrece una nomenclatura internacional para clasificar mercancías [12]. La partida identifica una categoría arancelaria; el arancel puede incluir tributos o tasas nacionales. No basta una descripción del producto para determinar una liquidación válida. En el seed los códigos ILUST y las tarifas son deliberadamente ilustrativos; no se afirma que sean partidas oficiales.

### Límites actuales

Falta credencial del modelo: no existen ocho respuestas reales verificadas del agente ni E2E completo del chat. La web muestra ese bloqueo. No se atribuye jurisdicción al proyecto por la zona horaria del equipo. La aplicación permite demostrar relaciones, consultas y trazabilidad, pero no constituye asesoría jurídica ni certificación de cumplimiento aduanero.


## Uso de IA y referencias

### Uso de IA documentado

Se utilizó Codex para inspeccionar el entorno, escribir código y SQL, preparar pruebas, consultar documentación oficial y redactar este borrador. Los prompts reales fueron el prompt maestro conservado en docs/prompt-maestro.md, la instrucción de usar react-router-dom y la solicitud de comenzar. La IA no reemplaza el documento original faltante ni la revisión del estudiante. Las cifras se verifican con SQL y pruebas; no se inventaron capturas del agente ni aprendizajes personales. El workflow requiere una credencial externa antes de ejecutar el modelo.

### Confirmación personal pendiente

El estudiante debe explicar con sus palabras: ¿por qué producto y lote son distintos?, ¿qué resuelve la tabla detalle?, ¿cómo se evita saldo negativo ante dos salidas simultáneas?, ¿por qué el rol lector no puede liberar un lote?, ¿qué dato conserva una instantánea histórica? También debe confirmar qué aprendió, qué partes revisó o modificó y qué dificultades encontró. Estas respuestas personales y los nombres académicos están pendientes; este documento no se las atribuye.

### Fuentes consultadas

Fuentes oficiales consultadas durante el desarrollo (fecha de referencia del trabajo: 23-10-2026). Paráfrasis y ejemplos propios; no se incluyen citas literales extensas.

### [1] MongoDB · NoSQL

https://www.mongodb.com/resources/basics/databases/nosql-explained

### [2] SQLite · Appropriate Uses

https://www.sqlite.org/whentouse.html

### [3] MySQL 8.4 · InnoDB

https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html

### [4] PostgreSQL · Constraints

https://www.postgresql.org/docs/current/ddl-constraints.html

### [5] PostgreSQL · Transaction Isolation

https://www.postgresql.org/docs/current/transaction-iso.html

### [6] Microsoft · Normalización

https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description

### [7] React Router · Routing

https://reactrouter.com/start/data/routing

### [8] n8n · Workflows

https://docs.n8n.io/workflows/

### [9] n8n · AI Agent

https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/

### [10] n8n · Postgres

https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/

### [11] n8n · Simple Memory

https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/

### [12] OMA · Sistema Armonizado

https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx

