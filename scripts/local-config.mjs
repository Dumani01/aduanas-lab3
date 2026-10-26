import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) throw new Error('.env ya existe: no se sobrescribe');
mkdirSync('.local', {recursive:true});
const admin=randomBytes(24).toString('hex'),app=randomBytes(24).toString('hex'),reader=randomBytes(24).toString('hex');
writeFileSync('.local/admin-password.txt',admin);
writeFileSync('.local/role-passwords.json',JSON.stringify({app,reader}));
writeFileSync('.env',`DATABASE_URL=postgresql://aduana_app:${app}@127.0.0.1:55432/aduana\nDATABASE_ADMIN_URL=postgresql://postgres:${admin}@127.0.0.1:55432/aduana\nDATABASE_READER_URL=postgresql://aduana_reader:${reader}@127.0.0.1:55432/aduana\nTEST_DATABASE_ADMIN_URL=postgresql://postgres:${admin}@127.0.0.1:55432/aduana_test\nSESSION_SECRET=${randomBytes(40).toString('hex')}\nPORT=4310\nN8N_CHAT_URL=\nN8N_CHAT_TOKEN=\n`);
console.log('Configuración local generada; secretos excluidos de Git.');
