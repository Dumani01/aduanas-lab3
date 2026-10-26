import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from './app.js';
const app = createApp();
const dist = path.resolve('apps/web/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => {
    if (path.extname(req.path)) return res.status(404).send('Recurso inexistente');
    res.sendFile(path.join(dist, 'index.html'));
  });
}
app.listen(Number(process.env.PORT || 4310), '127.0.0.1', (error?: Error) => {
  if (error) { console.error('No se pudo iniciar la API: compruebe el puerto configurado.'); process.exit(1); }
  console.log('API local: http://127.0.0.1:' + (process.env.PORT || 4310));
});
