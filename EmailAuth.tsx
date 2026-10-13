import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { backend } from './backend';
import './auth.css';

type Mode = 'signin' | 'signup' | 'forgot';

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Falta confirmar tu correo. Revisa tu bandeja de entrada.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  if (m.includes('password should be')) return 'La contraseña debe tener al menos 8 caracteres.';
  return message;
}

export default function EmailAuth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const level = strength(password);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setDone('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!backend) return;
    setError('');
    setDone('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const { data, error: err } = await backend.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: location.origin, data: { full_name: name.trim() } }
        });
        if (err) throw err;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Ya existe una cuenta con este correo. Ingresa con tu contraseña o usa GitHub.');
        }
        if (!data.session) setDone('¡Casi listo! Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta.');
      } else if (mode === 'signin') {
        const { error: err } = await backend.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { error: err } = await backend.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
        if (err) throw err;
        setDone('Si el correo existe, recibirás un enlace para crear una nueva contraseña.');
      }
    } catch (ex) {
      setError(friendly(ex instanceof Error ? ex.message : String((ex as { message?: string }).message || ex)));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'signup' ? 'Crea tu cuenta' : mode === 'forgot' ? 'Recupera tu acceso' : 'Ingresa con tu correo';

  return (
    <section className="email-auth" aria-label="Acceso con correo electrónico">
      <div className="email-auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode !== 'signup'} className={mode !== 'signup' ? 'on' : ''} onClick={() => switchMode('signin')}>Ingresar</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Crear cuenta</button>
      </div>
      <h3>{title}</h3>
      {done ? (
        <div className="email-auth-done" role="status"><CheckCircle2 size={22} /><p>{done}</p></div>
      ) : (
        <form onSubmit={submit} noValidate={false}>
          {mode === 'signup' && (
            <label className="ea-field"><span>Nombre</span>
              <div><User size={17} /><input value={name} onChange={e => setName(e.target.value)} required maxLength={120} autoComplete="name" placeholder="Tu nombre completo" /></div>
            </label>
          )}
          <label className="ea-field"><span>Correo</span>
            <div><Mail size={17} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="tu@correo.com" /></div>
          </label>
          {mode !== 'forgot' && (
            <label className="ea-field"><span>Contraseña</span>
              <div>
                <Lock size={17} />
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : 'Tu contraseña'} />
                <button type="button" className="ea-eye" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>
          )}
          {mode === 'signup' && password && (
            <div className="ea-strength" aria-live="polite">
              <div className="ea-bars">{[0, 1, 2, 3].map(i => <i key={i} className={i < level ? `on l${level}` : ''} />)}</div>
              <small>{strengthLabels[level]}</small>
            </div>
          )}
          {error && <p className="ea-error" role="alert">{error}</p>}
          <button className="primary ea-submit" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Ingresar'} <ArrowRight size={16} />
          </button>
        </form>
      )}
      <div className="ea-links">
        {mode === 'signin' && <button type="button" onClick={() => switchMode('forgot')}>¿Olvidaste tu contraseña?</button>}
        {mode === 'forgot' && <button type="button" onClick={() => switchMode('signin')}>Volver a ingresar</button>}
      </div>
    </section>
  );
}

export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const level = strength(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!backend) return;
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await backend.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(friendly(err.message));
    else onDone();
  }

  return (
    <section className="panel email-auth email-auth-reset">
      <KeyRound size={26} />
      <h2>Crea tu nueva contraseña</h2>
      <p>Elige una contraseña segura para volver a entrar a nextONE.</p>
      <form onSubmit={submit}>
        <label className="ea-field"><span>Nueva contraseña</span>
          <div><Lock size={17} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /></div>
        </label>
        {password && (
          <div className="ea-strength" aria-live="polite">
            <div className="ea-bars">{[0, 1, 2, 3].map(i => <i key={i} className={i < level ? `on l${level}` : ''} />)}</div>
            <small>{strengthLabels[level]}</small>
          </div>
        )}
        {error && <p className="ea-error" role="alert">{error}</p>}
        <button className="primary ea-submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'} <ArrowRight size={16} /></button>
      </form>
    </section>
  );
}
