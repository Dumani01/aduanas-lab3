import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const accounts=await readFile('.local/cuentas-demo.txt','utf8');
const password=accounts.split('\n').find(l=>l.startsWith('admin: '))?.slice(7);
if(!password)throw new Error('Falta cuenta local de demostración');
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/login');await page.getByLabel('Usuario',{exact:true}).fill('admin');await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar al sistema'}).click();
 await expect(page.getByRole('heading',{name:'Vista general',exact:true})).toBeVisible();
 const dashboard=await(await page.request.get('http://127.0.0.1:5173/api/dashboard')).json();expect(dashboard.declaraciones).toBe('15');expect(dashboard.retenidos).toBe('10');
 await page.screenshot({path:'evidencias/capturas/demo-dashboard-1440.png',fullPage:true});
 await page.setViewportSize({width:360,height:1000});await page.goto('http://127.0.0.1:5173/');await expect(page.getByRole('heading',{name:'Vista general',exact:true})).toBeVisible();await page.screenshot({path:'evidencias/capturas/demo-dashboard-360.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5173/lotes?q=China&estado=RETENIDO&bodega=2');
 await expect(page.getByRole('link',{name:'LOT-2026-0001',exact:true})).toBeVisible();await page.screenshot({path:'evidencias/capturas/demo-china-bodega2.png',fullPage:true});
 await page.getByRole('link',{name:'LOT-2026-0001',exact:true}).click();await expect(page.getByRole('heading',{name:'LOT-2026-0001',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
 await writeFile('evidencias/smoke-desarrollo.json',JSON.stringify({web:'http://127.0.0.1:5173',api:'http://127.0.0.1:4310',database:'aduana',login:'aprobado',dashboard:{declaraciones:dashboard.declaraciones,retenidos:dashboard.retenidos},filtroChinaBodega2:'aprobado',erroresJavaScript:errors,scope:'Demostración real de desarrollo, independiente de E2E aduana_test'},null,2));
 console.log('Acceso local real, dashboard, filtro y lote aprobados a través de Vite→API4310→PostgreSQL.');
}finally{await browser.close()}
