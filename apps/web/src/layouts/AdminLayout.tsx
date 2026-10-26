import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLoaderData, useLocation, useNavigate, useNavigation } from 'react-router-dom';
import { SessionContext, type User } from '../app/session';
import { post } from '../lib/api';
const navigation = [
  ['/', 'Vista general', '◫'], ['/declaraciones', 'Declaraciones', '▤'], ['/lotes', 'Lotes e inventario', '▦'],
  ['/movimientos', 'Movimientos', '⇄'], ['/inspecciones', 'Inspecciones', '◎'], ['/productos', 'Productos', '◇'],
  ['/bodegas', 'Bodegas', '⌂'], ['/operadores', 'Operadores', '▣'], ['/agentes', 'Agentes aduanales', '◉'],
  ['/partidas', 'Partidas', '≡'], ['/paises', 'Países', '⊕'], ['/funcionarios', 'Funcionarios', '♙'],
  ['/chat', 'Asistente de consulta', '✧'], ['/ayuda', 'Ayuda', '?'],
];
export function AdminLayout() {
  const user = useLoaderData() as User; const navigate = useNavigate(); const location = useLocation(); const transition = useNavigation();
  const [open, setOpen] = useState(false); const main = useRef<HTMLElement>(null);
  useEffect(() => { main.current?.focus({ preventScroll: true }); }, [location.pathname]);
  return <SessionContext.Provider value={user}><a className="skip-link" href="#contenido">Saltar al contenido</a><div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}><Link className="brand" to="/" onClick={() => setOpen(false)}><span className="brand-mark">A</span><span>ADUANA<small>CONTROL DE INVENTARIO</small></span></Link><p className="nav-label">ESPACIO DE TRABAJO</p><nav aria-label="Navegación principal">{navigation.map(([to, text, icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><span aria-hidden="true">{icon}</span>{text}</NavLink>)}</nav><div className="sidebar-foot"><span className="status-dot" /> Entorno local <small>Proyecto académico · 2026</small></div></aside>
    <div className="workspace"><header className="topbar"><button className="mobile-toggle button secondary" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Abrir navegación">☰</button><span className="breadcrumb">Operaciones aduaneras <span>/</span> {navigation.find(([p]) => p === location.pathname)?.[1] || 'Detalle'}</span><div className="account"><span className="avatar">{user.nombre[0].toUpperCase()}</span><span>{user.nombre}<small>{user.rol}</small></span><button className="text-button" onClick={async () => { await post('/auth/logout', {}); navigate('/login'); }}>Salir</button></div></header>
    <div className="demo-bar"><span>DEMOSTRACIÓN ACADÉMICA</span> Empresas y personas ficticias · Moneda USD · Sin validez tributaria</div>
    <main id="contenido" ref={main} tabIndex={-1}>{transition.state !== 'idle' && <div className="route-progress" role="status">Cargando…</div>}<Outlet /></main><footer>Inventario aduanero <span>Trazabilidad por lote y origen · America/Costa_Rica</span></footer></div>
  </div></SessionContext.Provider>;
}
