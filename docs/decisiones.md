# Decisiones

- React + TypeScript + Vite con react-router-dom, solicitado por el usuario. Rutas centralizadas, layout compartido y módulos de negocio.
- API Express local separada: una única API y una base PostgreSQL. No servicios en nube ni microservicios.
- PostgreSQL nativo para transacciones, bloqueos, tipos numéricos exactos y roles lectores reales. SQLite reduce instalación pero complica roles y conexión con n8n. MySQL es viable, pero PostgreSQL permite demostrar todos estos requisitos con un único gestor.
- Existencias materializadas; una función SQL es la única ruta autorizada para movimientos. Bloqueo del lote serializa operaciones del mismo lote y evita sobregiros.
- USD como moneda académica; unidades agrupadas por separado. Datos comerciales ficticios. Partidas ilustrativas, sin cálculo legal de impuestos.
- Autenticación de demostración local con scrypt de Node, sesiones en PostgreSQL, cookies HttpOnly y SameSite, y control de origen en solicitudes de escritura.
