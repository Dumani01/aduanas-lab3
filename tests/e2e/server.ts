import 'dotenv/config';
for (const key of ['DATABASE_URL', 'DATABASE_READER_URL']) {
  const url = new URL(process.env[key]!); url.pathname = '/aduana_test'; process.env[key] = url.toString();
}
process.env.PORT = '3002'; process.env.APP_ORIGINS = 'http://127.0.0.1:3002';
await import('../../apps/api/src/server.js');
