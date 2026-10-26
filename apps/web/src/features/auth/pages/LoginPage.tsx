import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../../../lib/api';
import { ErrorBox } from '../../../components/Feedback';

const demoUser = 'admin';
const demoPassword = 'Aduana2026!';

export function LoginPage() {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return <div className="login-shell">
    <div className="login-intro">
      <span className="eyebrow">ADUANA / INVENTARIO</span>
      <h1>Cada lote.<br />Un origen.<br />Toda la historia.</h1>
      <p>Control de mercancías, operaciones y trazabilidad en un solo espacio de trabajo.</p>
      <span className="outline-tag">Demostración académica · Datos ficticios</span>
    </div>
    <section className="login-card">
      <span className="brand-mark">A</span>
      <h2>Bienvenido a Aduana</h2>
      <p className="muted">Inicia sesión para acceder al inventario local.</p>
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError(null);
        const data = new FormData(e.currentTarget);
        try { await post('/auth/login', Object.fromEntries(data)); navigate('/'); }
        catch (err) { setError(err); }
        finally { setBusy(false); }
      }}>
        <label>Usuario<input name="nombre" autoComplete="username" defaultValue={demoUser} required autoFocus /></label>
        <label>Contraseña<input name="password" type="password" autoComplete="current-password" defaultValue={demoPassword} required /></label>
        {error !== null && <ErrorBox error={error} />}
        <button className="button" disabled={busy}>{busy ? 'Ingresando…' : 'Entrar al sistema →'}</button>
      </form>
      <aside className="demo-credentials" aria-label="Credenciales fijas de demostración">
        <strong>Acceso fijo de demostración local</strong>
        <dl>
          <div><dt>Usuario</dt><dd><code>{demoUser}</code></dd></div>
          <div><dt>Contraseña</dt><dd><code>{demoPassword}</code></dd></div>
        </dl>
        <p>Los campos ya están completados. Presiona «Entrar al sistema».</p>
      </aside>
    </section>
  </div>;
}
