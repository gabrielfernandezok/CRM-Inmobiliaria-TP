import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';

const initialForm = {
  nombreUsuario: '',
  mail: '',
  contrasena: '',
  apellido: '',
  nombres: '',
  dni: '',
  fechaNac: '',
  sexo: '',
};

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...form, dni: Number(form.dni) });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <p className="eyebrow">CRM Inmobiliaria</p>
        <h1>Crear cuenta</h1>
        <p className="muted">El registro crea un usuario con perfil Agente.</p>
        <ApiErrorMessage error={error} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Nombre de usuario</span>
            <input name="nombreUsuario" autoComplete="username" minLength="3" required value={form.nombreUsuario} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Correo electrónico</span>
            <input name="mail" type="email" autoComplete="email" required value={form.mail} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Contraseña</span>
            <input name="contrasena" type="password" autoComplete="new-password" minLength="8" required value={form.contrasena} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>DNI</span>
            <input name="dni" type="number" min="1" step="1" required value={form.dni} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Apellido</span>
            <input name="apellido" autoComplete="family-name" required value={form.apellido} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Nombres</span>
            <input name="nombres" autoComplete="given-name" required value={form.nombres} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Fecha de nacimiento</span>
            <input name="fechaNac" type="date" required value={form.fechaNac} onChange={updateField} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Sexo</span>
            <select name="sexo" required value={form.sexo} onChange={updateField}>
              <option value="">Seleccionar</option>
              <option value="F">F</option>
              <option value="M">M</option>
              <option value="X">X</option>
            </select>
          </label>
          <div className="col-12">
            <button className="button button-primary button-full" disabled={submitting}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
        <p className="auth-switch">¿Ya tenés cuenta? <Link to="/login">Ingresar</Link></p>
      </section>
    </main>
  );
}
