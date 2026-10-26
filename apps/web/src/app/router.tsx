import { createBrowserRouter, redirect } from 'react-router-dom';
import { api, ApiError, setCsrf, type PageData, type References } from '../lib/api';
import type { User } from './session';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { Loading } from '../components/Feedback';
import { RouteError, NotFound } from './RouteFeedback';

async function sessionLoader() {
  try { const data = await api<{ user: User; csrf: string }>('/auth/me'); setCsrf(data.csrf); return data.user; }
  catch (err) { if (err instanceof ApiError && err.status === 401) throw redirect('/login'); throw err; }
}
async function writeLoader() { const user = await sessionLoader(); if (user.rol === 'consulta') throw new Response('Su rol solo permite consultas', { status: 403 }); }
const catalogRoutes = ['productos', 'partidas', 'operadores', 'agentes', 'bodegas', 'funcionarios', 'paises'].map(name => ({
  path: name, loader: async ({ request }: { request: Request }) => {
    const [data, refs] = await Promise.all([api<PageData>(`/catalogos/${name}${new URL(request.url).search}`), api<References>('/referencias')]);
    return { name, data, refs };
  }, lazy: async () => ({ Component: (await import('../features/catalogs/pages/CatalogPage')).CatalogPage }),
}));
export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage, errorElement: <RouteError /> },
  { path: '/', Component: AdminLayout, loader: sessionLoader, HydrateFallback: Loading, errorElement: <RouteError />, children: [
    { index: true, loader: () => api('/dashboard'), lazy: async () => ({ Component: (await import('../features/dashboard/pages/DashboardPage')).DashboardPage }) },
    ...catalogRoutes,
    { path: 'declaraciones', loader: ({ request }) => api(`/declaraciones${new URL(request.url).search}`), lazy: async () => ({ Component: (await import('../features/declarations/pages/DeclarationsPage')).DeclarationsPage }) },
    { path: 'declaraciones/nueva', loader: async () => { await writeLoader(); return api('/referencias'); }, lazy: async () => ({ Component: (await import('../features/declarations/pages/NewDeclarationPage')).NewDeclarationPage }) },
    { path: 'declaraciones/:declaracionId', loader: ({ params }) => api(`/declaraciones/${params.declaracionId}`), lazy: async () => ({ Component: (await import('../features/declarations/pages/DeclarationsPage')).DeclarationDetailPage }) },
    { path: 'lotes', loader: async ({ request }) => { const [data, refs] = await Promise.all([api(`/lotes${new URL(request.url).search}`), api('/referencias')]); return { data, refs }; }, lazy: async () => ({ Component: (await import('../features/inventory/pages/LotsPage')).LotsPage }) },
    { path: 'lotes/:loteId', loader: ({ params }) => api(`/lotes/${params.loteId}`), lazy: async () => ({ Component: (await import('../features/inventory/pages/LotDetailPage')).LotDetailPage }) },
    ...['movimientos', 'inspecciones'].map(type => ({ path: type, loader: async ({ request }: { request: Request }) => ({ type, data: await api(`/${type}${new URL(request.url).search}`) }), lazy: async () => ({ Component: (await import('../features/operations/pages/OperationsPage')).OperationsPage }) })),
    ...[['movimientos/nuevo', false], ['inspecciones/nueva', true]].map(([path, inspection]) => ({ path: String(path), loader: async ({ request }: { request: Request }) => {
      await writeLoader(); const lotId = new URL(request.url).searchParams.get('lote');
      const [refs, lots] = await Promise.all([api('/referencias'), api<PageData>('/lotes')]);
      if (lotId && !lots.rows.some(r => String(r.id) === lotId)) { const lot = await api<Record<string, unknown>>(`/lotes/${encodeURIComponent(lotId)}`); lots.rows.push({ ...lot, id: lotId } as PageData['rows'][number]); }
      return { refs, lots, inspection };
    }, lazy: async () => ({ Component: (await import('../features/operations/pages/NewOperationPage')).NewOperationPage }) })),
    { path: 'chat', loader: () => api('/chat/config'), lazy: async () => ({ Component: (await import('../features/chat/pages/ChatPage')).ChatPage }) },
    { path: 'ayuda', lazy: async () => ({ Component: (await import('../features/help/pages/HelpPage')).HelpPage }) },
    { path: '*', Component: NotFound },
  ] },
]);
