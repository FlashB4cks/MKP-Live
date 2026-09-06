import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage({ onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [localError, setLocalError] = useState(null);

  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== password2) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    await register(username.trim(), email.trim(), password, password2);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1e1f22] p-4">
      <div className="w-full max-w-[480px] bg-discord-chat rounded-lg p-8 shadow-2xl border border-black/20">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-discord-blurple flex items-center justify-center text-white mb-4 shadow-lg">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">
            Crear una cuenta en MKP Live
          </h1>
          <p className="text-sm text-discord-text-muted mt-1 text-center">
            Únete a nuestra comunidad en tiempo real
          </p>
        </div>

        {displayError && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Correo electrónico *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Nombre de usuario *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Contraseña *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Repetir contraseña *
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-discord-blurple py-2.5 text-sm font-semibold text-white hover:bg-discord-blurple-hover transition duration-200 disabled:opacity-50 shadow-md mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Continuar'}
          </button>

          <div className="text-sm text-discord-text-muted text-center pt-2">
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-discord-blurple hover:underline font-medium"
            >
              Iniciar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
